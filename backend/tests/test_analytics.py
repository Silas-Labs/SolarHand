"""Pure-stdlib unit tests for the analytics engine (no FastAPI/DB deps).

Runs anywhere Python does::

    python3 -m unittest tests.test_analytics      # from backend/
    ./run_tests.sh --pure                          # via the two-tier runner

Also collected by pytest in the QA environment. Every assertion is a physics
or arithmetic identity, so the model is checked, not just executed.
"""

from __future__ import annotations

import math
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.analytics import faults as fl  # noqa: E402
from app.analytics import irradiance as ir  # noqa: E402
from app.analytics import performance as perf  # noqa: E402
from app.analytics import solar_geometry as sg  # noqa: E402
from app.analytics import engine as eng  # noqa: E402
from app.analytics.weather import StaticWeatherProvider, WeatherSample  # noqa: E402

KISUMU_LAT, KISUMU_LON = -0.10, 34.75


def _haurwitz_ghi(zenith_deg: float) -> float:
    """Haurwitz clear-sky GHI (W/m^2) — realistic synthetic input for tests."""
    cos_z = math.cos(math.radians(zenith_deg))
    return 1098.0 * cos_z * math.exp(-0.059 / cos_z) if cos_z > 0 else 0.0


def _clear_sky_day(date_utc: datetime, lat: float, lon: float,
                   air_temp_c: float = 26.0) -> list[WeatherSample]:
    base = date_utc.replace(hour=0, minute=0, second=0, microsecond=0,
                            tzinfo=timezone.utc)
    out = []
    for h in range(24):
        ts = base + timedelta(hours=h)
        zen, _ = sg.solar_position(ts, lat, lon)
        out.append(WeatherSample(ts, _haurwitz_ghi(zen), air_temp_c))
    return out


class TestSolarGeometry(unittest.TestCase):
    def test_declination_seasonal_extremes(self):
        jun = sg.declination_deg(datetime(2026, 6, 21, 12))
        dec = sg.declination_deg(datetime(2026, 12, 21, 12))
        self.assertGreater(jun, 23.0)
        self.assertLess(jun, 23.5)
        self.assertLess(dec, -23.0)
        self.assertGreater(dec, -23.5)

    def test_kisumu_june_noon_zenith_equals_decl_minus_lat(self):
        # Analytic identity at *solar* noon: zenith == |declination - latitude|.
        # Solar noon isn't clock noon (Kisumu ~09:42 UTC), so find it by
        # minimising zenith across the day rather than assuming a time.
        base = datetime(2026, 6, 21, 0, tzinfo=timezone.utc)
        zen_noon, minute = min(
            (sg.solar_position(base + timedelta(minutes=m), KISUMU_LAT, KISUMU_LON)[0], m)
            for m in range(0, 1440, 2))
        noon = base + timedelta(minutes=minute)
        decl = sg.declination_deg(noon)
        az = sg.solar_position(noon, KISUMU_LAT, KISUMU_LON)[1]
        self.assertAlmostEqual(zen_noon, abs(decl - KISUMU_LAT), delta=0.05)
        # June sun culminates to the north of an equatorial site.
        self.assertLess(min(az % 360, 360 - (az % 360)), 2.0)

    def test_azimuth_east_am_west_pm(self):
        am = sg.solar_position(datetime(2026, 3, 20, 6, 30), KISUMU_LAT, KISUMU_LON)[1]
        pm = sg.solar_position(datetime(2026, 3, 20, 15, 0), KISUMU_LAT, KISUMU_LON)[1]
        self.assertTrue(45 < am < 135, f"AM azimuth {am}")
        self.assertTrue(225 < pm < 315, f"PM azimuth {pm}")

    def test_aoi_flat_equals_zenith(self):
        zen, az = sg.solar_position(datetime(2026, 3, 20, 9), KISUMU_LAT, KISUMU_LON)
        self.assertAlmostEqual(sg.angle_of_incidence_deg(zen, az, 0.0, 0.0), zen, places=6)

    def test_aoi_aligned_is_zero(self):
        # Panel pointed straight at the sun -> AOI 0.
        self.assertAlmostEqual(sg.angle_of_incidence_deg(30.0, 120.0, 30.0, 120.0),
                               0.0, places=6)


