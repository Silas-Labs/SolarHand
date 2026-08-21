"""Unit tests for app.sync_logic — offline last-write-wins resolution.

Stdlib ``unittest``; runs standalone and under pytest.
"""

from __future__ import annotations

import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.sync_logic import CREATE, SKIP, UPDATE, decide_sync_action  # noqa: E402

T0 = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
T1 = T0 + timedelta(hours=1)


class SyncDecisionTests(unittest.TestCase):
    def test_absent_record_is_created(self):
        self.assertEqual(
            decide_sync_action(record_exists=False, incoming_ts=None, existing_ts=None),
            CREATE,
        )
        self.assertEqual(
            decide_sync_action(record_exists=False, incoming_ts=T1, existing_ts=None),
            CREATE,
        )

    def test_present_without_incoming_ts_skips(self):
        self.assertEqual(
            decide_sync_action(record_exists=True, incoming_ts=None, existing_ts=T0),
            SKIP,
        )

    def test_present_without_existing_ts_updates(self):
        self.assertEqual(
            decide_sync_action(record_exists=True, incoming_ts=T0, existing_ts=None),
            UPDATE,
        )

    def test_newer_incoming_updates(self):
        self.assertEqual(
            decide_sync_action(record_exists=True, incoming_ts=T1, existing_ts=T0),
            UPDATE,
        )

    def test_older_incoming_skips(self):
        self.assertEqual(
            decide_sync_action(record_exists=True, incoming_ts=T0, existing_ts=T1),
            SKIP,
        )

    def test_equal_timestamps_favour_server(self):
        self.assertEqual(
            decide_sync_action(record_exists=True, incoming_ts=T0, existing_ts=T0),
            SKIP,
        )

    def test_naive_incoming_compared_as_utc(self):
        naive_newer = datetime(2026, 1, 1, 13, 0, 0)  # naive, == T1 in UTC
        self.assertEqual(
            decide_sync_action(record_exists=True, incoming_ts=naive_newer, existing_ts=T0),
            UPDATE,
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
