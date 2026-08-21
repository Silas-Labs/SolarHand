"""Analysis engine — the Digital Twin Lite orchestrator.

Ties the pure physics modules together: for each hour in a reading's window it
places the sun, decomposes and transposes the weather's GHI onto the array,
models cell temperature and expected energy, then compares the total against
the technician's meter reading and classifies any shortfall.

The environmental I/O is injected as a :class:`weather.WeatherProvider`, so the
whole computation is deterministic and offline-testable via
:func:`analyse_from_samples`; :func:`analyse` is the thin fetch-then-compute
wrapper used in production.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from .faults import FaultAssessment, Thresholds, classify_performance
from .irradiance import DEFAULT_ALBEDO, decompose_ghi, transpose_to_poa
from .performance import (
    DEFAULT_SYSTEM_DERATE,
    GAMMA_DEFAULT,
    NOCT_DEFAULT,
    PerformanceSample,
    expected_energy_kwh,
    reference_yield_hours,
)
from .solar_geometry import (
    angle_of_incidence_deg,
    extraterrestrial_normal_irradiance,
    solar_position,
)
from .weather import WeatherProvider, WeatherSample

_MIN_ELEVATION_DEG = 3.0
_MAX_STEP_HOURS = 24.0


@dataclass(frozen=True)
class SystemSpec:
    """Everything the model needs about one PV system."""

    latitude: float
    longitude: float
    tilt_deg: float
    surface_azimuth_deg: float
    system_kwp: float
    albedo: float = DEFAULT_ALBEDO
    gamma_per_c: float = GAMMA_DEFAULT
    noct_c: float = NOCT_DEFAULT
    system_derate: float = DEFAULT_SYSTEM_DERATE


@dataclass(frozen=True)
class AnalysisResult:
    """Outcome of one expected-vs-actual comparison."""

    severity: str
    summary: str
    health_ratio: float | None        # actual / expected AC — centred on 1.0
    performance_ratio_iec: float | None  # classic IEC PR — ~0.8 when healthy
    actual_kwh: float
    expected_ac_kwh: float            # what a healthy install should deliver
    expected_dc_ideal_kwh: float      # temperature-corrected DC ideal
    reference_yield_hours: float      # Yr — equivalent peak-sun hours
    poa_insolation_kwh_m2: float      # total plane-of-array insolation
    sample_count: int
    step_hours: float
    window_start: datetime | None
    window_end: datetime | None
    likely_causes: list[str] = field(default_factory=list)

    @property
    def is_fault(self) -> bool:
        from .faults import Severity
        return self.severity in (Severity.MINOR, Severity.MODERATE, Severity.SEVERE)


def _infer_step_hours(samples: list[WeatherSample]) -> float:
    if len(samples) < 2:
        return 1.0
    delta = (samples[1].timestamp - samples[0].timestamp).total_seconds() / 3600.0
    if 0 < delta <= _MAX_STEP_HOURS:
        return delta
    return 1.0


def analyse_from_samples(
    spec: SystemSpec,
    samples: list[WeatherSample],
    actual_kwh: float,
    step_hours: float | None = None,
    thresholds: Thresholds | None = None,
) -> AnalysisResult:
    """Pure core: compute expected energy from weather samples and classify."""
    ordered = sorted(samples, key=lambda s: s.timestamp)
    if not ordered:
        assessment = classify_performance(actual_kwh, 0.0, thresholds)
        return _empty_result(assessment, actual_kwh)

    dt = step_hours if step_hours is not None else _infer_step_hours(ordered)

    poa_series: list[float] = []
    perf_samples: list[PerformanceSample] = []
    for s in ordered:
        zenith, azimuth = solar_position(s.timestamp, spec.latitude, spec.longitude)
        if (90.0 - zenith) <= _MIN_ELEVATION_DEG:
            poa = 0.0
        else:
            i0n = extraterrestrial_normal_irradiance(s.timestamp)
            dni, dhi = decompose_ghi(s.ghi_wm2, zenith, i0n)
            aoi = angle_of_incidence_deg(
                zenith, azimuth, spec.tilt_deg, spec.surface_azimuth_deg)
            poa = transpose_to_poa(s.ghi_wm2, dni, dhi, aoi, spec.tilt_deg, spec.albedo)
        poa_series.append(poa)
        perf_samples.append(PerformanceSample(poa, s.air_temp_c))

    expected_dc = expected_energy_kwh(
        perf_samples, spec.system_kwp, dt, spec.gamma_per_c, spec.noct_c,
        system_derate=1.0)
    expected_ac = expected_dc * spec.system_derate
    yr = reference_yield_hours(poa_series, dt)
    poa_insolation = sum(poa_series) * dt / 1000.0

    pr_iec = None
    if spec.system_kwp > 0 and yr > 0:
        pr_iec = actual_kwh / (spec.system_kwp * yr)

    assessment = classify_performance(actual_kwh, expected_ac, thresholds)

    return AnalysisResult(
        severity=assessment.severity,
        summary=assessment.summary,
        health_ratio=assessment.ratio,
        performance_ratio_iec=pr_iec,
        actual_kwh=actual_kwh,
        expected_ac_kwh=expected_ac,
        expected_dc_ideal_kwh=expected_dc,
        reference_yield_hours=yr,
        poa_insolation_kwh_m2=poa_insolation,
        sample_count=len(ordered),
        step_hours=dt,
        window_start=ordered[0].timestamp,
        window_end=ordered[-1].timestamp,
        likely_causes=list(assessment.likely_causes),
    )


def analyse(
    spec: SystemSpec,
    start: datetime,
    end: datetime,
    actual_kwh: float,
    provider: WeatherProvider,
    thresholds: Thresholds | None = None,
) -> AnalysisResult:
    """Fetch weather for the window, then run :func:`analyse_from_samples`."""
    samples = provider.hourly(spec.latitude, spec.longitude, start, end)
    return analyse_from_samples(spec, samples, actual_kwh, thresholds=thresholds)


def _empty_result(assessment: FaultAssessment, actual_kwh: float) -> AnalysisResult:
    return AnalysisResult(
        severity=assessment.severity,
        summary=assessment.summary,
        health_ratio=None,
        performance_ratio_iec=None,
        actual_kwh=actual_kwh,
        expected_ac_kwh=0.0,
        expected_dc_ideal_kwh=0.0,
        reference_yield_hours=0.0,
        poa_insolation_kwh_m2=0.0,
        sample_count=0,
        step_hours=0.0,
        window_start=None,
        window_end=None,
        likely_causes=list(assessment.likely_causes),
    )
