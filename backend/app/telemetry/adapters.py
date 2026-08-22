"""Device adapters — normalize any device's dialect to one canonical sample.

Every gateway/inverter speaks its own protocol and JSON shape. Rather than teach
the rest of the system every dialect, SolarHand normalizes **at the edge**: an
adapter converts a device's raw payload into one canonical sample shape, and
nothing downstream (ingestion, storage, physics, diagnosis) ever sees a brand
difference. That is precisely what "brand-agnostic telemetry" means here — an
architectural property (normalize-once, at ingestion), not a claim that we
already speak every vendor's wire protocol.

The canonical sample is a plain ``dict`` with the keys of
``app.schemas.TelemetrySampleIn`` (``ts`` required; all channels optional):

    {"ts": "2026-08-22T12:00:00Z", "ac_power_w": 10200.0,
     "energy_kwh": 19.2, "dc_string_voltages": [604.0, 602.0],
     "dc_current_a": 8.3, "inverter_status": "ok", "inverter_code": null,
     "module_temp_c": 51.0, "grid_voltage_v": 241.0, "raw": {...}}

This module is intentionally dependency-free (pure stdlib) so it is unit-testable
without a database or FastAPI, and so an adapter can also run inside a field
gateway if desired.
"""

from __future__ import annotations

from typing import Any, Callable, Iterable

# Canonical channel keys an adapter may emit (mirrors TelemetrySampleIn).
CANONICAL_KEYS = (
    "ts", "ac_power_w", "energy_kwh", "dc_string_voltages", "dc_current_a",
    "inverter_status", "inverter_code", "module_temp_c", "grid_voltage_v", "raw",
)


class AdapterError(ValueError):
    """Raised when a payload cannot be normalized by the chosen adapter."""


class Adapter:
    """Base class: turn a device's raw samples into canonical sample dicts."""

    format: str = "base"

    def normalize(self, raw_samples: Iterable[dict]) -> list[dict]:
        raise NotImplementedError


class CanonicalAdapter(Adapter):
    """The live path: input is already (near-)canonical.

    This is what our own gateway and the device simulator emit. It is not a
    no-op — it defends the boundary: it requires a timestamp, keeps only known
    channel keys, coerces obvious types, and preserves the *original* payload
    under ``raw`` for traceability (so the audit trail can show the exact bytes
    the adapter received).
    """

    format = "canonical"

    def normalize(self, raw_samples: Iterable[dict]) -> list[dict]:
        out: list[dict] = []
        for i, raw in enumerate(raw_samples):
            if not isinstance(raw, dict):
                raise AdapterError(f"sample {i} is not an object")
            ts = raw.get("ts") or raw.get("timestamp") or raw.get("time")
            if ts is None:
                raise AdapterError(f"sample {i} has no timestamp ('ts')")
            sample: dict[str, Any] = {"ts": ts}
            for key in CANONICAL_KEYS:
                if key in ("ts", "raw"):
                    continue
                if key in raw and raw[key] is not None:
                    sample[key] = raw[key]
            # Preserve the pre-normalization payload for traceability, unless the
            # caller already supplied its own ``raw``.
            sample["raw"] = raw.get("raw") if isinstance(raw.get("raw"), dict) else raw
            out.append(sample)
        return out


class SunSpecModbusAdapter(Adapter):
    """Documented stub for a real vendor protocol (SunSpec over Modbus/TCP).

    This is the clearly-marked extension point the README refers to: it shows
    *where* and *how* a production driver plugs in, without pretending one is
    finished. A real implementation would:

    1. Open a Modbus/TCP connection to the inverter's SunSpec interface.
    2. Read the common block (model 1) to identify the device, then the inverter
       model (101/103) for AC power, DC, status and fault codes, and — if
       present — the string/MPPT model (160) for per-string DC voltages.
    3. Map those register points onto :data:`CANONICAL_KEYS` and return the same
       canonical dicts :class:`CanonicalAdapter` produces.

    Kept as a stub on purpose: implementing it needs a real device (or a Modbus
    simulator) and the vendor's register map, which is out of scope for this
    build. It raises a clear error rather than silently returning nothing.
    """

    format = "sunspec"

    def normalize(self, raw_samples: Iterable[dict]) -> list[dict]:
        raise NotImplementedError(
            "SunSpec/Modbus adapter is a documented stub in this build. A "
            "production driver would read the inverter's SunSpec registers and "
            "map them onto the canonical sample shape (see CanonicalAdapter). "
            "Use format='canonical' with the bundled gateway/simulator today."
        )


# --- Registry --------------------------------------------------------------
_ADAPTERS: dict[str, Callable[[], Adapter]] = {
    CanonicalAdapter.format: CanonicalAdapter,
    SunSpecModbusAdapter.format: SunSpecModbusAdapter,
}


def get_adapter(fmt: str | None) -> Adapter:
    """Return an adapter instance for ``fmt`` (defaults to canonical)."""
    key = (fmt or "canonical").strip().lower()
    factory = _ADAPTERS.get(key)
    if factory is None:
        known = ", ".join(sorted(_ADAPTERS))
        raise AdapterError(f"unknown telemetry format '{fmt}'; known: {known}")
    return factory()


def available_formats() -> list[str]:
    return sorted(_ADAPTERS)
