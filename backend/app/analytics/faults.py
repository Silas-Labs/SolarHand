"""Fault classification — turn a performance ratio into an actionable verdict.

A transparent, rule-based classifier (the auditable core of the "AI & data
intelligence" story): given the ratio of actual to expected energy, decide
whether a system is healthy or underperforming, how badly, and what the likely
physical causes are. Thresholds are screening heuristics, deliberately explicit
and tunable rather than a black-box model, so an EPRA auditor can follow the
reasoning end to end.

The ratio is expected to be centred on 1.0 — i.e. computed against an expected
figure that already folds in normal balance-of-system losses (see
:data:`performance.DEFAULT_SYSTEM_DERATE`) — so a sound install scores ~1.
"""

from __future__ import annotations

from dataclasses import dataclass, field


class Severity:
    """Fault severity levels (plain strings for JSON-friendliness)."""

    HEALTHY = "healthy"
    MINOR = "minor"
    MODERATE = "moderate"
    SEVERE = "severe"
    ANOMALOUS = "anomalous"
    UNKNOWN = "unknown"


@dataclass(frozen=True)
class Thresholds:
    """Performance-ratio cut points. Defaults are field-screening heuristics."""

    healthy: float = 0.92    # >= this: performing as expected
    minor: float = 0.80      # >= this: minor loss (soiling, mild degradation)
    moderate: float = 0.60   # >= this: moderate loss (shading, string issue)
    # below `moderate`: severe (inverter down, major fault)
    anomalous_high: float = 1.20  # > this: implausible — suspect data/model


@dataclass(frozen=True)
class FaultAssessment:
    """Result of classifying one performance comparison."""

    severity: str
    ratio: float | None
    expected_kwh: float
    actual_kwh: float
    summary: str
    likely_causes: list[str] = field(default_factory=list)

    @property
    def is_fault(self) -> bool:
        return self.severity in (Severity.MINOR, Severity.MODERATE, Severity.SEVERE)


_CAUSES = {
    Severity.MINOR: [
        "Panel soiling (dust/bird droppings) — clean and re-measure",
        "Gradual module degradation",
        "Minor near-field shading (new vegetation)",
    ],
    Severity.MODERATE: [
        "Partial-array shading (structure, tree, adjacent build)",
        "One string or MPPT input offline",
        "Failing bypass diode or module hot-spot",
        "Soiling combined with degradation",
    ],
    Severity.SEVERE: [
        "Inverter fault or tripped/offline",
        "Disconnected or open-circuit string",
        "Blown DC/AC protection or isolator open",
        "Meter reading captured over a partial outage",
    ],
    Severity.ANOMALOUS: [
        "Meter mis-read or wrong units entered",
        "System capacity (kWp) recorded incorrectly",
        "Weather data not representative of the site",
        "Reading window and expected window misaligned",
    ],
}

# Map an analytics severity onto a persisted ``FaultReport`` (category,
# FaultSeverity). The single source of truth shared by the analytics router and
# the telemetry rollup, so an energy-based fault looks identical no matter which
# path (manual reading or telemetry roll-up) produced the reading. Only the
# actionable bands map; healthy/anomalous/unknown never persist a fault.
PERSIST_FAULT_MAP: dict[str, tuple[str, str]] = {
    Severity.MINOR: ("soiling", "warning"),
    Severity.MODERATE: ("shading", "warning"),
    Severity.SEVERE: ("inverter_fault", "critical"),
}



def classify_performance(
    actual_kwh: float,
    expected_kwh: float,
    thresholds: Thresholds | None = None,
) -> FaultAssessment:
    """Classify a system's health from actual vs expected energy."""
    t = thresholds or Thresholds()
    ratio = None if expected_kwh <= 0 else actual_kwh / expected_kwh

    if ratio is None:
        return FaultAssessment(
            severity=Severity.UNKNOWN,
            ratio=None,
            expected_kwh=expected_kwh,
            actual_kwh=actual_kwh,
            summary=(
                "No meaningful generation expected for this period "
                "(insufficient sun); performance cannot be assessed."
            ),
        )

    pct = ratio * 100

    if ratio > t.anomalous_high:
        severity = Severity.ANOMALOUS
        summary = (
            f"Actual output is {pct:.0f}% of expected — implausibly high. "
            "Check the meter reading, system capacity and weather window."
        )
    elif ratio >= t.healthy:
        severity = Severity.HEALTHY
        summary = f"Performing as expected ({pct:.0f}% of expected energy)."
    elif ratio >= t.minor:
        severity = Severity.MINOR
        summary = (
            f"Slightly below expectation ({pct:.0f}%). Likely soiling or mild "
            "degradation; worth a clean and a follow-up reading."
        )
    elif ratio >= t.moderate:
        severity = Severity.MODERATE
        summary = (
            f"Underperforming ({pct:.0f}% of expected). Investigate shading or "
            "a string/MPPT problem on site."
        )
    else:
        severity = Severity.SEVERE
        summary = (
            f"Severe underperformance ({pct:.0f}% of expected). Likely an "
            "inverter or string outage — prioritise a site visit."
        )

    return FaultAssessment(
        severity=severity,
        ratio=ratio,
        expected_kwh=expected_kwh,
        actual_kwh=actual_kwh,
        summary=summary,
        likely_causes=list(_CAUSES.get(severity, [])),
    )
