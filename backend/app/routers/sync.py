"""Offline sync: batch push (upsert, last-write-wins) and delta pull.

The technician PWA queues creates/edits while offline and pushes them here on
reconnect. Each record carries a client-generated UUID id and a
``client_updated_at`` stamp; :func:`app.sync_logic.decide_sync_action` decides
create/update/skip per record. Every item runs inside its own SAVEPOINT so one
bad record can't abort the whole batch.
"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import audit
from app.deps import get_current_user, get_db
from app.models import Asset, FaultReport, Job, Reading, User
from app.schemas import (
    SyncItemResult,
    SyncPullResponse,
    SyncPushRequest,
    SyncPushResponse,
)
from app.sync_logic import CREATE, SKIP, UPDATE, decide_sync_action
from app.timeutils import utcnow

router = APIRouter(prefix="/sync", tags=["sync"])


def _asset_in_company(db: Session, asset_id: str | None, company_id: str) -> bool:
    if not asset_id:
        return False
    asset = db.get(Asset, asset_id)
    return asset is not None and asset.company_id == company_id


@router.post("/push", response_model=SyncPushResponse)
def push(
    payload: SyncPushRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SyncPushResponse:
    company_id = current_user.company_id
    results: list[SyncItemResult] = []

    def _apply(entity: str, item, handler) -> None:
        """Run one record's upsert in a savepoint; record the outcome."""
        item_id = getattr(item, "id", None) or "(new)"
        try:
            with db.begin_nested():
                action, final_id = handler(item)
            results.append(SyncItemResult(entity=entity, id=final_id, action=action))
        except Exception as exc:  # isolate a bad record, keep the batch going
            results.append(
                SyncItemResult(entity=entity, id=item_id, action="error",
                               detail=str(exc))
            )

    # 1) Assets first (jobs/readings/faults reference them).
    for item in payload.assets:
        _apply("asset", item, lambda it: _sync_asset(db, it, current_user))
    # 2) Jobs, 3) Readings, 4) Faults.
    for item in payload.jobs:
        _apply("job", item, lambda it: _sync_job(db, it, current_user))
    for item in payload.readings:
        _apply("reading", item, lambda it: _sync_reading(db, it, current_user))
    for item in payload.faults:
        _apply("fault", item, lambda it: _sync_fault(db, it, current_user))

    db.commit()

    created = sum(1 for r in results if r.action == "created")
    updated = sum(1 for r in results if r.action == "updated")
    skipped = sum(1 for r in results if r.action == "skipped")
    errors = sum(1 for r in results if r.action == "error")
    return SyncPushResponse(
        server_time=utcnow(), created=created, updated=updated,
        skipped=skipped, errors=errors, results=results,
    )


# --- Per-entity upsert handlers -------------------------------------------
def _sync_asset(db: Session, item, user: User) -> tuple[str, str]:
    existing = db.get(Asset, item.id) if item.id else None
    if existing is not None and existing.company_id != user.company_id:
        raise ValueError("asset belongs to another company")

    action = decide_sync_action(
        record_exists=existing is not None,
        incoming_ts=item.client_updated_at,
        existing_ts=existing.client_updated_at if existing else None,
    )
    data = item.model_dump(exclude_none=True)
    data.pop("id", None)

    if action == CREATE:
        asset = Asset(company_id=user.company_id, **data)
        if item.id:
            asset.id = item.id
        db.add(asset)
        db.flush()
        audit.record_event(db, entity_type="asset", entity_id=asset.id,
                           action="create", actor_id=user.id,
                           payload={"via": "sync", "customer": asset.customer_name})
        return "created", asset.id
    if action == UPDATE:
        for field, value in data.items():
            setattr(existing, field, value)
        db.flush()
        audit.record_event(db, entity_type="asset", entity_id=existing.id,
                           action="update", actor_id=user.id,
                           payload={"via": "sync"})
        return "updated", existing.id
    return "skipped", existing.id  # SKIP


