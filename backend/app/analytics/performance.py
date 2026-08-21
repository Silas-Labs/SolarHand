"""Performance model — expected energy and Performance Ratio.

Turns a plane-of-array irradiance series (from :mod:`irradiance`) plus air
temperature into the energy a *healthy* system of a given size should have
produced, then compares it against the technician's meter reading. The core
metric is the Performance Ratio (PR) of IEC 61724, with a temperature
correction so weather-driven module heating does not masquerade as a fault.

Definitions
-----------
* **Cell temperature** — NOCT model: ``T_cell = T_air + (NOCT-20)/800 * POA``.
* **Temperature factor** — ``1 + gamma*(T_cell - 25)`` with ``gamma`` the power
  coefficient (crystalline silicon ~ -0.004 /degC).
* **Expected DC energy** — ``sum( P_stc * (POA/1000) * temp_factor ) * dt``.
* **Reference yield** ``Yr`` — ``sum(POA)/1000 * dt`` (equivalent peak-sun hours).
* **Performance Ratio** — ``actual / expected``.

All pure functions of plain floats/lists, so the whole chain is offline-testable.
"""

from __future__ import annotations

from dataclasses import dataclass

G_STC = 1000.0          # reference irradiance, W/m^2
T_STC = 25.0            # reference cell temperature, degC
NOCT_DEFAULT = 45.0     # nominal operating cell temperature, degC
NOCT_AMBIENT = 20.0     # NOCT reference air temperature, degC
NOCT_IRRADIANCE = 800.0  # NOCT reference irradiance, W/m^2
GAMMA_DEFAULT = -0.004  # power temperature coefficient, per degC (c-Si)

# Fraction of temperature-corrected DC energy a *healthy* real system delivers
# to the meter after inverter, wiring, soiling and availability losses. Used to
# turn the raw DC ideal into an expected AC figure so a sound system scores ~1.
DEFAULT_SYSTEM_DERATE = 0.80


@dataclass(frozen=True)
class PerformanceSample:
    """One time step of environmental input."""

    poa_wm2: float       # plane-of-array irradiance, W/m^2
    air_temp_c: float    # ambient air temperature, degC


def cell_temperature(poa_wm2: float, air_temp_c: float,
                     noct_c: float = NOCT_DEFAULT) -> float:
    """Module cell temperature (degC) from the NOCT model."""
    return air_temp_c + (noct_c - NOCT_AMBIENT) / NOCT_IRRADIANCE * poa_wm2


def dc_temperature_factor(cell_temp_c: float,
                          gamma_per_c: float = GAMMA_DEFAULT) -> float:
    """DC power derate for cell temperature (1.0 at STC, <1 when hot)."""
    return max(0.0, 1.0 + gamma_per_c * (cell_temp_c - T_STC))


def expected_dc_power_kw(system_kwp: float, poa_wm2: float, cell_temp_c: float,
                         gamma_per_c: float = GAMMA_DEFAULT) -> float:
    """Instantaneous temperature-corrected DC power (kW) of an ideal system."""
    if poa_wm2 <= 0:
        return 0.0
    factor = dc_temperature_factor(cell_temp_c, gamma_per_c)
    return system_kwp * (poa_wm2 / G_STC) * factor


def reference_yield_hours(poa_series_wm2: list[float], step_hours: float) -> float:
    """Reference yield Yr (equivalent peak-sun hours) for the POA series."""
    return sum(max(0.0, p) for p in poa_series_wm2) / G_STC * step_hours


def expected_energy_kwh(
    samples: list[PerformanceSample],
    system_kwp: float,
    step_hours: float,
    gamma_per_c: float = GAMMA_DEFAULT,
    noct_c: float = NOCT_DEFAULT,
    system_derate: float = 1.0,
) -> float:
    """Expected energy (kWh) over the period.

    With ``system_derate = 1.0`` this is the temperature-corrected DC *ideal*.
    Pass a derate (e.g. :data:`DEFAULT_SYSTEM_DERATE`) to fold in the balance-of
    -system losses a healthy installation still incurs, yielding an expected AC
    figure a sound system should meet.
    """
    total = 0.0
    for s in samples:
        t_cell = cell_temperature(s.poa_wm2, s.air_temp_c, noct_c)
        total += expected_dc_power_kw(system_kwp, s.poa_wm2, t_cell, gamma_per_c)
    return total * step_hours * system_derate


def performance_ratio(actual_kwh: float, expected_kwh: float) -> float | None:
    """Performance Ratio ``actual / expected``; ``None`` if nothing was expected.

    ``None`` means the period carried no usable sun (e.g. night-only window), so
    performance cannot be judged rather than being judged as zero.
    """
    if expected_kwh <= 0:
        return None
    return actual_kwh / expected_kwh
