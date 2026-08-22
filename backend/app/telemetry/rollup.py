"""Daily rollup — turn raw telemetry into a Reading the normal pipeline scores.

A connected site streams many samples a day; the rest of SolarHand reasons about
*daily energy* (a :class:`~app.models.Reading`). This module bridges the two: it
aggregates a day's samples into one energy figure, upserts a
``Reading(source="telemetry")``, and then runs that reading through the **same**
Digital Twin Lite physics and fault logic a manually-entered reading goes
through. The promise "telemetry and manual are treated identically downstream"
is kept here, literally: the rollup calls the same engine and the same
:data:`~app.analytics.faults.PERSIST_FAULT_MAP`.

Two layers, deliberately split:

* :func:`aggregate_daily` is pure (stdlib only) — group samples by UTC day and
  compute the day's energy. It has no database or physics dependency, so it is
  unit-testable offline.
* :func:`roll_up_asset` is the thin DB adapter that upserts readings, scores
  them via the engine, and persists energy-based faults. It is idempotent:
  re-running a day updates that day's reading in place and never double-books a
  fault.

Idempotency & completeness
--------------------------
* One telemetry ``Reading`` per ``(asset, day)`` — re-running updates it.
* A system fault is created only if the same reading has no system fault yet.
* The *current* UTC day is skipped by default (``include_today=False``): a
  partial day would under-count energy and read as a false fault. Completed days
  roll up exactly as an equivalent full-day manual reading would.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from typing import Any, Iterable

from app.analytics import engine as eng
from app.analytics.faults import PERSIST_FAULT_MAP

# ---------------------------------------------------------------------------
# Pure aggregation (no DB, no physics — unit-testable offline)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class DailyAggregate:
    """A single day's worth of telemetry, reduced to one energy figure."""

    reading_date: date
    energy_kwh: float
    sample_count: int
    first_ts: datetime
    last_ts: datetime


def _parse_ts(value: Any) -> datetime:
    """Coerce a sample timestamp to a UTC-aware :class:`datetime`.

    Accepts a ``datetime`` (naive treated as UTC) or an ISO-8601 string (a
    trailing ``Z`` is honoured). Everything is normalised to UTC so day
    grouping is unambiguous regardless of the device's wire format.
    """
    if isinstance(value, datetime):
        dt = value
    elif isinstance(value, str):
        s = value.strip()
        if s.endswith(("Z", "z")):
            s = s[:-1] + "+00:00"
        dt = datetime.fromisoformat(s)
    else:
        raise ValueError(f"unsupported timestamp type: {type(value).__name__}")
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _field(sample: Any, key: str) -> Any:
    """Read ``key`` from a dict or an object attribute (ORM row / model)."""
    if isinstance(sample, dict):
        return sample.get(key)
    return getattr(sample, key, None)


def _num(value: Any) -> float | None:
    try:
        f = float(value)
    except (TypeError, ValueError):
        return None
    if f != f or f in (float("inf"), float("-inf")):
        return None
    return f


def _day_energy_kwh(day_samples: list[tuple[datetime, Any]]) -> float:
    """Energy for one day's samples (already sorted by time).

    Prefers the ``energy_kwh`` channel (incremental energy per sample, summed).
    Falls back to trapezoidal integration of ``ac_power_w`` over time when no
    sample carries energy — so a device that only reports instantaneous power
    still yields a daily total.
    """
    energies = [_num(_field(s, "energy_kwh")) for _, s in day_samples]
    if any(e is not None for e in energies):
        return round(sum(e for e in energies if e is not None), 6)

    # Fall back to integrating instantaneous AC power (W) over hours -> kWh.
    total_wh = 0.0
    for (t0, s0), (t1, s1) in zip(day_samples, day_samples[1:]):
        p0 = _num(_field(s0, "ac_power_w"))
        p1 = _num(_field(s1, "ac_power_w"))
        if p0 is None or p1 is None:
            continue
        dt_hours = (t1 - t0).total_seconds() / 3600.0
        if dt_hours <= 0:
            continue
        total_wh += (p0 + p1) / 2.0 * dt_hours
    return round(total_wh / 1000.0, 6)


def aggregate_daily(samples: Iterable[Any]) -> list[DailyAggregate]:
    """Group telemetry samples by UTC day and reduce each day to energy.

    ``samples`` may be ORM rows, Pydantic models, or plain dicts — anything with
    ``ts`` (and optionally ``energy_kwh`` / ``ac_power_w``). Returns one
    :class:`DailyAggregate` per day, ordered by date.
    """
    by_day: dict[date, list[tuple[datetime, Any]]] = {}
    for s in samples:
        raw_ts = _field(s, "ts")
        if raw_ts is None:
            continue
        ts = _parse_ts(raw_ts)
        by_day.setdefault(ts.date(), []).append((ts, s))

    out: list[DailyAggregate] = []
    for day in sorted(by_day):
        day_samples = sorted(by_day[day], key=lambda p: p[0])
        out.append(
            DailyAggregate(
                reading_date=day,
                energy_kwh=_day_energy_kwh(day_samples),
                sample_count=len(day_samples),
                first_ts=day_samples[0][0],
                last_ts=day_samples[-1][0],
            )
        )
    return out


