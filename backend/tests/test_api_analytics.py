"""API integration tests for the analytics (Digital Twin Lite) endpoints.

The weather provider dependency is overridden with a deterministic clear-sky
day, so expected yield is reproducible and no network is touched. Requires the
full stack (FastAPI/SQLAlchemy/Pydantic); collected by pytest in the QA env.
"""

from __future__ import annotations

import math
from datetime import date, datetime, timedelta, timezone

from app.analytics import solar_geometry as sg
from app.analytics.weather import StaticWeatherProvider, WeatherSample
from app.deps import get_weather_provider
from tests.conftest import make_asset_payload

CLEAR_SKY_DATE = date(2026, 8, 20)
ASSET_LAT, ASSET_LON = -0.17, 34.92  # matches make_asset_payload defaults


def _haurwitz_ghi(zenith_deg: float) -> float:
    cos_z = math.cos(math.radians(zenith_deg))
    return 1098.0 * cos_z * math.exp(-0.059 / cos_z) if cos_z > 0 else 0.0


def _clear_sky_samples(day: date, lat: float, lon: float) -> list[WeatherSample]:
    base = datetime(day.year, day.month, day.day, 0, 0, tzinfo=timezone.utc)
    out = []
    for h in range(24):
        ts = base + timedelta(hours=h)
        zen, _ = sg.solar_position(ts, lat, lon)
        out.append(WeatherSample(ts, _haurwitz_ghi(zen), 26.0))
    return out


def _seed_weather(client) -> None:
    samples = _clear_sky_samples(CLEAR_SKY_DATE, ASSET_LAT, ASSET_LON)
    client.app.dependency_overrides[get_weather_provider] = \
        lambda: StaticWeatherProvider(list(samples))


