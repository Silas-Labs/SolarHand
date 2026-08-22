"""Shared FastAPI dependencies: DB session, current user, role guards."""

from __future__ import annotations

import hmac

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User
from app.security import InvalidTokenError, decode_access_token
from app.analytics.weather import OpenMeteoProvider, WeatherProvider

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


def get_weather_provider() -> WeatherProvider:
    """Weather source for the analytics engine.

    Defaults to Open-Meteo; tests override this dependency with a deterministic
    provider so analysis runs offline.
    """
    return OpenMeteoProvider()


def require_gateway_key(
    x_gateway_key: str | None = Header(default=None, alias="X-Gateway-Key"),
) -> None:
    """Authenticate a device/gateway telemetry POST via a shared secret.

    Telemetry ingestion is machine-to-machine (a field gateway or the labeled
    simulator), so it presents the ``X-Gateway-Key`` header rather than a human
    JWT. Compared in constant time against ``settings.gateway_key`` to avoid
    leaking the key through timing. This authenticates the *channel*; the device
    is still resolved to a specific asset by ``device_id`` in the payload.
    """
    expected = settings.gateway_key
    if not x_gateway_key or not hmac.compare_digest(x_gateway_key, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing gateway key",
            headers={"WWW-Authenticate": "GatewayKey"},
        )


__all__ = [
    "get_db",
    "get_current_user",
    "require_admin",
    "get_weather_provider",
    "require_gateway_key",
    "oauth2_scheme",
]