def _day_window(reading_date: date) -> tuple[datetime, datetime]:
    """Full-day UTC window (00:00–23:00) — identical to the analytics router's
    ``_window(reading_date, period_days=1)`` so a telemetry reading is scored
    over exactly the window a manual reading for the same day would be."""
    start = datetime.combine(reading_date, time(0, 0), tzinfo=timezone.utc)
    end = datetime.combine(reading_date, time(23, 0), tzinfo=timezone.utc)
    return start, end


def _spec(asset: Any) -> "eng.SystemSpec":
    return eng.SystemSpec(
        latitude=asset.latitude,
        longitude=asset.longitude,
        tilt_deg=asset.tilt_deg,
        surface_azimuth_deg=asset.azimuth_deg,
        system_kwp=asset.system_kwp,
    )


# ---------------------------------------------------------------------------
# DB orchestration (host-only: needs SQLAlchemy models & the audit log)
# ---------------------------------------------------------------------------


def roll_up_asset(
    db: Any,
    asset: Any,
    provider: Any,
    *,
    actor_id: str | None = None,
    since: datetime | None = None,
    include_today: bool = False,
) -> list[dict[str, Any]]:
    """Roll a connected asset's telemetry into scored daily readings.

    For each completed day with samples: upsert a ``Reading(source="telemetry")``
    with the day's energy, score it against physics-modelled expected yield
    (caching ``health_ratio`` / ``pr_iec`` on the reading), and persist a
    ``source="system"`` fault when the shortfall is actionable — the same fault
    a manual reading would raise. Returns one result dict per processed day
    (shape matches :class:`app.schemas.RollupResultItem`).

    The caller owns the transaction boundary in spirit, but this commits once at
    the end so a batch across many assets stays responsive; each asset's rollup
    is self-contained and safe to re-run.
    """
    from app import audit
    from app.models import FaultReport, Reading, TelemetrySample

    q = db.query(TelemetrySample).filter(TelemetrySample.asset_id == asset.id)
    if since is not None:
        q = q.filter(TelemetrySample.ts >= since)
    samples = q.order_by(TelemetrySample.ts.asc()).all()

    aggregates = aggregate_daily(samples)
    today = datetime.now(timezone.utc).date()
    if not include_today:
        aggregates = [a for a in aggregates if a.reading_date < today]

    results: list[dict[str, Any]] = []
    for agg in aggregates:
        # --- upsert the telemetry reading for this day ---------------------
        reading = (
            db.query(Reading)
            .filter(
                Reading.asset_id == asset.id,
                Reading.reading_date == agg.reading_date,
                Reading.source == "telemetry",
            )
            .first()
        )
        created = reading is None
        if created:
            reading = Reading(
                asset_id=asset.id,
                reading_date=agg.reading_date,
                energy_kwh=agg.energy_kwh,
                period_days=1,
                source="telemetry",
                notes="Rolled up from connected-device telemetry.",
            )
            db.add(reading)
        else:
            reading.energy_kwh = agg.energy_kwh
        db.flush()  # assign / refresh reading.id

        # --- score it through the SAME physics the manual path uses --------
        severity = "unknown"
        health_ratio: float | None = None
        result = None
        start, end = _day_window(agg.reading_date)
        try:
            result = eng.analyse(_spec(asset), start, end, agg.energy_kwh, provider)
        except (OSError, ValueError):
            # Weather unavailable for this day — keep the reading (energy is
            # real) but leave it unscored rather than fail the whole batch.
            result = None
        if result is not None:
            severity = result.severity
            health_ratio = result.health_ratio
            reading.health_ratio = result.health_ratio
            reading.pr_iec = result.performance_ratio_iec
            db.flush()

        # --- persist an energy-based fault, idempotently -------------------
        fault_id: str | None = None
        mapping = PERSIST_FAULT_MAP.get(severity) if result is not None else None
        if result is not None and mapping is not None and result.is_fault:
            existing = (
                db.query(FaultReport)
                .filter(
                    FaultReport.reading_id == reading.id,
                    FaultReport.source == "system",
                )
                .first()
            )
            if existing is not None:
                fault_id = existing.id
            else:
                category, sev = mapping
                description = result.summary
                if result.likely_causes:
                    description += " Likely causes: " + "; ".join(result.likely_causes)
                fault = FaultReport(
                    asset_id=asset.id,
                    reading_id=reading.id,
                    category=category,
                    severity=sev,
                    source="system",
                    description=description,
                )
                db.add(fault)
                db.flush()
                audit.record_event(
                    db, entity_type="fault_report", entity_id=fault.id,
                    action="detect", actor_id=actor_id,
                    payload={
                        "asset_id": asset.id,
                        "reading_id": reading.id,
                        "severity": severity,
                        "health_ratio": health_ratio,
                        "origin": "telemetry_rollup",
                    },
                )
                fault_id = fault.id

        results.append({
            "asset_id": asset.id,
            "reading_id": reading.id,
            "reading_date": agg.reading_date,
            "energy_kwh": agg.energy_kwh,
            "severity": severity,
            "health_ratio": health_ratio,
            "fault_id": fault_id,
        })

    db.commit()
    return results
