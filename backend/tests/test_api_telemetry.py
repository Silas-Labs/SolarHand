"""API integration tests for the telemetry ingestion, rollup & forecast surface.

These exercise the *connected-site* path end to end against the real app:
gateway-key ingestion, device→asset resolution, adapter selection, de-dup,
live channel diagnosis, the daily rollup into scored ``Reading(source=
"telemetry")`` rows, and the trend-forecast endpoint. The weather provider is
overridden with a deterministic clear-sky day (same technique as
``test_api_analytics``) so physics is reproducible and no network is touched.

A key regression lives here too: the same energy, fed through the *manual*
analytics path and the *telemetry* rollup, must produce an identical health
ratio and severity — telemetry is just another origin of a reading, not a second
analytics path.

Requires the full stack (FastAPI/SQLAlchemy/Pydantic); collected by pytest in
the QA env. (The dependency-free diagnosis/forecast/adapter/rollup/simulator
logic is covered separately, and sandbox-runnably, in ``test_telemetry_units``.)
"""

from __future__ import annotations

import math
from datetime import date, datetime, timedelta, timezone

from app.analytics import solar_geometry as sg
from app.analytics.weather import StaticWeatherProvider, WeatherSample
from app.config import settings
from app.deps import get_weather_provider
from tests.conftest import make_asset_payload

UTC = timezone.utc
CLEAR_SKY_DATE = date(2026, 8, 20)          # a fixed, completed past day
ASSET_LAT, ASSET_LON = -0.17, 34.92         # matches make_asset_payload defaults
DEVICE_ID = "GW-CLINIC-01"


# --- deterministic weather (clear-sky day), mirroring test_api_analytics ---
def _haurwitz_ghi(zenith_deg: float) -> float:
    cos_z = math.cos(math.radians(zenith_deg))
    return 1098.0 * cos_z * math.exp(-0.059 / cos_z) if cos_z > 0 else 0.0


def _clear_sky_samples(day: date, lat: float, lon: float) -> list[WeatherSample]:
    base = datetime(day.year, day.month, day.day, 0, 0, tzinfo=UTC)
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


# --- small helpers ---------------------------------------------------------
def _gateway_headers() -> dict:
    # Read the live setting so the header always matches require_gateway_key,
    # regardless of environment overrides.
    return {"X-Gateway-Key": settings.gateway_key}


