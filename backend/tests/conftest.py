"""Pytest fixtures for API/integration tests.

Each test gets a fresh in-memory SQLite database (StaticPool so the single
connection is shared across the app's threadpool). The app's ``get_db`` is
overridden to use it. We deliberately construct ``TestClient(app)`` *without*
the context-manager form so the startup hook (which would create tables on the
real on-disk engine) does not fire.

These tests require the full stack (FastAPI, SQLAlchemy, Pydantic) and run in
an environment with dependencies installed:  ``pytest`` from ``backend/``.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401  (register models on Base.metadata)
from app.database import Base, get_db, install_sqlite_savepoint_support
from app.main import create_app


@pytest.fixture()
def db_session_factory():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    # Match production: reliable SAVEPOINT support on pysqlite (the sync
    # endpoint's per-item isolation depends on it).
    install_sqlite_savepoint_support(engine)
    Base.metadata.create_all(engine)
    TestingSessionLocal = sessionmaker(
        bind=engine, autoflush=False, autocommit=False, expire_on_commit=False
    )
    try:
        yield TestingSessionLocal
    finally:
        Base.metadata.drop_all(engine)
        engine.dispose()


@pytest.fixture()
def client(db_session_factory):
    def override_get_db():
        db = db_session_factory()
        try:
            yield db
        finally:
            db.close()

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)


@pytest.fixture()
def db(db_session_factory):
    """A direct session for arrange/assert against the same DB the app uses."""
    session = db_session_factory()
    try:
        yield session
    finally:
        session.close()


# --- Auth helpers ----------------------------------------------------------
def _register(client: TestClient, *, company_name: str, email: str) -> dict:
    payload = {
        "company": {"name": company_name, "county": "Kisumu"},
        "admin": {
            "email": email,
            "full_name": "Ada Admin",
            "password": "password123",
        },
    }
    resp = client.post("/auth/register", json=payload)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    return {
        "token": data["access_token"],
        "headers": {"Authorization": f"Bearer {data['access_token']}"},
        "company_id": data["company"]["id"],
        "user": data["user"],
    }


@pytest.fixture()
def admin_auth(client):
    return _register(client, company_name="Kisumu Solar Co", email="admin@kisumusolar.co")


@pytest.fixture()
def other_company_auth(client):
    """A second, unrelated company — used to prove cross-company isolation."""
    return _register(client, company_name="Rival Solar Ltd", email="boss@rival.co")


@pytest.fixture()
def technician_auth(client, admin_auth):
    """Create a technician inside the admin's company and log in as them."""
    resp = client.post(
        "/users",
        headers=admin_auth["headers"],
        json={
            "email": "tech@kisumusolar.co",
            "full_name": "Tumaini Tech",
            "password": "password123",
            "role": "technician",
        },
    )
    assert resp.status_code == 201, resp.text
    user = resp.json()
    login = client.post(
        "/auth/login",
        data={"username": "tech@kisumusolar.co", "password": "password123"},
    )
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    return {
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"},
        "user": user,
    }


def make_asset_payload(**overrides) -> dict:
    payload = {
        "customer_name": "Otieno Farm",
        "location_name": "Ahero",
        "county": "Kisumu",
        "latitude": -0.17,
        "longitude": 34.92,
        "tilt_deg": 10,
        "azimuth_deg": 0,
        "system_kwp": 5.0,
    }
    payload.update(overrides)
    return payload
