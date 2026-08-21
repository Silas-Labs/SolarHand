"""User management (admin-scoped, within the admin's own company)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import audit
from app.deps import get_db, require_admin
from app.models import User
from app.schemas import UserCreate, UserRead, UserUpdate
from app.security import hash_password

router = APIRouter(prefix="/users", tags=["users"])


def _get_company_user(db: Session, user_id: str, company_id: str | None) -> User:
    user = db.get(User, user_id)
    if user is None or user.company_id != company_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return user


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> User:
    """Create a technician (or another admin) inside the caller's company."""
    email = payload.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    user = User(
        email=email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        company_id=admin.company_id,  # forced to admin's company (ignore client value)
        epra_technician_license=payload.epra_technician_license,
    )
    db.add(user)
    db.flush()
    audit.record_event(
        db, entity_type="user", entity_id=user.id, action="create",
        actor_id=admin.id, payload={"email": user.email, "role": user.role},
    )
    db.commit()
    db.refresh(user)
    return user


@router.get("", response_model=list[UserRead])
def list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> list[User]:
    return (
        db.query(User)
        .filter(User.company_id == admin.company_id)
        .order_by(User.created_at)
        .all()
    )


@router.get("/{user_id}", response_model=UserRead)
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> User:
    return _get_company_user(db, user_id, admin.company_id)


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: str,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> User:
    user = _get_company_user(db, user_id, admin.company_id)
    data = payload.model_dump(exclude_unset=True)
    if "password" in data:
        pw = data.pop("password")
        if pw:
            user.hashed_password = hash_password(pw)
    for field, value in data.items():
        setattr(user, field, value)
    db.flush()
    audit.record_event(
        db, entity_type="user", entity_id=user.id, action="update",
        actor_id=admin.id, payload={"fields": sorted(data.keys())},
    )
    db.commit()
    db.refresh(user)
    return user
