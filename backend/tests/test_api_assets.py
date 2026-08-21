"""API tests: asset registry, components, company scoping."""

from __future__ import annotations

from tests.conftest import make_asset_payload


def _create_asset(client, headers, **overrides):
    resp = client.post("/assets", headers=headers, json=make_asset_payload(**overrides))
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_create_and_get_asset(client, admin_auth):
    asset = _create_asset(client, admin_auth["headers"], customer_name="Achieng Home")
    assert asset["customer_name"] == "Achieng Home"
    assert asset["company_id"] == admin_auth["company_id"]
    assert asset["status"] == "active"

    got = client.get(f"/assets/{asset['id']}", headers=admin_auth["headers"])
    assert got.status_code == 200
    assert got.json()["id"] == asset["id"]
    assert got.json()["components"] == []  # AssetDetail includes components


def test_create_asset_requires_auth(client):
    resp = client.post("/assets", json=make_asset_payload())
    assert resp.status_code == 401


def test_create_asset_validates_coordinates(client, admin_auth):
    resp = client.post(
        "/assets", headers=admin_auth["headers"],
        json=make_asset_payload(latitude=999),
    )
    assert resp.status_code == 422


def test_create_asset_rejects_nonpositive_kwp(client, admin_auth):
    resp = client.post(
        "/assets", headers=admin_auth["headers"],
        json=make_asset_payload(system_kwp=0),
    )
    assert resp.status_code == 422


def test_list_assets_filters_by_status(client, admin_auth):
    _create_asset(client, admin_auth["headers"], customer_name="A", status="active")
    _create_asset(client, admin_auth["headers"], customer_name="M", status="maintenance")
    resp = client.get("/assets", headers=admin_auth["headers"], params={"status": "maintenance"})
    assert resp.status_code == 200
    rows = resp.json()
    assert len(rows) == 1 and rows[0]["customer_name"] == "M"


def test_update_asset(client, admin_auth):
    asset = _create_asset(client, admin_auth["headers"])
    resp = client.patch(
        f"/assets/{asset['id']}", headers=admin_auth["headers"],
        json={"status": "maintenance", "notes": "panel cleaning due"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "maintenance"
    assert resp.json()["notes"] == "panel cleaning due"


def test_client_supplied_id_is_honoured_then_conflicts(client, admin_auth):
    cid = "11111111-1111-4111-8111-111111111111"
    first = client.post(
        "/assets", headers=admin_auth["headers"],
        json=make_asset_payload(id=cid),
    )
    assert first.status_code == 201
    assert first.json()["id"] == cid
    # Re-posting the same id is a conflict (not a silent overwrite).
    dup = client.post(
        "/assets", headers=admin_auth["headers"],
        json=make_asset_payload(id=cid),
    )
    assert dup.status_code == 409


def test_technician_can_create_but_not_delete_asset(client, admin_auth, technician_auth):
    asset = _create_asset(client, technician_auth["headers"], customer_name="Field Reg")
    # Technician delete is forbidden…
    forbidden = client.delete(f"/assets/{asset['id']}", headers=technician_auth["headers"])
    assert forbidden.status_code == 403
    # …admin delete succeeds.
    ok = client.delete(f"/assets/{asset['id']}", headers=admin_auth["headers"])
    assert ok.status_code == 204
    assert client.get(f"/assets/{asset['id']}", headers=admin_auth["headers"]).status_code == 404


def test_cross_company_asset_is_invisible(client, admin_auth, other_company_auth):
    asset = _create_asset(client, admin_auth["headers"])
    # The other company must not see or touch it.
    assert client.get(f"/assets/{asset['id']}",
                      headers=other_company_auth["headers"]).status_code == 404
    assert client.patch(f"/assets/{asset['id']}", headers=other_company_auth["headers"],
                        json={"status": "inactive"}).status_code == 404
    assert client.delete(f"/assets/{asset['id']}",
                         headers=other_company_auth["headers"]).status_code == 404
    # And it's absent from their list.
    listed = client.get("/assets", headers=other_company_auth["headers"]).json()
    assert listed == []


# --- Components ------------------------------------------------------------
def test_add_list_and_delete_components(client, admin_auth):
    asset = _create_asset(client, admin_auth["headers"])
    add = client.post(
        f"/assets/{asset['id']}/components", headers=admin_auth["headers"],
        json={"kind": "module", "make": "JA Solar", "rating_value": 550,
              "rating_unit": "Wp", "quantity": 10},
    )
    assert add.status_code == 201, add.text
    comp = add.json()
    assert comp["kind"] == "module" and comp["quantity"] == 10

    # Now the asset detail carries the component.
    detail = client.get(f"/assets/{asset['id']}", headers=admin_auth["headers"]).json()
    assert len(detail["components"]) == 1

    listed = client.get(f"/assets/{asset['id']}/components", headers=admin_auth["headers"])
    assert listed.status_code == 200 and len(listed.json()) == 1

    # Deleting a component is admin-only.
    deleted = client.delete(
        f"/assets/{asset['id']}/components/{comp['id']}",
        headers=admin_auth["headers"],
    )
    assert deleted.status_code == 204
    empty = client.get(f"/assets/{asset['id']}/components", headers=admin_auth["headers"])
    assert empty.json() == []


def test_technician_cannot_delete_component(client, admin_auth, technician_auth):
    asset = _create_asset(client, admin_auth["headers"])
    comp = client.post(
        f"/assets/{asset['id']}/components", headers=admin_auth["headers"],
        json={"kind": "inverter", "make": "Growatt"},
    ).json()
    forbidden = client.delete(
        f"/assets/{asset['id']}/components/{comp['id']}",
        headers=technician_auth["headers"],
    )
    assert forbidden.status_code == 403


def test_component_on_missing_asset_404(client, admin_auth):
    resp = client.post(
        "/assets/does-not-exist/components", headers=admin_auth["headers"],
        json={"kind": "inverter"},
    )
    assert resp.status_code == 404
