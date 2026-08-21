"""Config-bound auth facade.

Composes the pure crypto primitives (:mod:`app.jwt_utils`,
:mod:`app.passwords`) with application settings so the rest of the app has a
single import site for auth. The pure modules carry the security-critical
logic and are unit-tested independently.
"""

from __future__ import annotations

from datetime import timedelta

from app import jwt_utils
from app.config import settings
from app.jwt_utils import InvalidTokenError  # re-export for callers
from app.passwords import hash_password, verify_password  # re-export
from app.timeutils import utcnow

__all__ = [
    "InvalidTokenError",
    "hash_password",
    "verify_password",
    "create_access_token",
    "decode_access_token",
]


def create_access_token(
    subject: str,
    *,
    expires_delta: timedelta | None = None,
    additional_claims: dict | None = None,
) -> str:
    """Create a signed access token for ``subject`` (usually a user id)."""
    now = utcnow()
    expire = now + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    claims: dict = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    if additional_claims:
        claims.update(additional_claims)
    return jwt_utils.encode(claims, settings.jwt_secret_key)


def decode_access_token(token: str) -> dict:
    """Verify a token against the configured secret and return its claims."""
    return jwt_utils.decode(token, settings.jwt_secret_key)
