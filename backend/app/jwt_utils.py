"""Pure-stdlib HS256 JWT encode/decode (no config, no third-party deps).

Kept dependency-free on purpose: the signing/verification logic is the
security-critical part, and isolating it here means it can be unit-tested
anywhere and reused with an explicit secret. Config binding (pulling the
secret + expiry from settings) lives in :mod:`app.security`.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json

from app.timeutils import utcnow

ALG = "HS256"


class InvalidTokenError(Exception):
    """Raised when a JWT is malformed, mis-signed, or expired."""


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64url_decode(segment: str) -> bytes:
    padding = "=" * (-len(segment) % 4)
    return base64.urlsafe_b64decode(segment + padding)


def _json(obj: dict) -> bytes:
    return json.dumps(obj, separators=(",", ":"), sort_keys=True).encode("utf-8")


def encode(claims: dict, secret: str) -> str:
    """Sign ``claims`` into a compact HS256 JWT string."""
    header = {"alg": ALG, "typ": "JWT"}
    segments = [_b64url_encode(_json(header)), _b64url_encode(_json(claims))]
    signature = hmac.new(
        secret.encode("utf-8"), ".".join(segments).encode("ascii"), hashlib.sha256
    ).digest()
    segments.append(_b64url_encode(signature))
    return ".".join(segments)


def decode(token: str, secret: str, *, verify_exp: bool = True) -> dict:
    """Verify signature (and expiry) and return the claims.

    Raises :class:`InvalidTokenError` on any problem. The algorithm is pinned
    to HS256 on verify, defeating ``alg=none``/algorithm-confusion attacks.
    """
    if not token or token.count(".") != 2:
        raise InvalidTokenError("malformed token")
    header_b64, payload_b64, sig_b64 = token.split(".")

    try:
        header = json.loads(_b64url_decode(header_b64))
    except (ValueError, json.JSONDecodeError) as exc:
        raise InvalidTokenError("malformed header") from exc
    if header.get("alg") != ALG:
        raise InvalidTokenError("unsupported algorithm")

    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    expected_sig = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    try:
        actual_sig = _b64url_decode(sig_b64)
    except ValueError as exc:  # binascii.Error subclasses ValueError
        raise InvalidTokenError("malformed signature") from exc
    if not hmac.compare_digest(expected_sig, actual_sig):
        raise InvalidTokenError("bad signature")

    try:
        claims = json.loads(_b64url_decode(payload_b64))
    except (ValueError, json.JSONDecodeError) as exc:
        raise InvalidTokenError("malformed payload") from exc

    if verify_exp:
        exp = claims.get("exp")
        if exp is None:
            raise InvalidTokenError("missing expiry")
        if utcnow().timestamp() >= float(exp):
            raise InvalidTokenError("token expired")

    return claims
