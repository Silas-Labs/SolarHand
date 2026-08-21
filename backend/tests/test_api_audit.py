"""API tests: audit-trail browsing and hash-chain integrity verification."""

from __future__ import annotations

from app.models import AuditLog
from tests.conftest import make_asset_payload


def test_operations_produce_a_valid_chain(client, admin_auth):
    # Registration already logged company+user creation; add an asset event.
    client.post("/assets", headers=admin_auth["headers"], json=make_asset_payload())

    verify = client.get("/audit/verify", headers=admin_auth["headers"])
    assert verify.status_code == 200, verify.text
    body = verify.json()
    assert body["valid"] is True
    assert body["entries"] >= 3  # company create, user create, asset create
    assert body["first_bad_hash"] is None


def test_audit_list_is_admin_only(client, admin_auth, technician_auth):
    assert client.get("/audit", headers=admin_auth["headers"]).status_code == 200
    assert client.get("/audit", headers=technician_auth["headers"]).status_code == 403
    assert client.get("/audit/verify", headers=technician_auth["headers"]).status_code == 403


def test_audit_filter_by_entity_type(client, admin_auth):
    client.post("/assets", headers=admin_auth["headers"], json=make_asset_payload())
    resp = client.get("/audit", headers=admin_auth["headers"],
                      params={"entity_type": "asset"})
    assert resp.status_code == 200
    rows = resp.json()
    assert rows and all(r["entity_type"] == "asset" for r in rows)


def test_tampering_breaks_the_chain(client, admin_auth, db):
    client.post("/assets", headers=admin_auth["headers"], json=make_asset_payload())
    assert client.get("/audit/verify", headers=admin_auth["headers"]).json()["valid"] is True

    # Tamper directly in the database: rewrite a stored payload without
    # recomputing its hash. The chain must now fail verification.
    row = db.query(AuditLog).order_by(AuditLog.id).first()
    row.payload = {**row.payload, "tampered": True}
    db.commit()

    after = client.get("/audit/verify", headers=admin_auth["headers"]).json()
    assert after["valid"] is False
    assert after["first_bad_hash"] is not None


def test_chain_survives_many_writes(client, admin_auth):
    # A burst of writes across entities keeps the chain consistent.
    asset = client.post("/assets", headers=admin_auth["headers"],
                        json=make_asset_payload()).json()
    for i in range(5):
        client.post("/readings", headers=admin_auth["headers"],
                    json={"asset_id": asset["id"], "reading_date": "2026-08-01",
                          "energy_kwh": float(i)})
    verify = client.get("/audit/verify", headers=admin_auth["headers"]).json()
    assert verify["valid"] is True
