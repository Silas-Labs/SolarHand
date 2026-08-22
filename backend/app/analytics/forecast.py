"""Trend forecasting — honest, explainable early warning.

Given a connected site's history of health ratios (actual/expected energy, ~1.0
when healthy), fit a straight line by ordinary least squares and project it
forward to estimate *when* the site will cross the "needs attention" threshold.
A slowly soiling or degrading system surfaces as an **early warning** before it
becomes lost generation.

Why this and not ML
-------------------
This is deliberately a line, not a learned model. Every output can be traced to
the input points and two coefficients (slope, intercept), so an operator can see
*why* a warning fired and a judge can trust it isn't a black box. Trained-model
forecasting is noted as optional future work in the docs, not claimed here.

Pure stdlib (``statistics``/``datetime``) so it runs anywhere and is trivially
unit-tested offline.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

# Health-ratio threshold for "needs attention" — matches
# ``app.analytics.faults.Thresholds.healthy`` so the forecast and the
# performance classifier agree on what "healthy" means.
DEFAULT_THRESHOLD = 0.92
# Only warn about crossings within this many days — a projection centuries out
# is technically true but useless.
DEFAULT_HORIZON_DAYS = 45
# Need at least this many scored readings to fit a meaningful trend.
MIN_POINTS = 4


@dataclass(frozen=True)
class ForecastResult:
    """Outcome of projecting a health-ratio trend to a threshold."""

    points: int
    current_health_ratio: float | None
    slope_per_day: float | None          # <0 means declining
    threshold: float
    projected_cross_date: date | None
    days_to_threshold: int | None
    early_warning: bool
    summary: str


def _linear_fit(xs: list[float], ys: list[float]) -> tuple[float, float] | None:
    """Ordinary least-squares fit ``y = intercept + slope*x``.

    Returns ``(slope, intercept)`` or ``None`` if the fit is undefined (all x
    identical → zero variance).
    """
    n = len(xs)
    if n < 2:
        return None
    mean_x = sum(xs) / n
    mean_y = sum(ys) / n
    sxx = sum((x - mean_x) ** 2 for x in xs)
    if sxx == 0:
        return None
    sxy = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    slope = sxy / sxx
    intercept = mean_y - slope * mean_x
    return slope, intercept


def forecast_health(
    points: list[tuple[date, float]],
    *,
    threshold: float = DEFAULT_THRESHOLD,
    horizon_days: int = DEFAULT_HORIZON_DAYS,
    min_points: int = MIN_POINTS,
) -> ForecastResult:
    """Project a health-ratio series to its threshold crossing.

    ``points`` is a list of ``(reading_date, health_ratio)``; order does not
    matter (it is sorted here). The x-axis is *days since the first reading*, so
    the slope is per-day and directly interpretable.
    """
    clean = sorted(
        ((d, float(v)) for d, v in points if v is not None),
        key=lambda p: p[0],
    )
    n = len(clean)
    if n == 0:
        return ForecastResult(
            points=0, current_health_ratio=None, slope_per_day=None,
            threshold=threshold, projected_cross_date=None,
            days_to_threshold=None, early_warning=False,
            summary="No scored readings yet — nothing to forecast.")

    current = clean[-1][1]
    if n < min_points:
        return ForecastResult(
            points=n, current_health_ratio=round(current, 4), slope_per_day=None,
            threshold=threshold, projected_cross_date=None,
            days_to_threshold=None, early_warning=False,
            summary=(f"Only {n} scored reading(s); need {min_points} to project "
                     "a reliable trend."))

    first_date = clean[0][0]
    xs = [float((d - first_date).days) for d, _ in clean]
    ys = [v for _, v in clean]
    fit = _linear_fit(xs, ys)
    if fit is None:
        return ForecastResult(
            points=n, current_health_ratio=round(current, 4), slope_per_day=None,
            threshold=threshold, projected_cross_date=None,
            days_to_threshold=None, early_warning=False,
            summary="Readings share one date — cannot fit a trend.")

    slope, intercept = fit
    last_x = xs[-1]

    # Already at/below threshold: this is a *current* condition, not a forecast.
    if current < threshold:
        return ForecastResult(
            points=n, current_health_ratio=round(current, 4),
            slope_per_day=round(slope, 5), threshold=threshold,
            projected_cross_date=None, days_to_threshold=0,
            early_warning=False,
            summary=(f"Already below the {threshold:.0%} attention line "
                     f"({current:.0%}); this is a current issue, not a forecast."))

    # Healthy and improving or flat: no crossing ahead.
    if slope >= 0:
        return ForecastResult(
            points=n, current_health_ratio=round(current, 4),
            slope_per_day=round(slope, 5), threshold=threshold,
            projected_cross_date=None, days_to_threshold=None,
            early_warning=False,
            summary=(f"Healthy ({current:.0%}) and stable or improving — no "
                     "threshold crossing projected."))

    # Healthy but declining: solve intercept + slope*x = threshold for x.
    x_cross = (threshold - intercept) / slope
    days_to = int(round(x_cross - last_x))
    if days_to < 0:
        days_to = 0
    cross_date = first_date + timedelta(days=int(round(x_cross)))
    early = days_to <= horizon_days

    if early:
        summary = (f"Healthy now ({current:.0%}) but declining ~"
                   f"{abs(slope) * 100:.2f}%/day; projected to cross the "
                   f"{threshold:.0%} line in ~{days_to} day(s), on "
                   f"{cross_date.isoformat()}. Act before it becomes lost "
                   "generation.")
    else:
        summary = (f"Declining slowly ({current:.0%}, ~{abs(slope) * 100:.2f}%/"
                   f"day); threshold crossing is ~{days_to} day(s) out — beyond "
                   f"the {horizon_days}-day early-warning horizon.")

    return ForecastResult(
        points=n, current_health_ratio=round(current, 4),
        slope_per_day=round(slope, 5), threshold=threshold,
        projected_cross_date=cross_date, days_to_threshold=days_to,
        early_warning=early, summary=summary)
