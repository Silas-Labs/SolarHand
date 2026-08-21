"""Tamper-evident, hash-chained audit log.

The integrity story SolarHand tells EPRA judges *without* a blockchain: every
audit row commits to (a) a hash of its own canonical payload and (b) the hash
of the previous row. Recomputing the chain detects any retroactive edit,
deletion, or reordering — the first altered row and everything after it fail
verification.

The hashing/verification functions here are pure stdlib and fully unit-tested.
:func:`record_event` is the thin SQLAlchemy adapter that appends a row.
"""

from __future__ import annotations

import hashlib
import json
from typing import Iterable, Protocol

from app.timeutils import to_iso

GENESIS_HASH = "0" * 64


def compute_payload_hash(payload: dict | None) -> str:
    """Deterministic SHA-256 of a payload dict (stable key order)."""
    canonical = json.dumps(
        payload or {}, sort_keys=True, separators=(",", ":"), default=str
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def compute_entry_hash(
    *,
    prev_hash: str,
    entity_type: str,
    entity_id: str,
    action: str,
    actor_id: str | None,
    payload_hash: str,
    created_at_iso: str | None,
) -> str:
    """Hash one entry, chaining in the previous entry's hash.

    Field order is fixed and values are pipe-joined; ``None`` actor becomes an
    empty string so hashing is stable.
    """
    material = "|".join(
        [
            prev_hash,
            entity_type,
            entity_id,
            action,
            actor_id or "",
            payload_hash,
            created_at_iso or "",
        ]
    )
    return hashlib.sha256(material.encode("utf-8")).hexdigest()


class _AuditRow(Protocol):
    """Structural type covering both ORM rows and test stand-ins."""

    entity_type: str
    entity_id: str
    action: str
    actor_id: str | None
    payload: dict
    payload_hash: str
    prev_hash: str
    hash: str
    created_at: object  # datetime; passed through to_iso()


def verify_chain(entries: Iterable[_AuditRow]) -> tuple[bool, str | None]:
    """Verify an ordered audit chain.

    Returns ``(is_valid, first_bad_id)``. ``first_bad_id`` is the ``hash`` of
    the first row that fails (or ``None`` when the whole chain is intact).

    Three independent checks per row:
      1. payload hash matches the stored payload (payload not tampered),
      2. the row hash recomputes from its fields (row not tampered),
      3. the row links to the previous row's hash (no insert/delete/reorder).
    """
    prev = GENESIS_HASH
    for row in entries:
        recomputed_payload = compute_payload_hash(row.payload)
        if recomputed_payload != row.payload_hash:
            return False, row.hash
        recomputed_hash = compute_entry_hash(
            prev_hash=row.prev_hash,
            entity_type=row.entity_type,
            entity_id=row.entity_id,
            action=row.action,
            actor_id=row.actor_id,
            payload_hash=row.payload_hash,
            created_at_iso=to_iso(row.created_at),  # type: ignore[arg-type]
        )
        if recomputed_hash != row.hash:
            return False, row.hash
        if row.prev_hash != prev:
            return False, row.hash
        prev = row.hash
    return True, None


def record_event(
    db,
    *,
    entity_type: str,
    entity_id: str,
    action: str,
    actor_id: str | None = None,
    payload: dict | None = None,
):
    """Append a chained audit row and return it.

    Thin SQLAlchemy adapter over the pure hashing functions above. The new
    row's ``created_at`` is set explicitly so the value hashed matches the
    value stored (avoids relying on a post-flush server default).
    """
    from app.models import AuditLog  # local import to keep this module import-light
    from app.timeutils import utcnow

    last = (
        db.query(AuditLog).order_by(AuditLog.id.desc()).first()
        if hasattr(db, "query")
        else None
    )
    prev_hash = last.hash if last else GENESIS_HASH

    payload = payload or {}
    created_at = utcnow()
    payload_hash = compute_payload_hash(payload)
    entry_hash = compute_entry_hash(
        prev_hash=prev_hash,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        actor_id=actor_id,
        payload_hash=payload_hash,
        created_at_iso=to_iso(created_at),
    )

    row = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        actor_id=actor_id,
        payload=payload,
        payload_hash=payload_hash,
        prev_hash=prev_hash,
        hash=entry_hash,
        created_at=created_at,
    )
    db.add(row)
    db.flush()  # assign id without committing (caller owns the transaction)
    return row
