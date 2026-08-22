"""Pure-Python unit tests for the telemetry & forecast core.

These cover the dependency-free logic: rule-based diagnosis, the least-squares
trend forecaster, the device adapters, the pure daily-energy aggregation, and
the simulator's sample generation. None of them touch FastAPI, SQLAlchemy, or
Pydantic, so they run anywhere Python does.

Two ways to run them:

* ``pytest`` collects the ``test_*`` functions on the QA host, alongside the
  full-stack API tests.
* ``python tests/test_telemetry_units.py`` runs the same functions directly in a
  minimal sandbox with only the standard library available (a tiny runner lives
  at the bottom of the file). This keeps the honest-core logic verifiable even
  where the web stack can't be installed.

The exception-assertion helper below (:func:`raises`) is deliberately a plain
context manager rather than ``pytest.raises`` so importing this module never
requires pytest.
"""

from __future__ import annotations

import contextlib
from datetime import date, datetime, timedelta, timezone

from app.analytics import forecast as fc
from app.telemetry import adapters as ad
from app.telemetry import diagnosis as diag
from app.telemetry import rollup as rollup
from app.telemetry import simulator as sim

UTC = timezone.utc


@contextlib.contextmanager
def raises(exc):
    """Assert the block raises ``exc`` (pytest-free stand-in for pytest.raises)."""
    try:
        yield
    except exc:
        return
    except Exception as other:  # noqa: BLE001 - report the wrong exception clearly
        raise AssertionError(
            f"expected {exc.__name__}, got {type(other).__name__}: {other}"
        )
    raise AssertionError(f"expected {exc.__name__}, but nothing was raised")


# ===========================================================================
# app.telemetry.diagnosis  — rule-based "why"
# ===========================================================================
def test_diagnose_healthy_returns_none():
    # Balanced strings, inverter ok, sane temperature -> nothing to report.
    assert diag.diagnose(
        dc_string_voltages=[615.0, 618.0],
        inverter_status="ok",
        inverter_code=None,
        ac_power_w=5000.0,
        module_temp_c=45.0,
    ) is None


def test_diagnose_no_channels_returns_none():
    # A device that reports nothing diagnostic yields no verdict.
    assert diag.diagnose() is None


def test_diagnose_string_outage_identifies_dead_string():
    d = diag.diagnose(
        dc_string_voltages=[615.0, 0.6],  # string 2 open-circuit
        inverter_status="ok",
        ac_power_w=2500.0,
        module_temp_c=45.0,
    )
    assert d is not None
    assert d.category == "string_outage"
    assert d.severity == "critical"
    assert d.confidence == "high"
    # Names the dead string (index 2) and recommends real parts.
    assert "2" in d.summary
    assert "string" in d.probable_cause.lower()
    assert d.recommended_parts
    # The structured detail payload carries the channel snapshot.
    detail = d.as_detail()
    assert set(detail) == {"probable_cause", "recommended_parts", "channels", "confidence"}
    assert detail["channels"]["dc_string_voltages"] == [615.0, 0.6]


def test_diagnose_inverter_fault_with_code():
    d = diag.diagnose(
        dc_string_voltages=[615.0, 615.0],  # DC healthy, AC dead
        inverter_status="fault",
        inverter_code="F013",
        ac_power_w=0.0,
        module_temp_c=45.0,
    )
    assert d is not None
    assert d.category == "inverter_fault"
    assert d.severity == "critical"
    assert "F013" in d.probable_cause
    assert d.recommended_parts


def test_diagnose_thermal_derate_is_warning_other():
    d = diag.diagnose(
        dc_string_voltages=[615.0, 618.0],
        inverter_status="ok",
        ac_power_w=4000.0,
        module_temp_c=72.0,  # above the 65C derate line
    )
    assert d is not None
    assert d.category == "other"
    assert d.severity == "warning"
    assert "72" in d.summary


def test_diagnose_precedence_inverter_beats_string():
    # Both an inverter fault and a dead string present: the more blocking
    # inverter fault must win (a work order needs one clear action).
    d = diag.diagnose(
        dc_string_voltages=[615.0, 0.5],
        inverter_status="fault",
        inverter_code="F001",
        ac_power_w=0.0,
        module_temp_c=45.0,
    )
    assert d is not None and d.category == "inverter_fault"