def _sync_job(db: Session, item, user: User) -> tuple[str, str]:
    existing = db.get(Job, item.id) if item.id else None
    if not _asset_in_company(db, item.asset_id, user.company_id):
        raise ValueError("asset not in your company")
    if existing is not None and not _asset_in_company(db, existing.asset_id, user.company_id):
        raise ValueError("job belongs to another company")

    action = decide_sync_action(
        record_exists=existing is not None,
        incoming_ts=item.client_updated_at,
        existing_ts=existing.client_updated_at if existing else None,
    )
    data = item.model_dump(exclude_none=True)
    data.pop("id", None)

    if action == CREATE:
        job = Job(created_by=user.id, **data)
        if item.id:
            job.id = item.id
        db.add(job)
        db.flush()
        audit.record_event(db, entity_type="job", entity_id=job.id,
                           action="create", actor_id=user.id,
                           payload={"via": "sync", "title": job.title})
        return "created", job.id
    if action == UPDATE:
        for field, value in data.items():
            setattr(existing, field, value)
        if existing.status == "done" and existing.completed_at is None:
            existing.completed_at = utcnow()
        db.flush()
        audit.record_event(db, entity_type="job", entity_id=existing.id,
                           action="update", actor_id=user.id,
                           payload={"via": "sync"})
        return "updated", existing.id
    return "skipped", existing.id


def _sync_reading(db: Session, item, user: User) -> tuple[str, str]:
    existing = db.get(Reading, item.id) if item.id else None
    if not _asset_in_company(db, item.asset_id, user.company_id):
        raise ValueError("asset not in your company")

    action = decide_sync_action(
        record_exists=existing is not None,
        incoming_ts=item.client_updated_at,
        existing_ts=existing.client_updated_at if existing else None,
    )
    data = item.model_dump(exclude_none=True)
    data.pop("id", None)

    if action == CREATE:
        reading = Reading(recorded_by=user.id, **data)
        if item.id:
            reading.id = item.id
        db.add(reading)
        db.flush()
        audit.record_event(db, entity_type="reading", entity_id=reading.id,
                           action="create", actor_id=user.id,
                           payload={"via": "sync", "energy_kwh": reading.energy_kwh})
        return "created", reading.id
    if action == UPDATE:
        for field, value in data.items():
            setattr(existing, field, value)
        db.flush()
        audit.record_event(db, entity_type="reading", entity_id=existing.id,
                           action="update", actor_id=user.id, payload={"via": "sync"})
        return "updated", existing.id
    return "skipped", existing.id


def _sync_fault(db: Session, item, user: User) -> tuple[str, str]:
    existing = db.get(FaultReport, item.id) if item.id else None
    if not _asset_in_company(db, item.asset_id, user.company_id):
        raise ValueError("asset not in your company")

    # Faults have no client_updated_at; treat as create-only (idempotent by id).
    if existing is not None:
        return "skipped", existing.id
    data = item.model_dump(exclude_none=True)
    data.pop("id", None)
    fault = FaultReport(**data)
    if item.id:
        fault.id = item.id
    db.add(fault)
    db.flush()
    audit.record_event(db, entity_type="fault", entity_id=fault.id,
                       action="create", actor_id=user.id,
                       payload={"via": "sync", "category": fault.category})
    return "created", fault.id


# --- Delta pull ------------------------------------------------------------
@router.get("/pull", response_model=SyncPullResponse)
def pull(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    since: datetime | None = Query(default=None),
) -> SyncPullResponse:
    """Return company records changed since ``since`` (or everything if unset).

    Assets/jobs filter on ``updated_at``; readings/faults filter on
    ``created_at`` (they are effectively append-only in the field flow).
    """
    company_id = current_user.company_id

    asset_q = db.query(Asset).filter(Asset.company_id == company_id)
    job_q = db.query(Job).join(Asset, Job.asset_id == Asset.id).filter(
        Asset.company_id == company_id
    )
    reading_q = db.query(Reading).join(Asset, Reading.asset_id == Asset.id).filter(
        Asset.company_id == company_id
    )
    fault_q = db.query(FaultReport).join(Asset, FaultReport.asset_id == Asset.id).filter(
        Asset.company_id == company_id
    )
    if since is not None:
        asset_q = asset_q.filter(Asset.updated_at > since)
        job_q = job_q.filter(Job.updated_at > since)
        reading_q = reading_q.filter(Reading.created_at > since)
        fault_q = fault_q.filter(FaultReport.created_at > since)

    return SyncPullResponse(
        server_time=utcnow(),
        assets=asset_q.all(),
        jobs=job_q.all(),
        readings=reading_q.all(),
        faults=fault_q.all(),
    )
