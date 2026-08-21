"""API tests: offline batch sync (push upsert + delta pull).

Exercises the last-write-wins conflict policy, per-item error isolation, and
intra-batch FK ordering (assets processed before the jobs/readings that
reference them).
"""

from __future__ import annotations

ASSET_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
JOB_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
READING_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
FAULT_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"


def _asset_item(**overrides):
    item = {
        "id": ASSET_ID,
        "customer_name": "Sync Customer",
        "location_name": "Kisumu Central",
        "county": "Kisumu",
        "latitude": -0.1,
        "longitude": 34.75,
        "system_kwp": 4.0,
        "client_updated_at": "2026-08-10T10:00:00+00:00",
    }
    item.update(overrides)
    return item


def test_push_new_batch_in_fk_order(client, admin_auth):
    """A single batch containing an asset and its dependent records."""
    body = {
        "assets": [_asset_item()],
        "jobs": [{
            "id": JOB_ID, "asset_id": ASSET_ID, "type": "install",
            "title": "New install", "client_updated_at": "2026-08-10T10:00:00+00:00",
        }],
        "readings": [{
            "id": READING_ID, "asset_id": ASSET_ID,
            "reading_date": "2026-08-10", "energy_kwh": 18.0,
        }],
        "faults": [{
            "id": FAULT_ID, "asset_id": ASSET_ID, "category": "soiling",
        }],
    }
    resp = client.post("/sync/push", headers=admin_auth["headers"], json=body)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["created"] == 4
    assert data["updated"] == 0
    assert data["errors"] == 0
    # Server-assigned ids equal the client ids (offline-created).
    assert client.get(f"/assets/{ASSET_ID}", headers=admin_auth["headers"]).status_code == 200
    assert client.get(f"/jobs/{JOB_ID}", headers=admin_auth["headers"]).status_code == 200


def test_last_write_wins(client, admin_auth):
    base = {"assets": [_asset_item(customer_name="Original")]}
    assert client.post("/sync/push", headers=admin_auth["headers"], json=base).json()["created"] == 1

    # Older edit is ignored.
    stale = {"assets": [_asset_item(customer_name="StaleEdit",
                                    client_updated_at="2026-08-09T10:00:00+00:00")]}
    r_stale = client.post("/sync/push", headers=admin_auth["headers"], json=stale).json()
    assert r_stale["skipped"] == 1 and r_stale["updated"] == 0
    assert client.get(f"/assets/{ASSET_ID}",
                      headers=admin_auth["headers"]).json()["customer_name"] == "Original"

    # Newer edit wins.
    fresh = {"assets": [_asset_item(customer_name="FreshEdit",
                                    client_updated_at="2026-08-11T10:00:00+00:00")]}
    r_fresh = client.post("/sync/push", headers=admin_auth["headers"], json=fresh).json()
    assert r_fresh["updated"] == 1 and r_fresh["skipped"] == 0
    assert client.get(f"/assets/{ASSET_ID}",
                      headers=admin_auth["headers"]).json()["customer_name"] == "FreshEdit"


def test_bad_item_is_isolated(client, admin_auth):
    """A job referencing a missing asset errors without sinking the batch."""
    body = {
        "assets": [_asset_item()],
        "jobs": [{"id": JOB_ID, "asset_id": "no-such-asset", "type": "repair",
                  "title": "Orphan job"}],
    }
    data = client.post("/sync/push", headers=admin_auth["headers"], json=body).json()
    assert data["created"] == 1          # the asset
    assert data["errors"] == 1           # the orphan job
    error_results = [r for r in data["results"] if r["action"] == "error"]
    assert len(error_results) == 1 and error_results[0]["entity"] == "job"
    # The good asset really did persist.
    assert client.get(f"/assets/{ASSET_ID}", headers=admin_auth["headers"]).status_code == 200
    # The bad job did not.
    assert client.get(f"/jobs/{JOB_ID}", headers=admin_auth["headers"]).status_code == 404


def test_fault_resync_is_idempotent(client, admin_auth):
    client.post("/sync/push", headers=admin_auth["headers"], json={"assets": [_asset_item()]})
    fault_body = {"faults": [{"id": FAULT_ID, "asset_id": ASSET_ID, "category": "shading"}]}
    first = client.post("/sync/push", headers=admin_auth["headers"], json=fault_body).json()
    assert first["created"] == 1
    # Re-pushing the same fault id is a no-op (skipped), not a duplicate/error.
    again = client.post("/sync/push", headers=admin_auth["headers"], json=fault_body).json()
    assert again["created"] == 0 and again["skipped"] == 1 and again["errors"] == 0


def test_cross_company_push_is_rejected(client, admin_auth, other_company_auth):
    # Company A owns the asset.
    client.post("/sync/push", headers=admin_auth["headers"], json={"assets": [_asset_item()]})
    # Company B tries to update it via sync → error (belongs to another company).
    intrusion = {"assets": [_asset_item(customer_name="Hijack")]}
    data = client.post("/sync/push", headers=other_company_auth["headers"], json=intrusion).json()
    assert data["errors"] == 1 and data["updated"] == 0
    # Unchanged for the rightful owner.
    assert client.get(f"/assets/{ASSET_ID}",
                      headers=admin_auth["headers"]).json()["customer_name"] == "Sync Customer"


def test_pull_returns_and_filters(client, admin_auth):
    client.post("/sync/push", headers=admin_auth["headers"], json={"assets": [_asset_item()]})

    full = client.get("/sync/pull", headers=admin_auth["headers"])
    assert full.status_code == 200
    payload = full.json()
    assert len(payload["assets"]) == 1
    assert {"assets", "jobs", "readings", "faults", "server_time"} <= payload.keys()

    # A future watermark yields nothing…
    future = client.get("/sync/pull", headers=admin_auth["headers"],
                        params={"since": "2099-01-01T00:00:00+00:00"})
    assert future.json()["assets"] == []
    # …a past watermark yields the asset.
    past = client.get("/sync/pull", headers=admin_auth["headers"],
                      params={"since": "2020-01-01T00:00:00+00:00"})
    assert len(past.json()["assets"]) == 1


def test_pull_is_company_scoped(client, admin_auth, other_company_auth):
    client.post("/sync/push", headers=admin_auth["headers"], json={"assets": [_asset_item()]})
    # The other company pulls its own (empty) dataset.
    other = client.get("/sync/pull", headers=other_company_auth["headers"])
    assert other.json()["assets"] == []
