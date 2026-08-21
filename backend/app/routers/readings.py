"""Meter/energy readings captured during visits (company-scoped).

Readings feed the analytics engine's expected-vs-actual performance check.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app import audit
from app.deps import get_current_user, get_db
from app.models import Asset, Reading, User
from app.schemas import ReadingCreate, ReadingRead

router = APIRouter(prefix="/readings", tags=["readings"])


def _assert_asset_in_company(db: Session, asset_id: str, company_id: str) -> Asset:
    asset = db.get(Asset, asset_id)
    if asset is None or asset.company_id != company_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Asset not found")
    return asset


@router.post("", response_model=ReadingRead, status_code=status.HTTP_201_CREATED)
def create_reading(
    payload: ReadingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Reading:
    _assert_asset_in_company(db, payload.asset_id, current_user.company_id)
    data = payload.model_dump(exclude_none=True)
    supplied_id = data.pop("id", None)
    if supplied_id and db.get(Reading, supplied_id) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Reading id already exists")

    reading = Reading(recorded_by=current_user.id, **data)
    if supplied_id:
        reading.id = supplied_id
    db.add(reading)
    db.flush()
    audit.record_event(
        db, entity_type="reading", entity_id=reading.id, action="create",
        actor_id=current_user.id,
        payload={"asset_id": reading.asset_id, "energy_kwh": reading.energy_kwh},
    )
    db.commit()
    db.refresh(reading)
    return reading


@router.get("", response_model=list[ReadingRead])
def list_readings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    asset_id: str | None = Query(default=None),
) -> list[Reading]:
    query = (
        db.query(Reading)
        .join(Asset, Reading.asset_id == Asset.id)
        .filter(Asset.company_id == current_user.company_id)
    )
    if asset_id:
        query = query.filter(Reading.asset_id == asset_id)
    return query.order_by(Reading.reading_date.desc()).all()


@router.get("/{reading_id}", response_model=ReadingRead)
def get_reading(
    reading_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Reading:
    reading = db.get(Reading, reading_id)
    if reading is not None:
        asset = db.get(Asset, reading.asset_id)
        if asset is not None and asset.company_id == current_user.company_id:
            return reading
    raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found")
