"""Irradiance modelling — split horizontal irradiance and project onto the array.

Given global horizontal irradiance (GHI, from Open-Meteo) and the sun position,
estimate the plane-of-array (POA) irradiance the modules actually receive:

1. **Decomposition** — split GHI into direct-normal (DNI) and diffuse-horizontal
   (DHI) using the Erbs et al. (1982) hourly correlation.
2. **Transposition** — project onto the tilted plane with the isotropic sky
   (Liu & Jordan) model plus ground reflection.

Pure functions of scalars, so the whole chain is unit-testable offline.
"""

from __future__ import annotations

import math

DEFAULT_ALBEDO = 0.20  # generic ground reflectance
# Below this solar elevation, treat the sun as down: geometry gets numerically
# unstable (1/cos(zenith)) and contribution is negligible.
_MIN_ELEVATION_DEG = 3.0


def erbs_diffuse_fraction(clearness_index: float) -> float:
    """Diffuse fraction (DHI/GHI) from the hourly clearness index kt (Erbs 1982)."""
    kt = max(0.0, min(1.0, clearness_index))
    if kt <= 0.22:
        return 1.0 - 0.09 * kt
    if kt <= 0.80:
        return (
            0.9511
            - 0.1604 * kt
            + 4.388 * kt**2
            - 16.638 * kt**3
            + 12.336 * kt**4
        )
    return 0.165


def decompose_ghi(ghi: float, zenith_deg: float, extra_normal: float
                  ) -> tuple[float, float]:
    """Split GHI (W/m^2) into ``(dni, dhi)`` given sun zenith and I0n.

    Returns ``(0.0, 0.0)`` when the sun is at/below the working horizon.
    """
    if ghi <= 0 or zenith_deg >= (90.0 - _MIN_ELEVATION_DEG):
        return 0.0, 0.0
    cos_z = math.cos(math.radians(zenith_deg))
    ghi_extra = extra_normal * cos_z  # horizontal extraterrestrial irradiance
    if ghi_extra <= 0:
        return 0.0, 0.0
    kt = ghi / ghi_extra
    diffuse_fraction = erbs_diffuse_fraction(kt)
    dhi = ghi * diffuse_fraction
    beam_horizontal = max(0.0, ghi - dhi)
    dni = beam_horizontal / cos_z
    return dni, dhi


def transpose_to_poa(
    ghi: float,
    dni: float,
    dhi: float,
    aoi_deg: float,
    tilt_deg: float,
    albedo: float = DEFAULT_ALBEDO,
) -> float:
    """Plane-of-array irradiance (W/m^2): isotropic sky + ground reflection."""
    tilt = math.radians(tilt_deg)
    beam = dni * max(0.0, math.cos(math.radians(aoi_deg)))
    diffuse = dhi * (1 + math.cos(tilt)) / 2
    ground = ghi * albedo * (1 - math.cos(tilt)) / 2
    return beam + diffuse + ground