def test_diagnose_array_wide_sag_is_not_string_outage():
    # All strings low together (no healthy sibling) is array-wide, not an
    # isolated open circuit — channel diagnosis must stay silent and leave the
    # call to the energy-based twin. This is the honest limit of the rules.
    d = diag.diagnose(
        dc_string_voltages=[5.0, 4.0],
        inverter_status="ok",
        ac_power_w=10.0,
        module_temp_c=40.0,
    )
    assert d is None


def test_diagnose_sample_reads_duck_typed_object():
    class Row:
        dc_string_voltages = [615.0, 0.4]
        inverter_status = "ok"
        inverter_code = None
        ac_power_w = 2400.0
        module_temp_c = 44.0

    d = diag.diagnose_sample(Row())
    assert d is not None and d.category == "string_outage"


# ===========================================================================
# app.analytics.forecast  — least-squares early warning
# ===========================================================================
def test_linear_fit_recovers_known_line():
    fit = fc._linear_fit([0.0, 1.0, 2.0, 3.0], [1.0, 3.0, 5.0, 7.0])
    assert fit is not None
    slope, intercept = fit
    assert abs(slope - 2.0) < 1e-9
    assert abs(intercept - 1.0) < 1e-9


def test_forecast_empty_series():
    r = fc.forecast_health([])
    assert r.points == 0
    assert r.current_health_ratio is None
    assert r.slope_per_day is None
    assert r.early_warning is False


def test_forecast_too_few_points_no_trend():
    r = fc.forecast_health([
        (date(2026, 8, 1), 1.0),
        (date(2026, 8, 2), 0.99),
    ])
    assert r.points == 2
    assert r.slope_per_day is None
    assert r.early_warning is False


def _series(start: date, values: list[float]) -> list[tuple[date, float]]:
    return [(start + timedelta(days=i), v) for i, v in enumerate(values)]


def test_forecast_declining_within_horizon_warns():
    # 1.00 -> 0.95 over 5 days: slope -0.01/day, still healthy, crosses 0.92 soon.
    start = date(2026, 8, 1)
    r = fc.forecast_health(_series(start, [1.00, 0.99, 0.98, 0.97, 0.96, 0.95]))
    assert r.points == 6
    assert r.slope_per_day is not None and r.slope_per_day < 0
    assert r.early_warning is True
    assert r.days_to_threshold == 3
    assert r.projected_cross_date == start + timedelta(days=8)
    assert abs(r.current_health_ratio - 0.95) < 1e-9


def test_forecast_declining_beyond_horizon_no_warning():
    # A very shallow decline crosses the line, but far past the 45-day horizon.
    start = date(2026, 8, 1)
    r = fc.forecast_health(
        _series(start, [1.0000, 0.9998, 0.9996, 0.9994, 0.9992, 0.9990])
    )
    assert r.slope_per_day is not None and r.slope_per_day < 0
    assert r.early_warning is False
    assert r.days_to_threshold is not None and r.days_to_threshold > fc.DEFAULT_HORIZON_DAYS
    assert r.projected_cross_date is not None


def test_forecast_healthy_and_improving_no_crossing():
    start = date(2026, 8, 1)
    r = fc.forecast_health(_series(start, [0.95, 0.96, 0.97, 0.98, 0.99, 1.00]))
    assert r.slope_per_day is not None and r.slope_per_day >= 0
    assert r.projected_cross_date is None
    assert r.days_to_threshold is None
    assert r.early_warning is False


def test_forecast_already_below_threshold_is_current_not_forecast():
    start = date(2026, 8, 1)
    r = fc.forecast_health(_series(start, [0.95, 0.93, 0.91, 0.90, 0.89, 0.88]))
    assert r.current_health_ratio is not None and r.current_health_ratio < fc.DEFAULT_THRESHOLD
    assert r.days_to_threshold == 0
    assert r.early_warning is False
    assert r.projected_cross_date is None


def test_forecast_single_date_cannot_fit():
    d = date(2026, 8, 1)
    r = fc.forecast_health([(d, 0.99), (d, 0.98), (d, 0.99), (d, 0.98)])
    assert r.points == 4
    assert r.slope_per_day is None
    assert r.early_warning is False


# ===========================================================================
# app.telemetry.adapters  — normalize-at-the-edge
# ===========================================================================
def test_available_formats_lists_canonical_and_stub():
    assert ad.available_formats() == ["canonical", "sunspec"]


def test_get_adapter_defaults_and_case_insensitive():
    assert ad.get_adapter(None).format == "canonical"
    assert ad.get_adapter("CANONICAL").format == "canonical"
    assert isinstance(ad.get_adapter("sunspec"), ad.SunSpecModbusAdapter)