class TestIrradiance(unittest.TestCase):
    def test_erbs_bounds(self):
        self.assertAlmostEqual(ir.erbs_diffuse_fraction(0.0), 1.0, places=9)
        self.assertAlmostEqual(ir.erbs_diffuse_fraction(1.0), 0.165, places=9)
        self.assertEqual(ir.erbs_diffuse_fraction(5.0), 0.165)   # clamps high
        self.assertAlmostEqual(ir.erbs_diffuse_fraction(-2.0), 1.0, places=9)  # clamps low

    def test_decomposition_conserves_energy(self):
        moment = datetime(2026, 3, 20, 9)
        zen, _ = sg.solar_position(moment, KISUMU_LAT, KISUMU_LON)
        i0n = sg.extraterrestrial_normal_irradiance(moment)
        dni, dhi = ir.decompose_ghi(600.0, zen, i0n)
        self.assertGreaterEqual(dni, 0.0)
        self.assertGreaterEqual(dhi, 0.0)
        recomposed = dni * math.cos(math.radians(zen)) + dhi
        self.assertAlmostEqual(recomposed, 600.0, places=6)

    def test_sun_down_returns_zero(self):
        night = datetime(2026, 3, 20, 22)
        zen, _ = sg.solar_position(night, KISUMU_LAT, KISUMU_LON)
        self.assertEqual(ir.decompose_ghi(300.0, zen, 1360.0), (0.0, 0.0))

    def test_flat_transposition_reproduces_ghi(self):
        moment = datetime(2026, 3, 20, 9)
        zen, az = sg.solar_position(moment, KISUMU_LAT, KISUMU_LON)
        i0n = sg.extraterrestrial_normal_irradiance(moment)
        dni, dhi = ir.decompose_ghi(600.0, zen, i0n)
        aoi = sg.angle_of_incidence_deg(zen, az, 0.0, 0.0)
        poa = ir.transpose_to_poa(600.0, dni, dhi, aoi, tilt_deg=0.0)
        self.assertAlmostEqual(poa, 600.0, places=6)

    def test_tilt_toward_sun_beats_flat(self):
        moment = datetime(2026, 6, 21, 9)  # June sun to the north at Kisumu
        zen, az = sg.solar_position(moment, KISUMU_LAT, KISUMU_LON)
        i0n = sg.extraterrestrial_normal_irradiance(moment)
        dni, dhi = ir.decompose_ghi(700.0, zen, i0n)
        flat = ir.transpose_to_poa(700.0, dni, dhi,
                                   sg.angle_of_incidence_deg(zen, az, 0.0, 0.0), 0.0)
        tilt = ir.transpose_to_poa(700.0, dni, dhi,
                                   sg.angle_of_incidence_deg(zen, az, 15.0, 0.0), 15.0)
        self.assertGreaterEqual(tilt, flat)


class TestPerformance(unittest.TestCase):
    def test_cell_temperature_noct_identity(self):
        self.assertAlmostEqual(perf.cell_temperature(800.0, 20.0), 45.0, places=9)
        self.assertAlmostEqual(perf.cell_temperature(0.0, 27.0), 27.0, places=9)

    def test_temperature_factor(self):
        self.assertAlmostEqual(perf.dc_temperature_factor(25.0), 1.0, places=9)
        self.assertAlmostEqual(perf.dc_temperature_factor(45.0), 0.92, places=9)
        self.assertEqual(perf.dc_temperature_factor(1000.0), 0.0)  # floors at 0

    def test_instantaneous_power(self):
        self.assertAlmostEqual(perf.expected_dc_power_kw(5.0, 1000.0, 25.0), 5.0, places=9)
        self.assertAlmostEqual(perf.expected_dc_power_kw(5.0, 1000.0, 45.0), 4.6, places=9)
        self.assertEqual(perf.expected_dc_power_kw(5.0, 0.0, 25.0), 0.0)

    def test_energy_integration_and_derate(self):
        air_stc = 25.0 - (45.0 - 20.0) / 800.0 * 1000.0  # air giving cell==25 at 1000 W/m^2
        samples = [perf.PerformanceSample(1000.0, air_stc) for _ in range(4)]
        ideal = perf.expected_energy_kwh(samples, 5.0, 1.0)
        self.assertAlmostEqual(ideal, 20.0, places=6)
        derated = perf.expected_energy_kwh(samples, 5.0, 1.0,
                                           system_derate=perf.DEFAULT_SYSTEM_DERATE)
        self.assertAlmostEqual(derated, 16.0, places=6)

    def test_reference_yield_and_pr(self):
        self.assertAlmostEqual(perf.reference_yield_hours([1000.0, 1000.0], 1.0), 2.0, places=9)
        self.assertAlmostEqual(perf.performance_ratio(16.0, 20.0), 0.8, places=9)
        self.assertIsNone(perf.performance_ratio(5.0, 0.0))


