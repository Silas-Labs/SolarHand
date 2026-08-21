"""Authentication & onboarding routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app import audit
from app.deps import get_current_user, get_db
from app.models import Company, User
from app.schemas import (
    RegisterRequest,
    RegisterResponse,
    Token,
    UserRead,
)
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _issue_token(user: User) -> str:
    return create_access_token(
        user.id,
        additional_claims={"role": user.role, "company_id": user.company_id},
    )


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> RegisterResponse:
    """Onboard a new company plus its first admin user, and log them in."""
    email = payload.admin.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    company = Company(**payload.company.model_dump())
    db.add(company)
    db.flush()  # get company.id

    user = User(
        email=email,
        full_name=payload.admin.full_name,
        hashed_password=hash_password(payload.admin.password),
        role="admin",
        company_id=company.id,
        epra_technician_license=payload.admin.epra_technician_license,
    )
    db.add(user)
    db.flush()

    audit.record_event(
        db,
        entity_type="company",
        entity_id=company.id,
        action="create",
        actor_id=user.id,
        payload={"name": company.name},
    )
    audit.record_event(
        db,
        entity_type="user",
        entity_id=user.id,
        action="create",
        actor_id=user.id,
        payload={"email": user.email, "role": user.role},
    )
    db.commit()
    db.refresh(company)
    db.refresh(user)

    return RegisterResponse(
        access_token=_issue_token(user),
        company=company,  # type: ignore[arg-type]  (from_attributes)
        user=user,        # type: ignore[arg-type]
    )


@router.post("/login", response_model=Token)
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> Token:
    """OAuth2 password login. ``username`` is the user's email."""
    user = db.query(User).filter(User.email == form.username.lower()).first()
    if user is None or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Inactive user")

    audit.record_event(
        db,
        entity_type="user",
        entity_id=user.id,
        action="login",
        actor_id=user.id,
        payload={"email": user.email},
    )
    db.commit()
    return Token(access_token=_issue_token(user))


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> User:
    """Return the authenticated user's profile."""
    return current_user
