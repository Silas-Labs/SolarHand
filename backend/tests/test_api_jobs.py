"""API tests: jobs lifecycle, assignment, filters, company scoping."""

from __future__ import annotations

from tests.conftest import make_asset_payload


def _asset(client, headers, **overrides):
    return client.post("/assets", headers=headers,
                       json=make_asset_payload(**overrides)).json()


def _job_payload(asset_id, **overrides):
    payload = {
        "asset_id": asset_id,
        "type": "inspection",
        "title": "Quarterly inspection",
        "priority": "normal",
    }
    payload.update(overrides)
    return payload


def test_create_job_defaults_to_pending(client, admin_auth):
    asset = _asset(client, admin_auth["headers"])
    resp = client.post("/jobs", headers=admin_auth["headers"],
                       json=_job_payload(asset["id"]))
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["status"] == "pending"
    assert body["created_by"] == admin_auth["user"]["id"]
    assert body["completed_at"] is None


def test_create_job_on_foreign_asset_404(client, admin_auth, other_company_auth):
    asset = _asset(client, admin_auth["headers"])
    resp = client.post("/jobs", headers=other_company_auth["headers"],
                       json=_job_payload(asset["id"]))
    assert resp.status_code == 404


def test_assign_job_to_company_member(client, admin_auth, technician_auth):
    asset = _asset(client, admin_auth["headers"])
    resp = client.post(
        "/jobs", headers=admin_auth["headers"],
        json=_job_payload(asset["id"], assigned_to=technician_auth["user"]["id"]),
    )
    assert resp.status_code == 201
    assert resp.json()["assigned_to"] == technician_auth["user"]["id"]


def test_assign_job_to_outsider_rejected(client, admin_auth, other_company_auth):
    asset = _asset(client, admin_auth["headers"])
    resp = client.post(
        "/jobs", headers=admin_auth["headers"],
        json=_job_payload(asset["id"], assigned_to=other_company_auth["user"]["id"]),
    )
    assert resp.status_code == 400


def test_marking_done_stamps_completed_at(client, admin_auth):
    asset = _asset(client, admin_auth["headers"])
    job = client.post("/jobs", headers=admin_auth["headers"],
                      json=_job_payload(asset["id"])).json()
    patched = client.patch(f"/jobs/{job['id']}", headers=admin_auth["headers"],
                           json={"status": "done"})
    assert patched.status_code == 200
    assert patched.json()["status"] == "done"
    assert patched.json()["completed_at"] is not None


def test_mine_filter(client, admin_auth, technician_auth):
    asset = _asset(client, admin_auth["headers"])
    # One job assigned to the technician, one unassigned.
    client.post("/jobs", headers=admin_auth["headers"],
                json=_job_payload(asset["id"], assigned_to=technician_auth["user"]["id"],
                                  title="Tech job"))
    client.post("/jobs", headers=admin_auth["headers"],
                json=_job_payload(asset["id"], title="Nobody's job"))

    mine = client.get("/jobs", headers=technician_auth["headers"], params={"mine": "true"})
    assert mine.status_code == 200
    titles = [j["title"] for j in mine.json()]
    assert titles == ["Tech job"]


def test_status_and_asset_filters(client, admin_auth):
    a1 = _asset(client, admin_auth["headers"], customer_name="One")
    a2 = _asset(client, admin_auth["headers"], customer_name="Two")
    client.post("/jobs", headers=admin_auth["headers"],
                json=_job_payload(a1["id"], status="pending"))
    j2 = client.post("/jobs", headers=admin_auth["headers"],
                     json=_job_payload(a2["id"])).json()
    client.patch(f"/jobs/{j2['id']}", headers=admin_auth["headers"],
                 json={"status": "in_progress"})

    by_status = client.get("/jobs", headers=admin_auth["headers"],
                           params={"status": "in_progress"}).json()
    assert len(by_status) == 1 and by_status[0]["id"] == j2["id"]

    by_asset = client.get("/jobs", headers=admin_auth["headers"],
                          params={"asset_id": a1["id"]}).json()
    assert len(by_asset) == 1 and by_asset[0]["asset_id"] == a1["id"]


def test_technician_cannot_delete_job(client, admin_auth, technician_auth):
    asset = _asset(client, admin_auth["headers"])
    job = client.post("/jobs", headers=admin_auth["headers"],
                      json=_job_payload(asset["id"])).json()
    assert client.delete(f"/jobs/{job['id']}",
                         headers=technician_auth["headers"]).status_code == 403
    assert client.delete(f"/jobs/{job['id']}",
                         headers=admin_auth["headers"]).status_code == 204
    assert client.get(f"/jobs/{job['id']}",
                      headers=admin_auth["headers"]).status_code == 404


def test_foreign_job_is_not_readable(client, admin_auth, other_company_auth):
    asset = _asset(client, admin_auth["headers"])
    job = client.post("/jobs", headers=admin_auth["headers"],
                      json=_job_payload(asset["id"])).json()
    assert client.get(f"/jobs/{job['id']}",
                      headers=other_company_auth["headers"]).status_code == 404
