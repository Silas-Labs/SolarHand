"""Unit tests for the pure auth primitives: bcrypt passwords + HS256 JWT.

Uses stdlib ``unittest`` so it runs even without pytest installed
(``python3 tests/test_security.py``); pytest also collects it. Targets the
config-free modules (:mod:`app.passwords`, :mod:`app.jwt_utils`) directly.
"""

from __future__ import annotations

import base64
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.jwt_utils import (  # noqa: E402
    InvalidTokenError,
    decode,
    encode,
)
from app.passwords import hash_password, verify_password  # noqa: E402
from app.timeutils import utcnow  # noqa: E402

SECRET = "unit-test-secret"


def _b64url(obj: dict) -> str:
    raw = json.dumps(obj, separators=(",", ":")).encode()
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def _token_with_exp(offset_seconds: int, sub: str = "u") -> str:
    exp = int(utcnow().timestamp()) + offset_seconds
    return encode({"sub": sub, "exp": exp}, SECRET)


class PasswordTests(unittest.TestCase):
    def test_hash_and_verify_roundtrip(self):
        h = hash_password("s3cret-pass")
        self.assertNotEqual(h, "s3cret-pass")  # never store plaintext
        self.assertTrue(verify_password("s3cret-pass", h))

    def test_wrong_password_fails(self):
        h = hash_password("correct horse")
        self.assertFalse(verify_password("battery staple", h))

    def test_two_hashes_of_same_password_differ_but_verify(self):
        h1, h2 = hash_password("pw"), hash_password("pw")
        self.assertNotEqual(h1, h2)  # per-hash salt
        self.assertTrue(verify_password("pw", h1))
        self.assertTrue(verify_password("pw", h2))

    def test_long_password_does_not_crash(self):
        long_pw = "a" * 200  # exceeds bcrypt's 72-byte window
        h = hash_password(long_pw)
        self.assertTrue(verify_password(long_pw, h))

    def test_verify_against_garbage_hash_is_false(self):
        self.assertFalse(verify_password("pw", "not-a-real-hash"))


class JwtTests(unittest.TestCase):
    def test_roundtrip_preserves_claims(self):
        token = encode({"sub": "user-123", "role": "technician",
                        "exp": int(utcnow().timestamp()) + 60}, SECRET)
        claims = decode(token, SECRET)
        self.assertEqual(claims["sub"], "user-123")
        self.assertEqual(claims["role"], "technician")

    def test_expired_token_rejected(self):
        with self.assertRaises(InvalidTokenError):
            decode(_token_with_exp(-1), SECRET)

    def test_valid_future_token_accepted(self):
        claims = decode(_token_with_exp(3600), SECRET)
        self.assertEqual(claims["sub"], "u")

    def test_wrong_secret_rejected(self):
        token = _token_with_exp(60)
        with self.assertRaises(InvalidTokenError):
            decode(token, "a-different-secret")

    def test_tampered_payload_rejected(self):
        token = _token_with_exp(60)
        header_b64, _payload_b64, sig_b64 = token.split(".")
        forged_payload = _b64url({"sub": "admin", "exp": 9999999999})
        with self.assertRaises(InvalidTokenError):
            decode(f"{header_b64}.{forged_payload}.{sig_b64}", SECRET)

    def test_alg_none_rejected(self):
        header = _b64url({"alg": "none", "typ": "JWT"})
        payload = _b64url({"sub": "admin", "exp": 9999999999})
        with self.assertRaises(InvalidTokenError):
            decode(f"{header}.{payload}.", SECRET)

    def test_malformed_tokens_rejected(self):
        for bad in ["", "abc", "a.b", "a.b.c.d"]:
            with self.assertRaises(InvalidTokenError):
                decode(bad, SECRET)


if __name__ == "__main__":
    unittest.main(verbosity=2)
