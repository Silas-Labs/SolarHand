"""Company profile routes (scoped to the caller's own company)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import audit
from app.deps import get_current_user, get_db, require_admin
from app.models import Company, User
from app.schemas import CompanyRead, CompanyUpdate

router = APIRouter(prefix="/companies", tags=["companies"])


def _load_company(db: Session, company_id: str | None) -> Company:
    company = db.get(Company, company_id) if company_id else None
    if company is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Company not found")
    return company


@router.get("/me", response_model=CompanyRead)
def get_my_company(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Company:
    return _load_company(db, current_user.company_id)


@router.patch("/me", response_model=CompanyRead)
def update_my_company(
    payload: CompanyUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> Company:
    company = _load_company(db, admin.company_id)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(company, field, value)
    db.flush()
    audit.record_event(
        db, entity_type="company", entity_id=company.id, action="update",
        actor_id=admin.id, payload={"fields": sorted(data.keys())},
    )
    db.commit()
    db.refresh(company)
    return company
