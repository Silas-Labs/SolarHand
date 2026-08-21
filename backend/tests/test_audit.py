"""Unit tests for app.audit — the tamper-evident hash chain.

Pure stdlib; runs standalone (``python3 tests/test_audit.py``) and under pytest.
Builds chains from lightweight stand-in rows (``SimpleNamespace``) so no DB is
needed to exercise the integrity logic that protects EPRA compliance records.
"""

from __future__ import annotations

import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.audit import (  # noqa: E402
    GENESIS_HASH,
    compute_entry_hash,
    compute_payload_hash,
    verify_chain,
)
from app.timeutils import to_iso  # noqa: E402


def build_chain(events: list[dict]) -> list[SimpleNamespace]:
    """Construct a correctly-linked chain of audit rows from event dicts."""
    rows: list[SimpleNamespace] = []
    prev = GENESIS_HASH
    base = datetime(2026, 1, 1, tzinfo=timezone.utc)
    for i, ev in enumerate(events):
        created = base + timedelta(seconds=i)
        payload = ev.get("payload", {})
        ph = compute_payload_hash(payload)
        h = compute_entry_hash(
            prev_hash=prev,
            entity_type=ev["entity_type"],
            entity_id=ev["entity_id"],
            action=ev["action"],
            actor_id=ev.get("actor_id"),
            payload_hash=ph,
            created_at_iso=to_iso(created),
        )
        rows.append(
            SimpleNamespace(
                entity_type=ev["entity_type"],
                entity_id=ev["entity_id"],
                action=ev["action"],
                actor_id=ev.get("actor_id"),
                payload=payload,
                payload_hash=ph,
                prev_hash=prev,
                hash=h,
                created_at=created,
            )
        )
        prev = h
    return rows


SAMPLE = [
    {"entity_type": "asset", "entity_id": "a1", "action": "create",
     "actor_id": "u1", "payload": {"kwp": 5.0}},
    {"entity_type": "job", "entity_id": "j1", "action": "create",
     "actor_id": "u1", "payload": {"type": "inspection"}},
    {"entity_type": "reading", "entity_id": "r1", "action": "create",
     "actor_id": "u2", "payload": {"energy_kwh": 20.5}},
]


class PayloadHashTests(unittest.TestCase):
    def test_key_order_independent(self):
        self.assertEqual(
            compute_payload_hash({"a": 1, "b": 2}),
            compute_payload_hash({"b": 2, "a": 1}),
        )

    def test_different_payloads_differ(self):
        self.assertNotEqual(
            compute_payload_hash({"x": 1}), compute_payload_hash({"x": 2})
        )

    def test_none_and_empty_equal(self):
        self.assertEqual(compute_payload_hash(None), compute_payload_hash({}))


class ChainTests(unittest.TestCase):
    def test_valid_chain_verifies(self):
        ok, bad = verify_chain(build_chain(SAMPLE))
        self.assertTrue(ok)
        self.assertIsNone(bad)

    def test_empty_chain_is_valid(self):
        ok, bad = verify_chain([])
        self.assertTrue(ok)
        self.assertIsNone(bad)

    def test_single_row_valid(self):
        ok, _ = verify_chain(build_chain(SAMPLE[:1]))
        self.assertTrue(ok)

    def test_tampered_payload_detected(self):
        chain = build_chain(SAMPLE)
        # Mutate the stored payload but leave payload_hash/hash alone.
        chain[1].payload = {"type": "repair"}
        ok, bad = verify_chain(chain)
        self.assertFalse(ok)
        self.assertEqual(bad, chain[1].hash)

    def test_tampered_field_detected(self):
        chain = build_chain(SAMPLE)
        # Change an immutable field without recomputing the hash.
        chain[2].action = "delete"
        ok, bad = verify_chain(chain)
        self.assertFalse(ok)
        self.assertEqual(bad, chain[2].hash)

    def test_reorder_breaks_linkage(self):
        chain = build_chain(SAMPLE)
        chain[1], chain[2] = chain[2], chain[1]
        ok, _ = verify_chain(chain)
        self.assertFalse(ok)

    def test_deleted_row_breaks_linkage(self):
        chain = build_chain(SAMPLE)
        del chain[1]  # remove a middle row
        ok, _ = verify_chain(chain)
        self.assertFalse(ok)

    def test_first_row_must_chain_to_genesis(self):
        chain = build_chain(SAMPLE)
        chain[0].prev_hash = "f" * 64  # not GENESIS
        ok, bad = verify_chain(chain)
        self.assertFalse(ok)
        self.assertEqual(bad, chain[0].hash)


if __name__ == "__main__":
    unittest.main(verbosity=2)
