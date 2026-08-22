"""Labeled device simulator — a stand-in for a gateway on a roof.

This is **explicitly a simulator**, not a live fleet: it synthesises physically
plausible telemetry for a connected site and POSTs it to the *real* ingestion
endpoint (``POST /telemetry``) with the same ``X-Gateway-Key`` a field gateway
would use. It proves the pipeline end to end — adapter → validation → dedupe →
storage → live diagnosis → rollup → forecast — without needing hardware. PAYG
solar already streams state over GSM across rural Kenya, so the *approach* is
field-proven; this tool simply plays the part of that device.

Two shapes of run:

* ``--live``   post samples for the recent window up to "now" (optionally loop),
  to demo live diagnosis and the asset panel.
* ``--backfill N`` post N completed days of history so ``/telemetry/rollup`` has
  something to score and the forecaster has a trend.

Fault injection makes the "why" visible on demand::

    python -m app.telemetry.simulator --backfill 6
    python -m app.telemetry.simulator --live --inject string_outage
    python -m app.telemetry.simulator --live --inject inverter_fault
    python -m app.telemetry.simulator --live --inject thermal
    python -m app.telemetry.simulator --backfill 6 --inject soiling

``--dry-run`` prints the batch JSON instead of sending it (no server needed), so
the sample-generation logic is unit-testable offline.

Pure stdlib only (``math``/``json``/``urllib``) — no third-party HTTP client.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import date, datetime, time as dtime, timedelta, timezone
from typing import Any

# Kisumu daylight, expressed in UTC (Kenya is UTC+3): ~06:30–18:30 local.
SUNRISE_UTC = 3.5
SUNSET_UTC = 15.5

# Nominal DC string voltage when a healthy string is producing.
NOMINAL_STRING_V = 615.0
DEFAULT_STRINGS = 2

INJECTIONS = ("none", "string_outage", "inverter_fault", "thermal", "soiling")


# ---------------------------------------------------------------------------
# Pure sample generation (no network — unit-testable)
# ---------------------------------------------------------------------------


def _daylight_fraction(hour_utc: float) -> float:
    """A 0..1 bell over the daylight window (sine), 0 at night."""
    if hour_utc <= SUNRISE_UTC or hour_utc >= SUNSET_UTC:
        return 0.0
    span = SUNSET_UTC - SUNRISE_UTC
    return math.sin(math.pi * (hour_utc - SUNRISE_UTC) / span)


def _peak_kw(daily_kwh: float) -> float:
    """Peak AC power (kW) for a sine bell that integrates to ``daily_kwh``.

    ∫ sin over the daylight window = (2/π)·peak·span, so peak = daily·π/(2·span).
    """
    span = SUNSET_UTC - SUNRISE_UTC
    return daily_kwh * math.pi / (2.0 * span)


def default_daily_kwh(kwp: float) -> float:
    """A plausible clear-day AC energy for a ``kwp`` system in Kisumu.

    Calibrated to ~4.7 kWh/kWp — the clear-sky AC yield the physics engine models
    for this equatorial, well-tilted site (confirmed by probing ``expected_ac_kwh``)
    — so a healthy day lands near a 1.0 health ratio rather than looking derated.
    Expressed as ~5.7 peak-sun-hours at the array plane × a ~0.82 system derate.
    A demo heuristic for the simulator's default, not a yield model: real days vary
    with weather, so health drifts around 1.0 accordingly.
    """
    return round(kwp * 5.7 * 0.82, 2)


def build_sample(
    ts: datetime,
    *,
    kwp: float,
    daily_kwh: float,
    step_hours: float,
    strings: int = DEFAULT_STRINGS,
    inject: str = "none",
) -> dict[str, Any]:
    """Build one canonical telemetry sample for ``ts`` (UTC).

    Returns the same dict shape :class:`app.schemas.TelemetrySampleIn` expects.
    Fault injections perturb specific channels so the rule-based diagnosis (or,
    for soiling, the energy-based physics check) fires realistically.
    """
    ts = ts.astimezone(timezone.utc)
    hour = ts.hour + ts.minute / 60.0
    frac = _daylight_fraction(hour)
    peak_kw = _peak_kw(daily_kwh)

    producing = frac > 0.02
    power_kw = peak_kw * frac
    string_v = [round(NOMINAL_STRING_V + (i * 3.0), 1) if producing else 0.0
                for i in range(strings)]
    module_temp = round(24.0 + frac * 30.0, 1)         # 24°C ambient → ~54°C hot
    inverter_status = "ok"
    inverter_code: str | None = None
    grid_v = 240.0 if producing else 0.0

    if inject == "soiling":
        # Uniform ~30% energy loss — no channel anomaly; the physics check catches
        # it as underperformance (the honest limit of channel-only diagnosis).
        power_kw *= 0.70
    elif inject == "string_outage" and producing:
        # One string open-circuit (~0 V); its share of power vanishes.
        dead = strings - 1
        string_v[dead] = 0.6
        power_kw *= (strings - 1) / strings
    elif inject == "inverter_fault" and producing:
        inverter_status = "fault"
        inverter_code = "F013"
        power_kw = 0.0
        string_v = [round(NOMINAL_STRING_V, 1) for _ in range(strings)]  # DC up, AC dead
    elif inject == "thermal" and producing:
        module_temp = round(70.0 + frac * 8.0, 1)      # hot enough to derate
        power_kw *= 0.88

    ac_power_w = round(power_kw * 1000.0, 1)
    energy_kwh = round(power_kw * step_hours, 5)
    dc_current_a = round((ac_power_w / sum(v for v in string_v if v > 1)), 2) \
        if any(v > 1 for v in string_v) and ac_power_w > 0 else 0.0

    return {
        "ts": ts.replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "ac_power_w": ac_power_w,
        "energy_kwh": energy_kwh,
        "dc_string_voltages": string_v,
        "dc_current_a": dc_current_a,
        "inverter_status": inverter_status,
        "inverter_code": inverter_code,
        "module_temp_c": module_temp,
        "grid_voltage_v": grid_v,
        "raw": {"sim": True, "inject": inject},
    }


def generate_day(
    day: date,
    *,
    kwp: float,
    daily_kwh: float,
    step_min: int = 15,
    inject: str = "none",
) -> list[dict[str, Any]]:
    """Generate a full daylight day of samples at ``step_min`` spacing."""
    step_hours = step_min / 60.0
    samples: list[dict[str, Any]] = []
    minute = int(SUNRISE_UTC * 60)
    end_minute = int(SUNSET_UTC * 60)
    while minute <= end_minute:
        ts = datetime.combine(day, dtime(0, 0), tzinfo=timezone.utc) + \
            timedelta(minutes=minute)
        samples.append(build_sample(ts, kwp=kwp, daily_kwh=daily_kwh,
                                    step_hours=step_hours, inject=inject))
        minute += step_min
    return samples


def generate_window(
    end: datetime,
    hours: float,
    *,
    kwp: float,
    daily_kwh: float,
    step_min: int = 15,
    inject: str = "none",
) -> list[dict[str, Any]]:
    """Generate samples for the ``hours`` window ending at ``end`` (UTC)."""
    step_hours = step_min / 60.0
    start = end - timedelta(hours=hours)
    samples: list[dict[str, Any]] = []
    t = start
    while t <= end:
        samples.append(build_sample(t, kwp=kwp, daily_kwh=daily_kwh,
                                    step_hours=step_hours, inject=inject))
        t += timedelta(minutes=step_min)
    return samples


# ---------------------------------------------------------------------------
# Network (guarded so --dry-run needs no server)
# ---------------------------------------------------------------------------


def build_batch(device_id: str, samples: list[dict], asset_id: str | None = None,
                fmt: str = "canonical") -> dict[str, Any]:
    batch: dict[str, Any] = {"device_id": device_id, "format": fmt,
                             "samples": samples}
    if asset_id:
        batch["asset_id"] = asset_id
    return batch


def post_batch(url: str, key: str, batch: dict) -> dict:
    """POST one batch to the ingestion endpoint; returns the parsed response."""
    endpoint = url.rstrip("/") + "/telemetry"
    data = json.dumps(batch).encode("utf-8")
    req = urllib.request.Request(
        endpoint, data=data, method="POST",
        headers={"Content-Type": "application/json", "X-Gateway-Key": key},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:  # noqa: S310 (trusted local URL)
        return json.loads(resp.read().decode("utf-8"))


def _send(url: str, key: str, batch: dict, dry_run: bool, label: str) -> None:
    if dry_run:
        print(f"[dry-run] {label}: {len(batch['samples'])} samples")
        print(json.dumps(batch, indent=2))
        return
    try:
        resp = post_batch(url, key, batch)
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", "replace")
        print(f"[error] {label}: HTTP {exc.code} — {body}", file=sys.stderr)
        return
    except urllib.error.URLError as exc:
        print(f"[error] {label}: cannot reach {url} — {exc.reason}", file=sys.stderr)
        return
    extra = ""
    if resp.get("diagnosis_fault_id"):
        extra = f"  ⚠ live diagnosis fault {resp['diagnosis_fault_id']}"
    print(f"[ok] {label}: accepted={resp.get('accepted')} "
          f"duplicates={resp.get('duplicates')}{extra}")


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="python -m app.telemetry.simulator",
        description="Labeled solar-gateway telemetry simulator for SolarHand.",
    )
    p.add_argument("--url", default=os.getenv("SOLARHAND_API_URL",
                                              "http://localhost:8000"))
    p.add_argument("--key", default=os.getenv("SOLARHAND_GATEWAY_KEY",
                                              "dev-gateway-key-change-me"))
    p.add_argument("--device", default="GW-CLINIC-01",
                   help="Gateway device_id (must match a connected asset).")
    p.add_argument("--asset-id", default=None,
                   help="Optional asset id to disambiguate the device.")
    p.add_argument("--kwp", type=float, default=8.4, help="System DC nameplate.")
    p.add_argument("--daily-kwh", type=float, default=None,
                   help="Target clear-day energy (defaults to a Kisumu estimate).")
    p.add_argument("--step-min", type=int, default=15, help="Sample spacing (min).")
    p.add_argument("--inject", choices=INJECTIONS, default="none",
                   help="Inject a fault signature into the generated samples.")
    mode = p.add_mutually_exclusive_group()
    mode.add_argument("--live", action="store_true",
                      help="Post the recent window up to now.")
    mode.add_argument("--backfill", type=int, metavar="DAYS",
                      help="Post this many completed past days of history.")
    p.add_argument("--live-hours", type=float, default=3.0,
                   help="With --live, how many hours up to now to post.")
    p.add_argument("--loop", action="store_true",
                   help="With --live, keep posting a new sample each interval.")
    p.add_argument("--interval", type=float, default=15.0,
                   help="With --loop, seconds between posts.")
    p.add_argument("--dry-run", action="store_true",
                   help="Print batches instead of POSTing (no server needed).")
    return p


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    daily_kwh = args.daily_kwh if args.daily_kwh is not None \
        else default_daily_kwh(args.kwp)

    if args.backfill:
        today = datetime.now(timezone.utc).date()
        for n in range(args.backfill, 0, -1):
            day = today - timedelta(days=n)
            samples = generate_day(day, kwp=args.kwp, daily_kwh=daily_kwh,
                                   step_min=args.step_min, inject=args.inject)
            batch = build_batch(args.device, samples, args.asset_id)
            _send(args.url, args.key, batch, args.dry_run, f"backfill {day}")
        return 0

    if args.live:
        def _post_window() -> None:
            now = datetime.now(timezone.utc)
            samples = generate_window(now, args.live_hours, kwp=args.kwp,
                                      daily_kwh=daily_kwh, step_min=args.step_min,
                                      inject=args.inject)
            batch = build_batch(args.device, samples, args.asset_id)
            _send(args.url, args.key, batch, args.dry_run, "live")

        _post_window()
        if args.loop and not args.dry_run:
            print(f"[loop] posting every {args.interval:.0f}s — Ctrl-C to stop")
            try:
                while True:
                    time.sleep(args.interval)
                    now = datetime.now(timezone.utc)
                    step_hours = args.step_min / 60.0
                    sample = build_sample(now, kwp=args.kwp, daily_kwh=daily_kwh,
                                          step_hours=step_hours, inject=args.inject)
                    batch = build_batch(args.device, [sample], args.asset_id)
                    _send(args.url, args.key, batch, False, "live-tick")
            except KeyboardInterrupt:
                print("\n[loop] stopped")
        return 0

    _build_parser().print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
