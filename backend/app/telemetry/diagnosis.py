"""Rule-based telemetry diagnosis — the "why" behind underperformance.

A single energy number tells you a system is *down*; the device's diagnostic
channels tell you *why*. This module maps a telemetry sample's channels
(per-string DC voltages, inverter status/fault code, module temperature) to a
**probable cause** and a **recommended-parts** list that ride along on the work
order, so the technician's first trip is the fix.

Design choices
--------------
* **Pure and explainable.** No ML, no dependencies beyond the stdlib — a
  technician (or an EPRA auditor) can read the rules top to bottom. This is the
  honest core of the "predictive maintenance" story: rule-based *diagnosis*.
* **Robust to missing channels.** Every channel is optional; a device reports
  whatever subset it exposes, and a rule only fires when its inputs are present.
* **One primary diagnosis.** Rules are checked in severity order and the first
  match wins, because a work order needs a single clear action. Precedence:
  inverter fault → string outage → thermal derate. Lesser observations are
  still captured in the returned channel snapshot.

The classifier is deliberately conservative: when nothing in the channels looks
wrong it returns ``None`` and leaves the energy-based Digital Twin Lite to make
the performance call.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

# A DC string reading at or below this fraction of the healthy strings' median
# is treated as "dead" (open-circuit), provided at least one string is healthy.
_DEAD_STRING_FRACTION = 0.15
# Absolute floor (volts): below this a string is dead regardless of the others.
_DEAD_STRING_ABS_V = 30.0
# Module temperature (degC) above which output derating becomes significant.
_THERMAL_DERATE_C = 65.0
# Inverter status strings that mean "not producing".
_INVERTER_BAD_STATUS = {"fault", "offline", "error", "trip", "tripped", "alarm"}
_INVERTER_OK_CODES = {"", "0", "ok", "none", "normal"}


@dataclass(frozen=True)
class Diagnosis:
    """A rule-based verdict from a sample's diagnostic channels."""

    category: str            # FaultCategory (string_outage/inverter_fault/other/...)
    severity: str            # FaultSeverity (info/warning/critical)
    probable_cause: str
    recommended_parts: list[str]
    summary: str             # one-line description for FaultReport.description
    confidence: str = "medium"       # high/medium/low
    channels: dict[str, Any] = field(default_factory=dict)

    def as_detail(self) -> dict[str, Any]:
        """The structured payload stored on ``FaultReport.detail``."""
        return {
            "probable_cause": self.probable_cause,
            "recommended_parts": list(self.recommended_parts),
            "channels": dict(self.channels),
            "confidence": self.confidence,
        }


def _num(value: Any) -> float | None:
    """Coerce to float, or None if not a finite number."""
    try:
        f = float(value)
    except (TypeError, ValueError):
        return None
    if f != f or f in (float("inf"), float("-inf")):  # NaN / inf
        return None
    return f


