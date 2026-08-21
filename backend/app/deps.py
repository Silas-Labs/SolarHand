"""Shared FastAPI dependencies: DB session, current user, role guards."""

from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.security import InvalidTokenError, decode_access_token

# tokenUrl is relative to the app root; the login route lives at /auth/login.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

_CREDENTIALS_EXC = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the authenticated, active user from a bearer token."""
    try:
        claims = decode_access_token(token)
    except InvalidTokenError:
        raise _CREDENTIALS_EXC
    user_id = claims.get("sub")
    if not user_id:
        raise _CREDENTIALS_EXC
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise _CREDENTIALS_EXC
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Guard for admin-only routes."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user


__all__ = ["get_db", "get_current_user", "require_admin", "oauth2_scheme"]