def _create_asset(client, headers, **overrides) -> str:
    resp = client.post("/assets", headers=headers, json=make_asset_payload(**overrides))
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def _expected_ac(client, headers, asset_id) -> float:
    """Probe with zero energy to read the modelled expected AC yield."""
    resp = client.post(
        f"/analytics/assets/{asset_id}",
        headers=headers,
        json={"energy_kwh": 0.0, "reading_date": CLEAR_SKY_DATE.isoformat()},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["expected_ac_kwh"]


# --- Happy path ------------------------------------------------------------
def test_analyze_asset_healthy(client, admin_auth):
    _seed_weather(client)
    h = admin_auth["headers"]
    asset_id = _create_asset(client, h)
    expected = _expected_ac(client, h, asset_id)
    assert expected > 0

    resp = client.post(
        f"/analytics/assets/{asset_id}",
        headers=h,
        json={"energy_kwh": expected, "reading_date": CLEAR_SKY_DATE.isoformat()},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["severity"] == "healthy"
    assert body["asset_id"] == asset_id
    assert abs(body["health_ratio"] - 1.0) < 0.01
    assert body["sample_count"] == 24
    assert 0.6 <= body["performance_ratio_iec"] <= 0.85
    assert body["fault_id"] is None
    assert body["window_start"] is not None and body["window_end"] is not None


def test_analyze_asset_severe_persists_fault(client, admin_auth):
    _seed_weather(client)
    h = admin_auth["headers"]
    asset_id = _create_asset(client, h)
    expected = _expected_ac(client, h, asset_id)

    resp = client.post(
        f"/analytics/assets/{asset_id}",
        headers=h,
        json={
            "energy_kwh": expected * 0.4,
            "reading_date": CLEAR_SKY_DATE.isoformat(),
            "persist_fault": True,
        },
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["severity"] == "severe"
    assert body["likely_causes"]
    assert body["fault_id"] is not None

    faults = client.get(f"/faults?asset_id={asset_id}", headers=h)
    assert faults.status_code == 200
    rows = faults.json()
    assert len(rows) == 1
    assert rows[0]["source"] == "system"
    assert rows[0]["severity"] == "critical"
    assert rows[0]["category"] == "inverter_fault"
    assert rows[0]["id"] == body["fault_id"]


def test_healthy_with_persist_flag_creates_no_fault(client, admin_auth):
    _seed_weather(client)
    h = admin_auth["headers"]
    asset_id = _create_asset(client, h)
    expected = _expected_ac(client, h, asset_id)

    resp = client.post(
        f"/analytics/assets/{asset_id}",
        headers=h,
        json={
            "energy_kwh": expected,
            "reading_date": CLEAR_SKY_DATE.isoformat(),
            "persist_fault": True,
        },
    )
    assert resp.status_code == 200
    assert resp.json()["fault_id"] is None
    assert client.get(f"/faults?asset_id={asset_id}", headers=h).json() == []


def test_analyze_stored_reading(client, admin_auth):
    _seed_weather(client)
    h = admin_auth["headers"]
    asset_id = _create_asset(client, h)
    expected = _expected_ac(client, h, asset_id)

    # Store a reading matching the expected yield, then analyse it by id.
    created = client.post(
        "/readings",
        headers=h,
        json={
            "asset_id": asset_id,
            "reading_date": CLEAR_SKY_DATE.isoformat(),
            "energy_kwh": expected,
        },
    )
    assert created.status_code == 201, created.text
    reading_id = created.json()["id"]

    resp = client.post(f"/analytics/readings/{reading_id}", headers=h)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["reading_id"] == reading_id
    assert body["asset_id"] == asset_id
    assert body["severity"] == "healthy"


# --- Auth, scoping, validation --------------------------------------------
def test_analyze_requires_auth(client, admin_auth):
    _seed_weather(client)
    asset_id = _create_asset(client, admin_auth["headers"])
    resp = client.post(
        f"/analytics/assets/{asset_id}",
        json={"energy_kwh": 1.0, "reading_date": CLEAR_SKY_DATE.isoformat()},
    )
    assert resp.status_code == 401


def test_analyze_missing_asset_404(client, admin_auth):
    _seed_weather(client)
    resp = client.post(
        "/analytics/assets/does-not-exist",
        headers=admin_auth["headers"],
        json={"energy_kwh": 1.0, "reading_date": CLEAR_SKY_DATE.isoformat()},
    )
    assert resp.status_code == 404


def test_analyze_missing_reading_404(client, admin_auth):
    _seed_weather(client)
    resp = client.post("/analytics/readings/nope", headers=admin_auth["headers"])
    assert resp.status_code == 404


def test_analyze_cross_company_asset_404(client, admin_auth, other_company_auth):
    _seed_weather(client)
    foreign_asset = _create_asset(client, other_company_auth["headers"])
    resp = client.post(
        f"/analytics/assets/{foreign_asset}",
        headers=admin_auth["headers"],
        json={"energy_kwh": 1.0, "reading_date": CLEAR_SKY_DATE.isoformat()},
    )
    assert resp.status_code == 404


def test_technician_can_analyze(client, admin_auth, technician_auth):
    _seed_weather(client)
    asset_id = _create_asset(client, admin_auth["headers"])
    expected = _expected_ac(client, technician_auth["headers"], asset_id)
    resp = client.post(
        f"/analytics/assets/{asset_id}",
        headers=technician_auth["headers"],
        json={"energy_kwh": expected, "reading_date": CLEAR_SKY_DATE.isoformat()},
    )
    assert resp.status_code == 200
    assert resp.json()["severity"] == "healthy"


def test_analyze_validation_errors(client, admin_auth):
    _seed_weather(client)
    asset_id = _create_asset(client, admin_auth["headers"])
    h = admin_auth["headers"]
    neg = client.post(
        f"/analytics/assets/{asset_id}",
        headers=h,
        json={"energy_kwh": -5.0, "reading_date": CLEAR_SKY_DATE.isoformat()},
    )
    assert neg.status_code == 422
    zero_days = client.post(
        f"/analytics/assets/{asset_id}",
        headers=h,
        json={"energy_kwh": 5.0, "reading_date": CLEAR_SKY_DATE.isoformat(),
              "period_days": 0},
    )
    assert zero_days.status_code == 422
