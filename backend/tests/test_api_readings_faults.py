"""API tests: meter readings and fault reports."""

from __future__ import annotations

from tests.conftest import make_asset_payload


def _asset(client, headers, **overrides):
    return client.post("/assets", headers=headers,
                       json=make_asset_payload(**overrides)).json()


# --- Readings --------------------------------------------------------------
def test_create_and_list_readings(client, admin_auth):
    asset = _asset(client, admin_auth["headers"])
    resp = client.post(
        "/readings", headers=admin_auth["headers"],
        json={"asset_id": asset["id"], "reading_date": "2026-08-01",
              "energy_kwh": 21.5, "period_days": 7},
    )
    assert resp.status_code == 201, resp.text
    reading = resp.json()
    assert reading["energy_kwh"] == 21.5
    assert reading["recorded_by"] == admin_auth["user"]["id"]

    listed = client.get("/readings", headers=admin_auth["headers"],
                        params={"asset_id": asset["id"]})
    assert listed.status_code == 200 and len(listed.json()) == 1


def test_reading_rejects_negative_energy(client, admin_auth):
    asset = _asset(client, admin_auth["headers"])
    resp = client.post(
        "/readings", headers=admin_auth["headers"],
        json={"asset_id": asset["id"], "reading_date": "2026-08-01", "energy_kwh": -5},
    )
    assert resp.status_code == 422


def test_reading_on_foreign_asset_404(client, admin_auth, other_company_auth):
    asset = _asset(client, admin_auth["headers"])
    resp = client.post(
        "/readings", headers=other_company_auth["headers"],
        json={"asset_id": asset["id"], "reading_date": "2026-08-01", "energy_kwh": 10},
    )
    assert resp.status_code == 404


def test_get_reading_by_id_scoped(client, admin_auth, other_company_auth):
    asset = _asset(client, admin_auth["headers"])
    reading = client.post(
        "/readings", headers=admin_auth["headers"],
        json={"asset_id": asset["id"], "reading_date": "2026-08-01", "energy_kwh": 10},
    ).json()
    assert client.get(f"/readings/{reading['id']}",
                      headers=admin_auth["headers"]).status_code == 200
    assert client.get(f"/readings/{reading['id']}",
                      headers=other_company_auth["headers"]).status_code == 404


# --- Faults ----------------------------------------------------------------
def test_create_list_and_resolve_fault(client, admin_auth):
    asset = _asset(client, admin_auth["headers"])
    created = client.post(
        "/faults", headers=admin_auth["headers"],
        json={"asset_id": asset["id"], "category": "soiling", "severity": "warning",
              "description": "Dust build-up on array"},
    )
    assert created.status_code == 201, created.text
    fault = created.json()
    assert fault["resolved"] is False
    assert fault["source"] == "technician"  # default

    # Filter unresolved.
    open_faults = client.get("/faults", headers=admin_auth["headers"],
                             params={"resolved": "false"})
    assert len(open_faults.json()) == 1

    resolved = client.patch(f"/faults/{fault['id']}/resolve", headers=admin_auth["headers"])
    assert resolved.status_code == 200
    assert resolved.json()["resolved"] is True

    # Now it's filtered out of the unresolved list.
    still_open = client.get("/faults", headers=admin_auth["headers"],
                            params={"resolved": "false"})
    assert still_open.json() == []


def test_fault_on_foreign_asset_404(client, admin_auth, other_company_auth):
    asset = _asset(client, admin_auth["headers"])
    resp = client.post(
        "/faults", headers=other_company_auth["headers"],
        json={"asset_id": asset["id"], "category": "shading"},
    )
    assert resp.status_code == 404


def test_resolve_foreign_fault_404(client, admin_auth, other_company_auth):
    asset = _asset(client, admin_auth["headers"])
    fault = client.post(
        "/faults", headers=admin_auth["headers"],
        json={"asset_id": asset["id"], "category": "shading"},
    ).json()
    assert client.patch(f"/faults/{fault['id']}/resolve",
                        headers=other_company_auth["headers"]).status_code == 404