def _create_connected_asset(client, headers, device_id: str = DEVICE_ID,
                            **overrides) -> str:
    payload = make_asset_payload(telemetry_enabled=True, device_id=device_id,
                                 **overrides)
    resp = client.post("/assets", headers=headers, json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def _ts(day: date, hour: int, minute: int = 0) -> str:
    return datetime(day.year, day.month, day.day, hour, minute,
                    tzinfo=UTC).isoformat().replace("+00:00", "Z")


def _post_batch(client, device_id: str, samples: list[dict], *,
                fmt: str = "canonical", asset_id: str | None = None,
                headers: dict | None = None):
    batch: dict = {"device_id": device_id, "format": fmt, "samples": samples}
    if asset_id:
        batch["asset_id"] = asset_id
    return client.post("/telemetry", headers=headers or _gateway_headers(),
                       json=batch)


def _energy_samples(day: date, total: float, n: int = 3) -> list[dict]:
    """`n` channel-free samples across the day whose energy sums to `total`.

    No diagnostic channels, so ingestion raises no channel fault — the rollup's
    faults are then purely energy-based, isolating what each test checks.
    """
    per = total / n
    return [{"ts": _ts(day, 6 + 3 * i), "energy_kwh": per} for i in range(n)]


def _expected_ac(client, headers, asset_id: str) -> float:
    """Probe with zero energy to read the modelled expected AC yield."""
    resp = client.post(
        f"/analytics/assets/{asset_id}",
        headers=headers,
        json={"energy_kwh": 0.0, "reading_date": CLEAR_SKY_DATE.isoformat()},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["expected_ac_kwh"]


# ===========================================================================
# Formats + gateway-key auth
# ===========================================================================
def test_formats_lists_canonical_and_stub(client):
    resp = client.get("/telemetry/formats")
    assert resp.status_code == 200
    assert resp.json() == {"formats": ["canonical", "sunspec"]}


def test_ingest_requires_gateway_key(client, admin_auth):
    _create_connected_asset(client, admin_auth["headers"])
    sample = [{"ts": _ts(CLEAR_SKY_DATE, 9), "energy_kwh": 1.0}]
    # No key at all.
    no_key = client.post("/telemetry", json={"device_id": DEVICE_ID,
                                             "format": "canonical", "samples": sample})
    assert no_key.status_code == 401
    # Wrong key.
    wrong = _post_batch(client, DEVICE_ID, sample,
                        headers={"X-Gateway-Key": "not-the-key"})
    assert wrong.status_code == 401


def test_ingest_happy_path_accepts_samples(client, admin_auth):
    asset_id = _create_connected_asset(client, admin_auth["headers"])
    resp = _post_batch(client, DEVICE_ID, _energy_samples(CLEAR_SKY_DATE, 6.0, n=3))
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["asset_id"] == asset_id
    assert body["device_id"] == DEVICE_ID
    assert body["accepted"] == 3
    assert body["duplicates"] == 0
    assert body["diagnosis_fault_id"] is None  # no channel anomaly -> no fault


# ===========================================================================
# Device resolution + adapter selection
# ===========================================================================
def test_ingest_unknown_device_404(client, admin_auth):
    _create_connected_asset(client, admin_auth["headers"], device_id="GW-A")
    resp = _post_batch(client, "GW-UNREGISTERED",
                       [{"ts": _ts(CLEAR_SKY_DATE, 9), "energy_kwh": 1.0}])
    assert resp.status_code == 404


def test_ingest_asset_device_mismatch_409(client, admin_auth):
    asset_id = _create_connected_asset(client, admin_auth["headers"], device_id="GW-A")
    resp = _post_batch(client, "GW-WRONG",
                       [{"ts": _ts(CLEAR_SKY_DATE, 9), "energy_kwh": 1.0}],
                       asset_id=asset_id)
    assert resp.status_code == 409


def test_ingest_unknown_format_422(client, admin_auth):
    _create_connected_asset(client, admin_auth["headers"])
    resp = _post_batch(client, DEVICE_ID,
                       [{"ts": _ts(CLEAR_SKY_DATE, 9), "energy_kwh": 1.0}],
                       fmt="totally-made-up")
    assert resp.status_code == 422


def test_ingest_sunspec_stub_501(client, admin_auth):
    _create_connected_asset(client, admin_auth["headers"])
    resp = _post_batch(client, DEVICE_ID,
                       [{"ts": _ts(CLEAR_SKY_DATE, 9), "energy_kwh": 1.0}],
                       fmt="sunspec")
    assert resp.status_code == 501


# ===========================================================================
# De-duplication on (asset_id, ts)
# ===========================================================================
def test_ingest_dedupes_across_batches(client, admin_auth):
    _create_connected_asset(client, admin_auth["headers"])
    samples = _energy_samples(CLEAR_SKY_DATE, 6.0, n=3)
    first = _post_batch(client, DEVICE_ID, samples)
    assert first.json()["accepted"] == 3 and first.json()["duplicates"] == 0
    # Re-posting the identical batch (a gateway retry over flaky signal).
    again = _post_batch(client, DEVICE_ID, samples)
    assert again.json()["accepted"] == 0
    assert again.json()["duplicates"] == 3


def test_ingest_dedupes_within_one_batch(client, admin_auth):
    _create_connected_asset(client, admin_auth["headers"])
    ts = _ts(CLEAR_SKY_DATE, 9)
    resp = _post_batch(client, DEVICE_ID, [
        {"ts": ts, "energy_kwh": 1.0},
        {"ts": ts, "energy_kwh": 1.0},   # same timestamp twice in one payload
    ])
    body = resp.json()
    assert body["accepted"] == 1
    assert body["duplicates"] == 1


# ===========================================================================
# Live channel diagnosis on ingest
# ===========================================================================
def test_ingest_string_outage_creates_telemetry_fault(client, admin_auth):
    asset_id = _create_connected_asset(client, admin_auth["headers"])
    h = admin_auth["headers"]
    resp = _post_batch(client, DEVICE_ID, [{
        "ts": _ts(CLEAR_SKY_DATE, 9, 30),
        "ac_power_w": 2500.0,
        "dc_string_voltages": [615.0, 0.6],     # string 2 open-circuit
        "inverter_status": "ok",
    }])
    assert resp.status_code == 201, resp.text
    fault_id = resp.json()["diagnosis_fault_id"]
    assert fault_id

    faults = client.get(f"/faults?asset_id={asset_id}", headers=h).json()
    assert len(faults) == 1
    f = faults[0]
    assert f["id"] == fault_id
    assert f["source"] == "telemetry"
    assert f["category"] == "string_outage"
    assert f["severity"] == "critical"
    # The "why" + parts ride along on the fault detail.
    assert f["detail"]["recommended_parts"]
    assert "probable_cause" in f["detail"]


def test_ingest_inverter_fault_creates_telemetry_fault(client, admin_auth):
    asset_id = _create_connected_asset(client, admin_auth["headers"])
    h = admin_auth["headers"]
    resp = _post_batch(client, DEVICE_ID, [{
        "ts": _ts(CLEAR_SKY_DATE, 9, 30),
        "ac_power_w": 0.0,
        "dc_string_voltages": [615.0, 615.0],   # DC healthy, AC dead
        "inverter_status": "fault",
        "inverter_code": "F013",
    }])
    assert resp.status_code == 201, resp.text
    assert resp.json()["diagnosis_fault_id"]
    faults = client.get(f"/faults?asset_id={asset_id}", headers=h).json()
    assert len(faults) == 1
    assert faults[0]["category"] == "inverter_fault"
    assert faults[0]["severity"] == "critical"


def test_ingest_diagnosis_is_idempotent_for_open_fault(client, admin_auth):
    asset_id = _create_connected_asset(client, admin_auth["headers"])
    h = admin_auth["headers"]
    bad = {"ts": _ts(CLEAR_SKY_DATE, 9, 30), "ac_power_w": 2500.0,
           "dc_string_voltages": [615.0, 0.6], "inverter_status": "ok"}
    first = _post_batch(client, DEVICE_ID, [bad])
    # A later sample, same open condition — must not stack a second fault.
    bad2 = dict(bad, ts=_ts(CLEAR_SKY_DATE, 10, 0))
    second = _post_batch(client, DEVICE_ID, [bad2])
    assert first.json()["diagnosis_fault_id"] == second.json()["diagnosis_fault_id"]
    faults = client.get(f"/faults?asset_id={asset_id}", headers=h).json()
    assert len(faults) == 1


# ===========================================================================
# Raw sample listing (JWT, company-scoped)
# ===========================================================================
def test_list_samples_returns_desc_and_respects_limit(client, admin_auth):
    asset_id = _create_connected_asset(client, admin_auth["headers"])
    h = admin_auth["headers"]
    _post_batch(client, DEVICE_ID, [
        {"ts": _ts(CLEAR_SKY_DATE, 6), "energy_kwh": 1.0},
        {"ts": _ts(CLEAR_SKY_DATE, 9), "energy_kwh": 1.0},
        {"ts": _ts(CLEAR_SKY_DATE, 12), "energy_kwh": 1.0},
    ])
    rows = client.get(f"/telemetry/assets/{asset_id}/samples", headers=h).json()
    assert len(rows) == 3
    # Newest first.
    tss = [r["ts"] for r in rows]
    assert tss == sorted(tss, reverse=True)
    # Limit honoured.
    limited = client.get(f"/telemetry/assets/{asset_id}/samples?limit=1",
                         headers=h).json()
    assert len(limited) == 1


def test_list_samples_cross_company_404(client, admin_auth, other_company_auth):
    asset_id = _create_connected_asset(client, admin_auth["headers"])
    resp = client.get(f"/telemetry/assets/{asset_id}/samples",
                      headers=other_company_auth["headers"])
    assert resp.status_code == 404


def test_list_samples_requires_auth(client, admin_auth):
    asset_id = _create_connected_asset(client, admin_auth["headers"])
    assert client.get(f"/telemetry/assets/{asset_id}/samples").status_code == 401


# ===========================================================================
# Rollup: telemetry samples -> scored Reading(source="telemetry")
# ===========================================================================
def test_rollup_scores_healthy_day(client, admin_auth):
    _seed_weather(client)
    h = admin_auth["headers"]
    asset_id = _create_connected_asset(client, h)
    expected = _expected_ac(client, h, asset_id)
    assert expected > 0
    # Post a completed day whose energy matches expected -> should score healthy.
    _post_batch(client, DEVICE_ID, _energy_samples(CLEAR_SKY_DATE, expected, n=4))

    resp = client.post("/telemetry/rollup", headers=h)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["processed_assets"] == 1
    day = [r for r in body["readings"]
           if r["reading_date"] == CLEAR_SKY_DATE.isoformat()]
    assert len(day) == 1
    item = day[0]
    assert item["severity"] == "healthy"
    assert abs(item["health_ratio"] - 1.0) < 0.02
    assert item["fault_id"] is None

    # A telemetry-sourced Reading now exists for that day.
    readings = client.get(f"/readings?asset_id={asset_id}", headers=h).json()
    tele = [r for r in readings if r["source"] == "telemetry"]
    assert len(tele) == 1
    assert tele[0]["id"] == item["reading_id"]


def test_rollup_severe_day_persists_system_fault(client, admin_auth):
    _seed_weather(client)
    h = admin_auth["headers"]
    asset_id = _create_connected_asset(client, h)
    expected = _expected_ac(client, h, asset_id)
    # ~40% of expected -> severe shortfall -> system fault, same as manual path.
    _post_batch(client, DEVICE_ID, _energy_samples(CLEAR_SKY_DATE, expected * 0.4, n=4))

    body = client.post("/telemetry/rollup", headers=h).json()
    item = [r for r in body["readings"]
            if r["reading_date"] == CLEAR_SKY_DATE.isoformat()][0]
    assert item["severity"] == "severe"
    assert item["fault_id"] is not None

    faults = client.get(f"/faults?asset_id={asset_id}", headers=h).json()
    assert len(faults) == 1
    assert faults[0]["source"] == "system"          # energy-based, not channel
    assert faults[0]["id"] == item["fault_id"]
    assert faults[0]["reading_id"] == item["reading_id"]


def test_rollup_is_idempotent(client, admin_auth):
    _seed_weather(client)
    h = admin_auth["headers"]
    asset_id = _create_connected_asset(client, h)
    expected = _expected_ac(client, h, asset_id)
    _post_batch(client, DEVICE_ID, _energy_samples(CLEAR_SKY_DATE, expected * 0.4, n=4))

    first = client.post("/telemetry/rollup", headers=h).json()
    second = client.post("/telemetry/rollup", headers=h).json()
    day1 = [r for r in first["readings"] if r["reading_date"] == CLEAR_SKY_DATE.isoformat()][0]
    day2 = [r for r in second["readings"] if r["reading_date"] == CLEAR_SKY_DATE.isoformat()][0]
    # Same reading and same fault re-used, not duplicated.
    assert day1["reading_id"] == day2["reading_id"]
    assert day1["fault_id"] == day2["fault_id"]

    readings = client.get(f"/readings?asset_id={asset_id}", headers=h).json()
    assert len([r for r in readings if r["source"] == "telemetry"]) == 1
    assert len(client.get(f"/faults?asset_id={asset_id}", headers=h).json()) == 1


def test_rollup_single_asset_scoped_and_skips_unconnected(client, admin_auth):
    _seed_weather(client)
    h = admin_auth["headers"]
    connected = _create_connected_asset(client, h)
    # A manual-only asset (telemetry disabled) must be ignored by a fleet rollup.
    _create_asset_manual = client.post(
        "/assets", headers=h,
        json=make_asset_payload(customer_name="No Telemetry", telemetry_enabled=False),
    )
    assert _create_asset_manual.status_code == 201
    expected = _expected_ac(client, h, connected)
    _post_batch(client, DEVICE_ID, _energy_samples(CLEAR_SKY_DATE, expected, n=4))

    body = client.post("/telemetry/rollup", headers=h).json()
    assert body["processed_assets"] == 1  # only the connected asset


def test_rollup_cross_company_asset_404(client, admin_auth, other_company_auth):
    asset_id = _create_connected_asset(client, admin_auth["headers"])
    resp = client.post(f"/telemetry/rollup?asset_id={asset_id}",
                       headers=other_company_auth["headers"])
    assert resp.status_code == 404


def test_rollup_requires_admin(client, admin_auth, technician_auth):
    _create_connected_asset(client, admin_auth["headers"])
    resp = client.post("/telemetry/rollup", headers=technician_auth["headers"])
    assert resp.status_code == 403


# ===========================================================================
# Forecast endpoint (reads cached health_ratio history)
# ===========================================================================
def test_forecast_early_warning_from_declining_history(client, admin_auth, db):
    from app.models import Reading

    h = admin_auth["headers"]
    asset_id = _create_connected_asset(client, h)
    # Seed a declining health-ratio series directly (the forecaster's input),
    # via the same DB the app uses.
    start = date(2026, 7, 1)
    for i, hr in enumerate([1.00, 0.99, 0.98, 0.97, 0.96, 0.95]):
        db.add(Reading(asset_id=asset_id, reading_date=start + timedelta(days=i),
                       energy_kwh=10.0, period_days=1, source="telemetry",
                       health_ratio=hr))
    db.commit()

    resp = client.get(f"/analytics/assets/{asset_id}/forecast", headers=h)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["asset_id"] == asset_id
    assert body["points"] == 6
    assert body["slope_per_day"] < 0
    assert body["early_warning"] is True
    assert body["days_to_threshold"] == 3
    assert body["projected_cross_date"] == (start + timedelta(days=8)).isoformat()


def test_forecast_too_few_points_no_warning(client, admin_auth, db):
    from app.models import Reading

    h = admin_auth["headers"]
    asset_id = _create_connected_asset(client, h)
    db.add(Reading(asset_id=asset_id, reading_date=date(2026, 7, 1),
                   energy_kwh=10.0, period_days=1, source="telemetry",
                   health_ratio=0.99))
    db.commit()
    body = client.get(f"/analytics/assets/{asset_id}/forecast", headers=h).json()
    assert body["points"] == 1
    assert body["early_warning"] is False
    assert body["slope_per_day"] is None


def test_forecast_cross_company_404(client, admin_auth, other_company_auth):
    asset_id = _create_connected_asset(client, admin_auth["headers"])
    resp = client.get(f"/analytics/assets/{asset_id}/forecast",
                      headers=other_company_auth["headers"])
    assert resp.status_code == 404


def test_forecast_requires_auth(client, admin_auth):
    asset_id = _create_connected_asset(client, admin_auth["headers"])
    assert client.get(f"/analytics/assets/{asset_id}/forecast").status_code == 401


# ===========================================================================
# Regression: manual and telemetry are scored identically
# ===========================================================================
def test_manual_and_telemetry_score_identically(client, admin_auth):
    """Same energy, same asset/day, same weather -> identical health & severity,
    whether it arrives via the manual analytics path or the telemetry rollup."""
    _seed_weather(client)
    h = admin_auth["headers"]
    asset_id = _create_connected_asset(client, h)
    expected = _expected_ac(client, h, asset_id)

    # Telemetry path: one sample carrying exactly `expected` kWh, then roll up.
    _post_batch(client, DEVICE_ID,
                [{"ts": _ts(CLEAR_SKY_DATE, 9), "energy_kwh": expected}])
    roll = client.post("/telemetry/rollup", headers=h).json()
    tele = [r for r in roll["readings"]
            if r["reading_date"] == CLEAR_SKY_DATE.isoformat()][0]

    # Manual path: ad-hoc analyse the same energy on the same asset/day.
    manual = client.post(
        f"/analytics/assets/{asset_id}",
        headers=h,
        json={"energy_kwh": expected, "reading_date": CLEAR_SKY_DATE.isoformat()},
    ).json()

    assert tele["severity"] == manual["severity"] == "healthy"
    assert abs(tele["health_ratio"] - manual["health_ratio"]) < 1e-6
