"""Password hashing with bcrypt (no config, no third-party deps beyond bcrypt).

Kept separate from settings so it can be unit-tested standalone. bcrypt only
considers the first 72 bytes of a password; we truncate explicitly so hashing
is deterministic and never raises on long input.
"""

from __future__ import annotations

import bcrypt

_BCRYPT_MAX_BYTES = 72


def _pw_bytes(password: str) -> bytes:
    return password.encode("utf-8")[:_BCRYPT_MAX_BYTES]


def hash_password(password: str) -> str:
    """Return a bcrypt hash (utf-8 string) suitable for storage."""
    return bcrypt.hashpw(_pw_bytes(password), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """Constant-time verify a plaintext password against a stored hash.

    Returns ``False`` (rather than raising) for malformed/foreign hashes.
    """
    try:
        return bcrypt.checkpw(_pw_bytes(password), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False
