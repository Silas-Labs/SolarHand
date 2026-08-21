"""Asset registry: installed PV systems and their EPRA-rated components.

All routes are scoped to the caller's company. Reads/writes are open to any
authenticated user (technicians register systems in the field); deletes are
admin-only.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app import audit
from app.deps import get_current_user, get_db, require_admin
from app.models import Asset, Component, User
from app.schemas import (
    AssetCreate,
    AssetDetail,
    AssetRead,
    AssetStatus,
    AssetUpdate,
    ComponentCreate,
    ComponentRead,
)

router = APIRouter(prefix="/assets", tags=["assets"])


def _get_company_asset(db: Session, asset_id: str, company_id: str) -> Asset:
    asset = db.get(Asset, asset_id)
    if asset is None or asset.company_id != company_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Asset not found")
    return asset


@router.post("", response_model=AssetRead, status_code=status.HTTP_201_CREATED)
def create_asset(
    payload: AssetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Asset:
    data = payload.model_dump(exclude_none=True)
    supplied_id = data.pop("id", None)
    if supplied_id and db.get(Asset, supplied_id) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Asset id already exists")

    asset = Asset(company_id=current_user.company_id, **data)
    if supplied_id:
        asset.id = supplied_id
    db.add(asset)
    db.flush()
    audit.record_event(
        db, entity_type="asset", entity_id=asset.id, action="create",
        actor_id=current_user.id,
        payload={"customer": asset.customer_name, "kwp": asset.system_kwp},
    )
    db.commit()
    db.refresh(asset)
    return asset


@router.get("", response_model=list[AssetRead])
def list_assets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    status_filter: AssetStatus | None = Query(default=None, alias="status"),
    county: str | None = None,
) -> list[Asset]:
    query = db.query(Asset).filter(Asset.company_id == current_user.company_id)
    if status_filter:
        query = query.filter(Asset.status == status_filter)
    if county:
        query = query.filter(Asset.county == county)
    return query.order_by(Asset.created_at.desc()).all()


@router.get("/{asset_id}", response_model=AssetDetail)
def get_asset(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Asset:
    return _get_company_asset(db, asset_id, current_user.company_id)


@router.patch("/{asset_id}", response_model=AssetRead)
def update_asset(
    asset_id: str,
    payload: AssetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Asset:
    asset = _get_company_asset(db, asset_id, current_user.company_id)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(asset, field, value)
    db.flush()
    audit.record_event(
        db, entity_type="asset", entity_id=asset.id, action="update",
        actor_id=current_user.id, payload={"fields": sorted(data.keys())},
    )
    db.commit()
    db.refresh(asset)
    return asset


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asset(
    asset_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> None:
    asset = _get_company_asset(db, asset_id, admin.company_id)
    db.delete(asset)
    audit.record_event(
        db, entity_type="asset", entity_id=asset_id, action="delete",
        actor_id=admin.id, payload={"customer": asset.customer_name},
    )
    db.commit()


# --- Components ------------------------------------------------------------
@router.post(
    "/{asset_id}/components",
    response_model=ComponentRead,
    status_code=status.HTTP_201_CREATED,
)
def add_component(
    asset_id: str,
    payload: ComponentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Component:
    asset = _get_company_asset(db, asset_id, current_user.company_id)
    component = Component(asset_id=asset.id, **payload.model_dump())
    db.add(component)
    db.flush()
    audit.record_event(
        db, entity_type="component", entity_id=component.id, action="create",
        actor_id=current_user.id, payload={"kind": component.kind, "asset_id": asset.id},
    )
    db.commit()
    db.refresh(component)
    return component


@router.get("/{asset_id}/components", response_model=list[ComponentRead])
def list_components(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Component]:
    asset = _get_company_asset(db, asset_id, current_user.company_id)
    return (
        db.query(Component)
        .filter(Component.asset_id == asset.id)
        .order_by(Component.created_at)
        .all()
    )


@router.delete(
    "/{asset_id}/components/{component_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_component(
    asset_id: str,
    component_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> None:
    _get_company_asset(db, asset_id, admin.company_id)
    component = db.get(Component, component_id)
    if component is None or component.asset_id != asset_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Component not found")
    db.delete(component)
    audit.record_event(
        db, entity_type="component", entity_id=component_id, action="delete",
        actor_id=admin.id, payload={"asset_id": asset_id},
    )
    db.commit()