def test_get_adapter_unknown_raises():
    with raises(ad.AdapterError):
        ad.get_adapter("totally-made-up")


def test_canonical_adapter_keeps_known_keys_and_preserves_raw():
    out = ad.CanonicalAdapter().normalize([
        {"ts": "2026-08-22T12:00:00Z", "ac_power_w": 1000.0, "vendor_junk": "x"},
    ])
    assert len(out) == 1
    sample = out[0]
    assert sample["ts"] == "2026-08-22T12:00:00Z"
    assert sample["ac_power_w"] == 1000.0
    # Unknown channel is dropped from the canonical shape ...
    assert "vendor_junk" not in sample
    # ... but preserved verbatim under raw for traceability.
    assert sample["raw"]["vendor_junk"] == "x"


def test_canonical_adapter_accepts_timestamp_aliases():
    assert ad.CanonicalAdapter().normalize([{"timestamp": "2026-08-22T00:00:00Z"}])[0]["ts"]
    assert ad.CanonicalAdapter().normalize([{"time": "2026-08-22T00:00:00Z"}])[0]["ts"]


def test_canonical_adapter_drops_none_channels():
    out = ad.CanonicalAdapter().normalize([{"ts": "2026-08-22T12:00:00Z", "ac_power_w": None}])
    assert "ac_power_w" not in out[0]


def test_canonical_adapter_honours_explicit_raw():
    out = ad.CanonicalAdapter().normalize([{"ts": "2026-08-22T12:00:00Z", "raw": {"x": 1}}])
    assert out[0]["raw"] == {"x": 1}


def test_canonical_adapter_rejects_missing_ts_and_non_dict():
    with raises(ad.AdapterError):
        ad.CanonicalAdapter().normalize([{"ac_power_w": 1.0}])
    with raises(ad.AdapterError):
        ad.CanonicalAdapter().normalize(["not-a-dict"])


def test_sunspec_stub_raises_not_implemented():
    with raises(NotImplementedError):
        ad.SunSpecModbusAdapter().normalize([{"ts": "2026-08-22T12:00:00Z"}])


# ===========================================================================
# app.telemetry.rollup.aggregate_daily  — pure daily energy
# ===========================================================================
def test_aggregate_daily_sums_energy_per_utc_day():
    samples = [
        {"ts": "2026-08-20T06:00:00Z", "energy_kwh": 1.0},
        {"ts": "2026-08-20T09:00:00Z", "energy_kwh": 2.0},
        {"ts": "2026-08-20T12:00:00Z", "energy_kwh": 3.0},
        {"ts": "2026-08-21T09:00:00Z", "energy_kwh": 4.0},
        {"ts": "2026-08-21T12:00:00Z", "energy_kwh": 5.0},
    ]
    aggs = rollup.aggregate_daily(samples)
    assert [a.reading_date for a in aggs] == [date(2026, 8, 20), date(2026, 8, 21)]
    assert abs(aggs[0].energy_kwh - 6.0) < 1e-6
    assert abs(aggs[1].energy_kwh - 9.0) < 1e-6
    assert aggs[0].sample_count == 3
    assert aggs[1].sample_count == 2


def test_aggregate_daily_falls_back_to_power_integration():
    # No energy channel: integrate ac_power_w (W) over time -> kWh.
    # 1000W held for 1h, then ramps to 0 over the next hour: 1000 + 500 = 1500 Wh.
    base = datetime(2026, 8, 20, 6, 0, tzinfo=UTC)
    samples = [
        {"ts": base, "ac_power_w": 1000.0},
        {"ts": base + timedelta(hours=1), "ac_power_w": 1000.0},
        {"ts": base + timedelta(hours=2), "ac_power_w": 0.0},
    ]
    aggs = rollup.aggregate_daily(samples)
    assert len(aggs) == 1
    assert abs(aggs[0].energy_kwh - 1.5) < 1e-6


def test_aggregate_daily_mixed_timestamp_types():
    samples = [
        {"ts": "2026-08-20T06:00:00Z", "energy_kwh": 1.0},          # ISO+Z string
        {"ts": datetime(2026, 8, 20, 9, 0), "energy_kwh": 2.0},      # naive -> UTC
        {"ts": datetime(2026, 8, 20, 12, 0, tzinfo=UTC), "energy_kwh": 3.0},  # aware
    ]
    aggs = rollup.aggregate_daily(samples)
    assert len(aggs) == 1
    assert abs(aggs[0].energy_kwh - 6.0) < 1e-6
    assert aggs[0].first_ts < aggs[0].last_ts


