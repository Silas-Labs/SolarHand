"""Performance analysis endpoints — the Digital Twin Lite over the API.

Compares a meter reading against physics-modelled expected yield (no on-site
sensor required) and classifies any shortfall. The weather source is injected
via :func:`app.deps.get_weather_provider`, so the engine is deterministic under
test while production talks to Open-Meteo.
"""

from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app import audit
from app.analytics import engine as eng
from app.analytics.faults import PERSIST_FAULT_MAP
from app.analytics.forecast import DEFAULT_HORIZON_DAYS, forecast_health
from app.analytics.weather import WeatherProvider
from app.deps import get_current_user, get_db, get_weather_provider
from app.models import Asset, FaultReport, Reading, User
from app.schemas import AnalysisResponse, AnalyzeRequest, ForecastResponse

router = APIRouter(prefix="/analytics", tags=["analytics"])

# Analytics severity -> persisted FaultReport (category, FaultSeverity). Shared
# with the telemetry rollup (single source of truth in app.analytics.faults) so
# an energy-based fault is identical whether a manual reading or a telemetry
# roll-up produced it. Only actionable bands map; healthy/anomalous never do.
_FAULT_MAP = PERSIST_FAULT_MAP


def _assert_asset_in_company(db: Session, asset_id: str, company_id: str) -> Asset:
    asset = db.get(Asset, asset_id)
    if asset is None or asset.company_id != company_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Asset not found")
    return asset


def _window(reading_date: date, period_days: int) -> tuple[datetime, datetime]:
    """UTC datetime window covering ``period_days`` ending on ``reading_date``."""
    start = datetime.combine(
        reading_date - timedelta(days=period_days - 1), time(0, 0),
        tzinfo=timezone.utc)
    end = datetime.combine(reading_date, time(23, 0), tzinfo=timezone.utc)
    return start, end


def _spec(asset: Asset) -> eng.SystemSpec:
    return eng.SystemSpec(
        latitude=asset.latitude,
        longitude=asset.longitude,
        tilt_deg=asset.tilt_deg,
        surface_azimuth_deg=asset.azimuth_deg,
        system_kwp=asset.system_kwp,
    )


def _run(asset: Asset, actual_kwh: float, reading_date: date, period_days: int,
         provider: WeatherProvider) -> eng.AnalysisResult:
    start, end = _window(reading_date, period_days)
    try:
        return eng.analyse(_spec(asset), start, end, actual_kwh, provider)
    except (OSError, ValueError) as exc:  # network / parse failure at the edge
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            f"Weather data unavailable: {exc}",
        )


def _persist_fault(db: Session, asset: Asset, result: eng.AnalysisResult,
                   actor: User, reading_id: str | None = None) -> str | None:
    mapping = _FAULT_MAP.get(result.severity)
    if mapping is None:
        return None
    category, severity = mapping
    description = result.summary
    if result.likely_causes:
        description += " Likely causes: " + "; ".join(result.likely_causes)
    fault = FaultReport(
        asset_id=asset.id,
        reading_id=reading_id,
        category=category,
        severity=severity,
        source="system",
        description=description,
    )
    db.add(fault)
    db.flush()
    audit.record_event(
        db, entity_type="fault_report", entity_id=fault.id, action="detect",
        actor_id=actor.id,
        payload={
            "asset_id": asset.id,
            "severity": result.severity,
            "health_ratio": result.health_ratio,
        },
    )
    db.commit()
    db.refresh(fault)
    return fault.id


def _to_response(result: eng.AnalysisResult, asset_id: str,
                 reading_id: str | None = None,
                 fault_id: str | None = None) -> AnalysisResponse:
    return AnalysisResponse(
        asset_id=asset_id,
        reading_id=reading_id,
        severity=result.severity,
        summary=result.summary,
        health_ratio=result.health_ratio,
        performance_ratio_iec=result.performance_ratio_iec,
        actual_kwh=result.actual_kwh,
        expected_ac_kwh=result.expected_ac_kwh,
        expected_dc_ideal_kwh=result.expected_dc_ideal_kwh,
        reference_yield_hours=result.reference_yield_hours,
        poa_insolation_kwh_m2=result.poa_insolation_kwh_m2,
        sample_count=result.sample_count,
        window_start=result.window_start,
        window_end=result.window_end,
        likely_causes=result.likely_causes,
        fault_id=fault_id,
    )


@router.post("/assets/{asset_id}", response_model=AnalysisResponse,
             summary="Analyse an ad-hoc reading against expected yield")
def analyze_asset(
    asset_id: str,
    payload: AnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    provider: WeatherProvider = Depends(get_weather_provider),
) -> AnalysisResponse:
    asset = _assert_asset_in_company(db, asset_id, current_user.company_id)
    result = _run(asset, payload.energy_kwh, payload.reading_date,
                  payload.period_days, provider)
    fault_id = None
    if payload.persist_fault and result.is_fault:
        fault_id = _persist_fault(db, asset, result, current_user)
    return _to_response(result, asset.id, fault_id=fault_id)


@router.post("/readings/{reading_id}", response_model=AnalysisResponse,
             summary="Analyse a stored reading against expected yield")
def analyze_reading(
    reading_id: str,
    persist_fault: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    provider: WeatherProvider = Depends(get_weather_provider),
) -> AnalysisResponse:
    reading = db.get(Reading, reading_id)
    if reading is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found")
    asset = _assert_asset_in_company(db, reading.asset_id, current_user.company_id)
    result = _run(asset, reading.energy_kwh, reading.reading_date,
                  reading.period_days, provider)
    # Cache the analysis on the reading so the trend forecaster has a health-ratio
    # time series without re-running physics (see Reading.health_ratio/pr_iec).
    reading.health_ratio = result.health_ratio
    reading.pr_iec = result.performance_ratio_iec
    fault_id = None
    if persist_fault and result.is_fault:
        fault_id = _persist_fault(db, asset, result, current_user,
                                  reading_id=reading.id)
    else:
        db.commit()
    return _to_response(result, asset.id, reading_id=reading.id, fault_id=fault_id)


@router.get("/assets/{asset_id}/forecast", response_model=ForecastResponse,
            summary="Project a connected asset's health trend to the threshold")
def forecast_asset(
    asset_id: str,
    horizon_days: int = Query(default=DEFAULT_HORIZON_DAYS, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ForecastResponse:
    """Least-squares projection over an asset's cached health-ratio history.

    Uses every scored reading (manual or telemetry) that has a cached
    ``health_ratio``. Most useful for connected sites, whose daily telemetry
    rollups produce a dense series; a healthy site trending toward the attention
    threshold surfaces as an ``early_warning`` before it becomes lost generation.
    """
    asset = _assert_asset_in_company(db, asset_id, current_user.company_id)
    rows = (
        db.query(Reading)
        .filter(Reading.asset_id == asset.id, Reading.health_ratio.isnot(None))
        .order_by(Reading.reading_date.asc())
        .all()
    )
    points = [(r.reading_date, r.health_ratio) for r in rows]
    fc = forecast_health(points, horizon_days=horizon_days)
    return ForecastResponse(
        asset_id=asset.id,
        points=fc.points,
        current_health_ratio=fc.current_health_ratio,
        slope_per_day=fc.slope_per_day,
        threshold=fc.threshold,
        projected_cross_date=fc.projected_cross_date,
        days_to_threshold=fc.days_to_threshold,
        early_warning=fc.early_warning,
        summary=fc.summary,
    )
