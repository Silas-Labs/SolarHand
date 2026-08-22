"""Telemetry endpoints — the connected-site ingestion surface.

Three routes, three audiences:

* ``POST /telemetry`` — machine-to-machine. A field gateway (or the labeled
  simulator) posts a batch of samples, authenticated by the shared
  ``X-Gateway-Key`` header rather than a human JWT. The payload names an adapter
  ``format``; the adapter normalizes each raw sample to the canonical shape, the
  device is resolved to its asset by ``device_id``, samples are de-duplicated on
  ``(asset_id, ts)`` and stored, and the newest sample is run through the
  rule-based diagnosis so a live fault (with probable cause + recommended parts)
  is on the work order the moment it happens.
* ``GET /telemetry/assets/{id}/samples`` — human/JWT, company-scoped. Recent raw
  samples for the live panel.
* ``POST /telemetry/rollup`` — admin/JWT. Aggregate stored samples into daily
  ``Reading(source="telemetry")`` rows and score them through the same Digital
  Twin Lite pipeline the manual path uses.

Nothing here invents a second analytics path: telemetry is just another *origin*
of a reading. The unique value it adds is the diagnostic channels — the "why".
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app import audit
from app.analytics.weather import WeatherProvider
from app.deps import (
    get_current_user,
    get_db,
    get_weather_provider,
    require_admin,
    require_gateway_key,
)
from app.models import Asset, FaultReport, TelemetrySample, User
from app.schemas import (
    RollupResponse,
    RollupResultItem,
    TelemetryBatchIn,
    TelemetryIngestResponse,
    TelemetrySampleIn,
    TelemetrySampleRead,
)
from app.telemetry import rollup as rollup_mod
from app.telemetry.adapters import AdapterError, available_formats, get_adapter
from app.telemetry.diagnosis import diagnose_sample
from app.timeutils import ensure_aware, to_iso

router = APIRouter(prefix="/telemetry", tags=["telemetry"])


def _assert_asset_in_company(db: Session, asset_id: str, company_id: str) -> Asset:
    asset = db.get(Asset, asset_id)
    if asset is None or asset.company_id != company_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Asset not found")
    return asset


def _resolve_device_asset(db: Session, batch: TelemetryBatchIn) -> Asset:
    """Map a telemetry batch to its asset via ``device_id`` (and optional id)."""
    if batch.asset_id:
        asset = db.get(Asset, batch.asset_id)
        if asset is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Asset not found")
        if asset.device_id != batch.device_id:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "device_id does not match the supplied asset_id",
            )
        return asset
    asset = (
        db.query(Asset).filter(Asset.device_id == batch.device_id).first()
    )
    if asset is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            f"No asset registered for device_id '{batch.device_id}'",
        )
    return asset


@router.post("", response_model=TelemetryIngestResponse,
             status_code=status.HTTP_201_CREATED,
             summary="Ingest a batch of device telemetry (gateway-key auth)")
def ingest_telemetry(
    batch: TelemetryBatchIn,
    db: Session = Depends(get_db),
    _auth: None = Depends(require_gateway_key),
) -> TelemetryIngestResponse:
    asset = _resolve_device_asset(db, batch)

    # 1) Normalize the device's dialect to canonical samples at the edge.
    try:
        adapter = get_adapter(batch.format)
    except AdapterError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc))
    try:
        normalized = adapter.normalize(batch.samples)
    except NotImplementedError as exc:
        raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, str(exc))
    except AdapterError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc))

    # 2) Validate each canonical sample against the strict schema.
    validated: list[TelemetrySampleIn] = []
    for i, raw in enumerate(normalized):
        try:
            validated.append(TelemetrySampleIn.model_validate(raw))
        except ValidationError as exc:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                f"sample {i} failed validation: {exc.errors()[0].get('msg', 'invalid')}",
            )

    # 3) De-duplicate on (asset_id, ts): a gateway retrying over flaky signal
    #    must not double-count. Compare in canonical ISO form.
    existing_ts = {
        to_iso(row.ts)
        for row in db.query(TelemetrySample.ts)
        .filter(TelemetrySample.asset_id == asset.id)
        .all()
    }
    accepted_rows: list[TelemetrySample] = []
    duplicates = 0
    seen: set[str] = set()
    for sample in validated:
        ts = ensure_aware(sample.ts)
        key = to_iso(ts)
        if key in existing_ts or key in seen:
            duplicates += 1
            continue
        seen.add(key)
        data = sample.model_dump(exclude={"ts"})
        row = TelemetrySample(asset_id=asset.id, device_id=batch.device_id,
                              ts=ts, **data)
        db.add(row)
        accepted_rows.append(row)

    if accepted_rows:
        db.flush()

    # 4) Live diagnosis on the newest accepted sample — the "why" rides straight
    #    onto a work order. Idempotent: don't stack duplicate open faults of the
    #    same category for the same asset.
    diagnosis_fault_id: str | None = None
    if accepted_rows:
        newest = max(accepted_rows, key=lambda r: r.ts)
        diag = diagnose_sample(newest)
        if diag is not None:
            open_fault = (
                db.query(FaultReport)
                .filter(
                    FaultReport.asset_id == asset.id,
                    FaultReport.source == "telemetry",
                    FaultReport.category == diag.category,
                    FaultReport.resolved.is_(False),
                )
                .first()
            )
            if open_fault is not None:
                diagnosis_fault_id = open_fault.id
            else:
                fault = FaultReport(
                    asset_id=asset.id,
                    category=diag.category,
                    severity=diag.severity,
                    source="telemetry",
                    description=diag.summary,
                    detail=diag.as_detail(),
                )
                db.add(fault)
                db.flush()
                audit.record_event(
                    db, entity_type="fault_report", entity_id=fault.id,
                    action="detect", actor_id=None,
                    payload={
                        "asset_id": asset.id,
                        "category": diag.category,
                        "severity": diag.severity,
                        "origin": "telemetry_ingest",
                        "device_id": batch.device_id,
                    },
                )
                diagnosis_fault_id = fault.id

    audit.record_event(
        db, entity_type="asset", entity_id=asset.id, action="telemetry_ingest",
        actor_id=None,
        payload={
            "device_id": batch.device_id,
            "format": batch.format,
            "accepted": len(accepted_rows),
            "duplicates": duplicates,
        },
    )
    db.commit()

    return TelemetryIngestResponse(
        asset_id=asset.id,
        device_id=batch.device_id,
        accepted=len(accepted_rows),
        duplicates=duplicates,
        diagnosis_fault_id=diagnosis_fault_id,
    )


@router.get("/formats", summary="List supported telemetry adapter formats")
def list_formats() -> dict:
    """The adapter formats this build understands (canonical + documented stubs)."""
    return {"formats": available_formats()}


@router.get("/assets/{asset_id}/samples", response_model=list[TelemetrySampleRead],
            summary="Recent raw telemetry samples for an asset")
def list_samples(
    asset_id: str,
    limit: int = Query(default=200, ge=1, le=2000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[TelemetrySample]:
    asset = _assert_asset_in_company(db, asset_id, current_user.company_id)
    return (
        db.query(TelemetrySample)
        .filter(TelemetrySample.asset_id == asset.id)
        .order_by(TelemetrySample.ts.desc())
        .limit(limit)
        .all()
    )


@router.post("/rollup", response_model=RollupResponse,
             summary="Roll up connected-asset telemetry into scored daily readings")
def run_rollup(
    asset_id: str | None = Query(default=None),
    include_today: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
    provider: WeatherProvider = Depends(get_weather_provider),
) -> RollupResponse:
    """Aggregate stored samples into ``Reading(source="telemetry")`` rows.

    Scoped to the caller's company. Without ``asset_id`` it processes every
    connected asset; with it, just that one. The current UTC day is skipped
    unless ``include_today`` is set (a partial day under-counts energy).
    """
    if asset_id:
        asset = _assert_asset_in_company(db, asset_id, current_user.company_id)
        assets = [asset]
    else:
        assets = (
            db.query(Asset)
            .filter(
                Asset.company_id == current_user.company_id,
                Asset.telemetry_enabled.is_(True),
            )
            .all()
        )

    all_items: list[RollupResultItem] = []
    for asset in assets:
        items = rollup_mod.roll_up_asset(
            db, asset, provider,
            actor_id=current_user.id, include_today=include_today,
        )
        all_items.extend(RollupResultItem(**item) for item in items)

    return RollupResponse(processed_assets=len(assets), readings=all_items)