def test_aggregate_daily_empty():
    assert rollup.aggregate_daily([]) == []


# ===========================================================================
# app.telemetry.simulator  — physically plausible sample generation
# ===========================================================================
def test_default_daily_kwh_matches_formula():
    assert sim.default_daily_kwh(5.0) == round(5.0 * 5.7 * 0.82, 2)


def test_daylight_fraction_bell():
    assert sim._daylight_fraction(0.0) == 0.0            # night
    assert sim._daylight_fraction(sim.SUNSET_UTC + 1) == 0.0
    noon = (sim.SUNRISE_UTC + sim.SUNSET_UTC) / 2.0
    assert abs(sim._daylight_fraction(noon) - 1.0) < 1e-9  # solar noon peak


def test_generate_day_healthy_integrates_to_target_and_is_clean():
    day = date(2026, 8, 20)
    target = sim.default_daily_kwh(5.0)
    samples = sim.generate_day(day, kwp=5.0, daily_kwh=target, step_min=15)
    total = sum(s["energy_kwh"] for s in samples)
    # Sine bell integrates to the target energy (within 5%).
    assert abs(total - target) / target < 0.05
    # A healthy day trips no channel diagnosis at any sample.
    for s in samples:
        assert diag.diagnose(
            dc_string_voltages=s["dc_string_voltages"],
            inverter_status=s["inverter_status"],
            inverter_code=s["inverter_code"],
            ac_power_w=s["ac_power_w"],
            module_temp_c=s["module_temp_c"],
        ) is None


def _midday(day: date) -> datetime:
    hour = (sim.SUNRISE_UTC + sim.SUNSET_UTC) / 2.0
    return datetime(day.year, day.month, day.day, int(hour), int((hour % 1) * 60), tzinfo=UTC)


def _diagnose_dict(s: dict):
    return diag.diagnose(
        dc_string_voltages=s["dc_string_voltages"],
        inverter_status=s["inverter_status"],
        inverter_code=s["inverter_code"],
        ac_power_w=s["ac_power_w"],
        module_temp_c=s["module_temp_c"],
    )


def test_simulator_string_outage_injection_is_diagnosable():
    s = sim.build_sample(_midday(date(2026, 8, 20)), kwp=5.0, daily_kwh=17.22,
                         step_hours=0.25, inject="string_outage")
    d = _diagnose_dict(s)
    assert d is not None and d.category == "string_outage"


def test_simulator_inverter_fault_injection_is_diagnosable():
    s = sim.build_sample(_midday(date(2026, 8, 20)), kwp=5.0, daily_kwh=17.22,
                         step_hours=0.25, inject="inverter_fault")
    assert s["ac_power_w"] == 0.0
    d = _diagnose_dict(s)
    assert d is not None and d.category == "inverter_fault"


def test_simulator_thermal_injection_is_diagnosable():
    s = sim.build_sample(_midday(date(2026, 8, 20)), kwp=5.0, daily_kwh=17.22,
                         step_hours=0.25, inject="thermal")
    assert s["module_temp_c"] >= 70.0
    d = _diagnose_dict(s)
    assert d is not None and d.category == "other"


def test_simulator_soiling_injection_has_no_channel_anomaly():
    # Soiling is a uniform energy loss with no channel signature — channel
    # diagnosis stays silent and the energy twin is left to catch it.
    s = sim.build_sample(_midday(date(2026, 8, 20)), kwp=5.0, daily_kwh=17.22,
                         step_hours=0.25, inject="soiling")
    assert _diagnose_dict(s) is None


def test_simulator_night_sample_is_dark():
    s = sim.build_sample(datetime(2026, 8, 20, 0, 0, tzinfo=UTC), kwp=5.0,
                         daily_kwh=17.22, step_hours=0.25)
    assert s["ac_power_w"] == 0.0
    assert s["energy_kwh"] == 0.0


# ---------------------------------------------------------------------------
# Minimal standalone runner (used in the stdlib-only sandbox; pytest ignores it)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import sys
    import traceback

    tests = sorted(
        (name, obj) for name, obj in globals().items()
        if name.startswith("test_") and callable(obj)
    )
    failures = 0
    for name, fn in tests:
        try:
            fn()
            print(f"PASS {name}")
        except Exception:  # noqa: BLE001 - surface any failure with its traceback
            failures += 1
            print(f"FAIL {name}")
            traceback.print_exc()
    print(f"\n{len(tests) - failures}/{len(tests)} passed")
    sys.exit(1 if failures else 0)
