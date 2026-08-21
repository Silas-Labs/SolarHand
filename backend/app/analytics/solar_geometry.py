"""Solar geometry — sun position and surface angles (pure stdlib).

Standard, well-documented astronomy so every number is auditable (a deliberate
fit for the "Digital Twin Lite" positioning and EPRA compliance story — no
black-box dependency). Formulas follow the NOAA Solar Calculator / Spencer
(declination, equation of time) and Duffie & Beckman, *Solar Engineering of
Thermal Processes* (angle of incidence).

Angle conventions
-----------------
* Latitude ``phi``: degrees, north positive (Kisumu ≈ -0.1).
* Longitude: degrees, east positive.
* Azimuth (both sun and panel): degrees clockwise from **North**
  (0 = N, 90 = E, 180 = S, 270 = W) — the same convention stored on ``Asset``
  and used by pvlib.
* Tilt ``beta``: degrees from horizontal (0 = flat, 90 = vertical).

All trig is done in radians internally; inputs/outputs are degrees.
"""

from __future__ import annotations

import math
from datetime import datetime, timezone

SOLAR_CONSTANT = 1367.0  # W/m^2, mean extraterrestrial normal irradiance (Gsc)


def day_of_year(moment: datetime) -> int:
    """Day-of-year (1..366) for an aware/naive datetime (UTC assumed)."""
    return moment.timetuple().tm_yday


def _fractional_year_rad(moment: datetime) -> float:
    """NOAA fractional year gamma, in radians."""
    moment = _as_utc(moment)
    n = day_of_year(moment)
    hour = moment.hour + moment.minute / 60 + moment.second / 3600
    days_in_year = 366 if _is_leap(moment.year) else 365
    return 2 * math.pi / days_in_year * (n - 1 + (hour - 12) / 24)


def _is_leap(year: int) -> bool:
    return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)


def _as_utc(moment: datetime) -> datetime:
    if moment.tzinfo is None:
        return moment.replace(tzinfo=timezone.utc)
    return moment.astimezone(timezone.utc)


def declination_deg(moment: datetime) -> float:
    """Solar declination (deg) via the Spencer/NOAA Fourier series."""
    g = _fractional_year_rad(moment)
    decl_rad = (
        0.006918
        - 0.399912 * math.cos(g)
        + 0.070257 * math.sin(g)
        - 0.006758 * math.cos(2 * g)
        + 0.000907 * math.sin(2 * g)
        - 0.002697 * math.cos(3 * g)
        + 0.001480 * math.sin(3 * g)
    )
    return math.degrees(decl_rad)


def equation_of_time_min(moment: datetime) -> float:
    """Equation of time (minutes) — NOAA."""
    g = _fractional_year_rad(moment)
    return 229.18 * (
        0.000075
        + 0.001868 * math.cos(g)
        - 0.032077 * math.sin(g)
        - 0.014615 * math.cos(2 * g)
        - 0.040849 * math.sin(2 * g)
    )


def hour_angle_deg(moment: datetime, longitude_deg: float) -> float:
    """Hour angle (deg): 0 at solar noon, negative morning, positive afternoon."""
    moment = _as_utc(moment)
    eqtime = equation_of_time_min(moment)
    # Minutes of true solar time; longitude east positive, UTC input (no tz term).
    minutes_utc = moment.hour * 60 + moment.minute + moment.second / 60
    true_solar_time = minutes_utc + eqtime + 4 * longitude_deg
    return true_solar_time / 4 - 180


def extraterrestrial_normal_irradiance(moment: datetime) -> float:
    """Extraterrestrial irradiance on a sun-normal surface (W/m^2)."""
    n = day_of_year(moment)
    return SOLAR_CONSTANT * (1 + 0.033 * math.cos(2 * math.pi * n / 365))


def solar_position(moment: datetime, latitude_deg: float, longitude_deg: float
                   ) -> tuple[float, float]:
    """Return ``(zenith_deg, azimuth_deg)`` of the sun.

    Azimuth is clockwise from North (0..360). Near/after sunset the zenith
    exceeds 90; callers should treat elevation <= 0 as "sun down".
    """
    phi = math.radians(latitude_deg)
    decl = math.radians(declination_deg(moment))
    ha = math.radians(hour_angle_deg(moment, longitude_deg))

    cos_zenith = math.sin(phi) * math.sin(decl) + math.cos(phi) * math.cos(decl) * math.cos(ha)
    cos_zenith = max(-1.0, min(1.0, cos_zenith))
    zenith = math.acos(cos_zenith)

    # Azimuth measured from south (Duffie-Beckman), +ve toward west, then
    # rotated into the 0=N clockwise convention.
    az_from_south = math.atan2(
        math.sin(ha),
        math.cos(ha) * math.sin(phi) - math.tan(decl) * math.cos(phi),
    )
    azimuth = (math.degrees(az_from_south) + 180.0) % 360.0
    return math.degrees(zenith), azimuth


def solar_elevation_deg(moment: datetime, latitude_deg: float, longitude_deg: float
                        ) -> float:
    """Convenience: solar elevation above the horizon (deg)."""
    zenith, _ = solar_position(moment, latitude_deg, longitude_deg)
    return 90.0 - zenith


def angle_of_incidence_deg(zenith_deg: float, sun_azimuth_deg: float,
                           tilt_deg: float, surface_azimuth_deg: float) -> float:
    """Angle between the sun's rays and the panel normal (deg).

    ``cos(AOI) = cos(zenith)cos(tilt) + sin(zenith)sin(tilt)cos(sun_az - surf_az)``
    """
    zenith = math.radians(zenith_deg)
    tilt = math.radians(tilt_deg)
    delta_az = math.radians(sun_azimuth_deg - surface_azimuth_deg)
    cos_aoi = (
        math.cos(zenith) * math.cos(tilt)
        + math.sin(zenith) * math.sin(tilt) * math.cos(delta_az)
    )
    cos_aoi = max(-1.0, min(1.0, cos_aoi))
    return math.degrees(math.acos(cos_aoi))