class TestFaults(unittest.TestCase):
    def _sev(self, ratio):
        return fl.classify_performance(ratio, 1.0).severity

    def test_bands_and_boundaries(self):
        self.assertEqual(self._sev(1.00), fl.Severity.HEALTHY)
        self.assertEqual(self._sev(0.92), fl.Severity.HEALTHY)
        self.assertEqual(self._sev(0.85), fl.Severity.MINOR)
        self.assertEqual(self._sev(0.80), fl.Severity.MINOR)
        self.assertEqual(self._sev(0.70), fl.Severity.MODERATE)
        self.assertEqual(self._sev(0.60), fl.Severity.MODERATE)
        self.assertEqual(self._sev(0.40), fl.Severity.SEVERE)
        self.assertEqual(self._sev(1.50), fl.Severity.ANOMALOUS)

    def test_unknown_when_nothing_expected(self):
        a = fl.classify_performance(5.0, 0.0)
        self.assertEqual(a.severity, fl.Severity.UNKNOWN)
        self.assertIsNone(a.ratio)

    def test_fault_metadata(self):
        severe = fl.classify_performance(0.40, 1.0)
        self.assertTrue(severe.is_fault)
        self.assertTrue(severe.likely_causes)
        self.assertIn("%", severe.summary)
        self.assertFalse(fl.classify_performance(1.0, 1.0).is_fault)


class TestEngine(unittest.TestCase):
    def setUp(self):
        self.spec = eng.SystemSpec(KISUMU_LAT, KISUMU_LON, 10.0, 0.0, 5.0)
        self.samples = _clear_sky_day(datetime(2026, 8, 20), KISUMU_LAT, KISUMU_LON)
        self.expected = eng.analyse_from_samples(self.spec, self.samples, 0.0).expected_ac_kwh

    def test_internal_consistency_and_realism(self):
        r = eng.analyse_from_samples(self.spec, self.samples, 0.0)
        self.assertAlmostEqual(r.reference_yield_hours, r.poa_insolation_kwh_m2, places=9)
        self.assertTrue(5.0 <= r.reference_yield_hours <= 8.5, r.reference_yield_hours)
        self.assertTrue(4.5 <= self.expected / self.spec.system_kwp <= 6.0)
        self.assertEqual(r.sample_count, 24)
        self.assertAlmostEqual(r.step_hours, 1.0, places=9)

    def test_healthy_when_actual_matches_expected(self):
        r = eng.analyse_from_samples(self.spec, self.samples, self.expected)
        self.assertEqual(r.severity, fl.Severity.HEALTHY)
        self.assertAlmostEqual(r.health_ratio, 1.0, places=6)
        self.assertTrue(0.6 <= r.performance_ratio_iec <= 0.85)

    def test_severity_scales_with_shortfall(self):
        self.assertEqual(eng.analyse_from_samples(self.spec, self.samples,
                         self.expected * 0.85).severity, fl.Severity.MINOR)
        self.assertEqual(eng.analyse_from_samples(self.spec, self.samples,
                         self.expected * 0.70).severity, fl.Severity.MODERATE)
        self.assertEqual(eng.analyse_from_samples(self.spec, self.samples,
                         self.expected * 0.40).severity, fl.Severity.SEVERE)
        self.assertEqual(eng.analyse_from_samples(self.spec, self.samples,
                         self.expected * 1.50).severity, fl.Severity.ANOMALOUS)

    def test_empty_and_night_windows_are_unknown(self):
        self.assertEqual(eng.analyse_from_samples(self.spec, [], 10.0).severity,
                         fl.Severity.UNKNOWN)
        night = [s for s in self.samples if s.timestamp.hour <= 3]
        self.assertEqual(eng.analyse_from_samples(self.spec, night, 0.0).severity,
                         fl.Severity.UNKNOWN)

    def test_analyse_uses_provider_and_filters_window(self):
        provider = StaticWeatherProvider(self.samples)
        start = datetime(2026, 8, 20, 0, tzinfo=timezone.utc)
        end = datetime(2026, 8, 20, 23, tzinfo=timezone.utc)
        r = eng.analyse(self.spec, start, end, self.expected, provider)
        self.assertEqual(r.severity, fl.Severity.HEALTHY)
        self.assertEqual(r.sample_count, 24)


if __name__ == "__main__":
    unittest.main(verbosity=2)
