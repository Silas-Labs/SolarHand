"""API tests: registration, login, identity, and role guards."""

from __future__ import annotations


def test_register_creates_company_and_admin(client):
    resp = client.post(
        "/auth/register",
        json={
            "company": {"name": "Nyanza Solar", "county": "Kisumu"},
            "admin": {
                "email": "Owner@Nyanza.CO",
                "full_name": "Owino Owner",
                "password": "password123",
            },
        },
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["company"]["name"] == "Nyanza Solar"
    assert body["user"]["role"] == "admin"
    # Email is normalised to lower-case on the way in.
    assert body["user"]["email"] == "owner@nyanza.co"
    assert body["user"]["company_id"] == body["company"]["id"]


def test_register_duplicate_email_conflicts(client):
    # NB: use a real TLD, not a reserved one (.test/.example/.invalid are
    # rejected by email-validator), so the request passes validation and
    # actually reaches the duplicate-email (409) path this test guards.
    payload = {
        "company": {"name": "Dup Co"},
        "admin": {
            "email": "dup@dupco.co",
            "full_name": "Dee Up",
            "password": "password123",
        },
    }
    assert client.post("/auth/register", json=payload).status_code == 201
    again = client.post("/auth/register", json=payload)
    assert again.status_code == 409


def test_register_rejects_short_password(client):
    resp = client.post(
        "/auth/register",
        json={
            "company": {"name": "Weak Co"},
            # Real TLD so the password (below min length) is the *only*
            # invalid field, keeping this test focused on password rules.
            "admin": {"email": "weak@weakco.co", "full_name": "W", "password": "short"},
        },
    )
    assert resp.status_code == 422


def test_login_success_and_me(client, admin_auth):
    login = client.post(
        "/auth/login",
        data={"username": "admin@kisumusolar.co", "password": "password123"},
    )
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "admin@kisumusolar.co"
    assert me.json()["role"] == "admin"


def test_login_is_case_insensitive_on_email(client, admin_auth):
    login = client.post(
        "/auth/login",
        data={"username": "ADMIN@KISUMUSOLAR.CO", "password": "password123"},
    )
    assert login.status_code == 200


def test_login_wrong_password_401(client, admin_auth):
    login = client.post(
        "/auth/login",
        data={"username": "admin@kisumusolar.co", "password": "wrongpassword"},
    )
    assert login.status_code == 401


def test_login_unknown_user_401(client):
    login = client.post(
        "/auth/login",
        data={"username": "ghost@nowhere.test", "password": "password123"},
    )
    assert login.status_code == 401


def test_me_requires_token(client):
    assert client.get("/auth/me").status_code == 401


def test_me_rejects_garbage_token(client):
    resp = client.get("/auth/me", headers={"Authorization": "Bearer not.a.jwt"})
    assert resp.status_code == 401


def test_technician_cannot_create_users(client, technician_auth):
    resp = client.post(
        "/users",
        headers=technician_auth["headers"],
        json={
            "email": "another@kisumusolar.co",
            "full_name": "No Access",
            "password": "password123",
            "role": "technician",
        },
    )
    assert resp.status_code == 403


def test_admin_lists_only_own_company_users(client, admin_auth, technician_auth,
                                            other_company_auth):
    # Admin of company A sees exactly its two users (admin + technician).
    resp = client.get("/users", headers=admin_auth["headers"])
    assert resp.status_code == 200
    emails = {u["email"] for u in resp.json()}
    assert emails == {"admin@kisumusolar.co", "tech@kisumusolar.co"}


def test_admin_cannot_fetch_other_company_user(client, admin_auth, other_company_auth):
    other_user_id = other_company_auth["user"]["id"]
    resp = client.get(f"/users/{other_user_id}", headers=admin_auth["headers"])
    assert resp.status_code == 404


def test_deactivated_user_cannot_authenticate(client, admin_auth, technician_auth):
    tech_id = technician_auth["user"]["id"]
    patch = client.patch(
        f"/users/{tech_id}",
        headers=admin_auth["headers"],
        json={"is_active": False},
    )
    assert patch.status_code == 200
    # Existing token is now rejected (user resolved as inactive).
    me = client.get("/auth/me", headers=technician_auth["headers"])
    assert me.status_code == 401
    # And a fresh login is refused.
    login = client.post(
        "/auth/login",
        data={"username": "tech@kisumusolar.co", "password": "password123"},
    )
    assert login.status_code == 403