def _dead_string_indices(voltages: list[Any]) -> tuple[list[int], list[float]]:
    """Return (1-based indices of dead strings, the healthy voltages).

    A string is "dead" when it sits at ~0 V while at least one sibling holds a
    normal voltage — the signature of an open circuit (blown fuse / disconnected
    connector), as opposed to a whole-array problem where *all* strings sag
    together (which reads as low energy, not a string outage).
    """
    nums = [_num(v) for v in voltages]
    healthy = [v for v in nums if v is not None and v >= _DEAD_STRING_ABS_V]
    if not healthy:
        return [], []
    median = sorted(healthy)[len(healthy) // 2]
    cutoff = max(_DEAD_STRING_ABS_V, median * _DEAD_STRING_FRACTION)
    dead = [i + 1 for i, v in enumerate(nums)
            if v is not None and v < cutoff]
    return dead, healthy


def diagnose(
    *,
    dc_string_voltages: list[Any] | None = None,
    inverter_status: str | None = None,
    inverter_code: str | None = None,
    ac_power_w: float | None = None,
    module_temp_c: float | None = None,
    **_ignored: Any,
) -> Diagnosis | None:
    """Classify one sample's channels into a probable cause, or ``None``.

    Rules are evaluated in descending severity so the returned diagnosis is the
    single most important action for the work order.
    """
    ac = _num(ac_power_w)
    temp = _num(module_temp_c)

    # --- Rule 1: inverter fault / trip (most blocking) --------------------
    status = (inverter_status or "").strip().lower()
    code = (inverter_code or "").strip()
    code_is_fault = code != "" and code.lower() not in _INVERTER_OK_CODES
    if status in _INVERTER_BAD_STATUS or code_is_fault:
        code_str = f" (code {code})" if code_is_fault else ""
        producing = ac is not None and ac > 0
        return Diagnosis(
            category="inverter_fault",
            severity="critical",
            probable_cause=(
                f"Inverter reporting '{status or 'fault'}'{code_str}"
                + ("" if producing else " with no AC output")
                + " — inverter trip or internal fault; power-cycle and, if it "
                "recurs, replace the faulting stage for this model."
            ),
            recommended_parts=[
                "inverter cooling fan (model-matched)",
                "inverter control/power board (model-matched)",
                "AC/DC isolator spare",
            ],
            summary=(
                f"Telemetry: inverter fault{code_str} — no/low AC output; "
                "likely inverter trip. Bring model-matched spares."
            ),
            confidence="high",
            channels=_snapshot(dc_string_voltages, status or None, code or None,
                               ac, temp),
        )

    # --- Rule 2: DC string outage ----------------------------------------
    if dc_string_voltages:
        dead, healthy = _dead_string_indices(list(dc_string_voltages))
        if dead and len(dead) < len(dc_string_voltages):
            which = ", ".join(str(i) for i in dead)
            plural = "s" if len(dead) > 1 else ""
            return Diagnosis(
                category="string_outage",
                severity="critical",
                probable_cause=(
                    f"DC string{plural} {which} open-circuit (~0 V) while the "
                    "other string(s) hold nominal voltage — a blown DC string "
                    "fuse or a disconnected/arcing MC4 connector on that string."
                ),
                recommended_parts=[
                    "DC string fuse (gPV, matched rating)",
                    "MC4 connector pair",
                    "spare DC combiner gland",
                ],
                summary=(
                    f"Telemetry: DC string{plural} {which} open-circuit — "
                    "isolated string outage, not array-wide soiling."
                ),
                confidence="high",
                channels=_snapshot(dc_string_voltages, status or None,
                                   code or None, ac, temp),
            )

    # --- Rule 3: thermal derating ----------------------------------------
    if temp is not None and temp >= _THERMAL_DERATE_C:
        return Diagnosis(
            category="other",
            severity="warning",
            probable_cause=(
                f"Module temperature {temp:.0f} °C is high enough to derate "
                "output — restricted airflow behind the array, or a hot roof "
                "cavity. Check standoff/ventilation gap and clear any obstruction."
            ),
            recommended_parts=[
                "roof standoff/spacer kit (raise array for airflow)",
            ],
            summary=(
                f"Telemetry: module temperature {temp:.0f} °C — thermal derating; "
                "check ventilation behind the array."
            ),
            confidence="medium",
            channels=_snapshot(dc_string_voltages, status or None, code or None,
                               ac, temp),
        )

    return None


def diagnose_sample(sample: Any) -> Diagnosis | None:
    """Diagnose from anything exposing the channel attributes (e.g. an ORM row).

    Kept import-light on purpose: reads attributes by name so it works on an ORM
    ``TelemetrySample``, a Pydantic model, or a plain object without importing
    any of them.
    """
    return diagnose(
        dc_string_voltages=getattr(sample, "dc_string_voltages", None),
        inverter_status=getattr(sample, "inverter_status", None),
        inverter_code=getattr(sample, "inverter_code", None),
        ac_power_w=getattr(sample, "ac_power_w", None),
        module_temp_c=getattr(sample, "module_temp_c", None),
    )


def _snapshot(voltages, status, code, ac, temp) -> dict[str, Any]:
    """A compact channel snapshot stored on the fault for traceability."""
    snap: dict[str, Any] = {}
    if voltages:
        snap["dc_string_voltages"] = [
            round(v, 1) if isinstance(v, (int, float)) else v for v in voltages
        ]
    if status:
        snap["inverter_status"] = status
    if code:
        snap["inverter_code"] = code
    if ac is not None:
        snap["ac_power_w"] = round(ac, 1)
    if temp is not None:
        snap["module_temp_c"] = round(temp, 1)
    return snap
