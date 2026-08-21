"""Fault reports — raised by technicians or the analytics classifier."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app import audit
from app.deps import get_current_user, get_db
from app.models import Asset, FaultReport, User
from app.schemas import FaultReportCreate, FaultReportRead

router = APIRouter(prefix="/faults", tags=["faults"])


def _assert_asset_in_company(db: Session, asset_id: str, company_id: str) -> Asset:
    asset = db.get(Asset, asset_id)
    if asset is None or asset.company_id != company_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Asset not found")
    return asset


def _get_company_fault(db: Session, fault_id: str, company_id: str) -> FaultReport:
    fault = db.get(FaultReport, fault_id)
    if fault is not None:
        asset = db.get(Asset, fault.asset_id)
        if asset is not None and asset.company_id == company_id:
            return fault
    raise HTTPException(status.HTTP_404_NOT_FOUND, "Fault not found")


@router.post("", response_model=FaultReportRead, status_code=status.HTTP_201_CREATED)
def create_fault(
    payload: FaultReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FaultReport:
    _assert_asset_in_company(db, payload.asset_id, current_user.company_id)
    data = payload.model_dump(exclude_none=True)
    supplied_id = data.pop("id", None)
    if supplied_id and db.get(FaultReport, supplied_id) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Fault id already exists")

    fault = FaultReport(**data)
    if supplied_id:
        fault.id = supplied_id
    db.add(fault)
    db.flush()
    audit.record_event(
        db, entity_type="fault", entity_id=fault.id, action="create",
        actor_id=current_user.id,
        payload={"asset_id": fault.asset_id, "category": fault.category,
                 "severity": fault.severity},
    )
    db.commit()
    db.refresh(fault)
    return fault


@router.get("", response_model=list[FaultReportRead])
def list_faults(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    asset_id: str | None = Query(default=None),
    resolved: bool | None = Query(default=None),
) -> list[FaultReport]:
    query = (
        db.query(FaultReport)
        .join(Asset, FaultReport.asset_id == Asset.id)
        .filter(Asset.company_id == current_user.company_id)
    )
    if asset_id:
        query = query.filter(FaultReport.asset_id == asset_id)
    if resolved is not None:
        query = query.filter(FaultReport.resolved == resolved)
    return query.order_by(FaultReport.created_at.desc()).all()


@router.patch("/{fault_id}/resolve", response_model=FaultReportRead)
def resolve_fault(
    fault_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FaultReport:
    fault = _get_company_fault(db, fault_id, current_user.company_id)
    fault.resolved = True
    db.flush()
    audit.record_event(
        db, entity_type="fault", entity_id=fault.id, action="update",
        actor_id=current_user.id, payload={"resolved": True},
    )
    db.commit()
    db.refresh(fault)
    return fault
