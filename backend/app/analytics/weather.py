"""Weather input — hourly irradiance and temperature behind an adapter.

The performance model needs global horizontal irradiance (GHI) and air
temperature for the period a reading covers. This module isolates that I/O
behind a small :class:`WeatherProvider` protocol so the engine can be exercised
offline with a :class:`StaticWeatherProvider`, while production uses
:class:`OpenMeteoProvider` (Open-Meteo: free, no API key).

Only the Python standard library is used (``urllib``), keeping the backend
dependency-light and deployable on modest infrastructure.
"""

from __future__ import annotations

import json
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Protocol

DEFAULT_TIMEOUT_S = 15.0
_OPEN_METEO_FORECAST = "https://api.open-meteo.com/v1/forecast"
# GHI is Open-Meteo's `shortwave_radiation` (W/m^2); air temp is `temperature_2m`.
_HOURLY_VARS = "shortwave_radiation,temperature_2m"


@dataclass(frozen=True)
class WeatherSample:
    """One hourly observation."""

    timestamp: datetime      # timezone-aware, UTC
    ghi_wm2: float           # global horizontal irradiance, W/m^2
    air_temp_c: float        # 2 m air temperature, degC


class WeatherProvider(Protocol):
    """Anything that can supply hourly weather for a location and window."""

    def hourly(self, latitude: float, longitude: float,
               start: datetime, end: datetime) -> list[WeatherSample]:
        ...


class StaticWeatherProvider:
    """Deterministic provider for tests and offline runs."""

    def __init__(self, samples: list[WeatherSample]):
        self._samples = list(samples)

    def hourly(self, latitude: float, longitude: float,
               start: datetime, end: datetime) -> list[WeatherSample]:
        start_u, end_u = _as_utc(start), _as_utc(end)
        return [s for s in self._samples if start_u <= s.timestamp <= end_u]


class OpenMeteoProvider:
    """Fetch hourly GHI and temperature from the Open-Meteo forecast API."""

    def __init__(self, timeout_s: float = DEFAULT_TIMEOUT_S,
                 base_url: str = _OPEN_METEO_FORECAST):
        self._timeout = timeout_s
        self._base_url = base_url

    def hourly(self, latitude: float, longitude: float,
               start: datetime, end: datetime) -> list[WeatherSample]:
        start_u, end_u = _as_utc(start), _as_utc(end)
        query = urllib.parse.urlencode({
            "latitude": f"{latitude:.4f}",
            "longitude": f"{longitude:.4f}",
            "hourly": _HOURLY_VARS,
            "start_date": start_u.date().isoformat(),
            "end_date": end_u.date().isoformat(),
            "timezone": "UTC",
        })
        url = f"{self._base_url}?{query}"
        req = urllib.request.Request(url, headers={"User-Agent": "SolarHand/1.0"})
        with urllib.request.urlopen(req, timeout=self._timeout) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
        return _parse_open_meteo(payload, start_u, end_u)


def _parse_open_meteo(payload: dict, start_u: datetime, end_u: datetime
                      ) -> list[WeatherSample]:
    hourly = payload.get("hourly") or {}
    times = hourly.get("time") or []
    ghi = hourly.get("shortwave_radiation") or []
    temp = hourly.get("temperature_2m") or []
    samples: list[WeatherSample] = []
    for t, g, a in zip(times, ghi, temp):
        if g is None or a is None:
            continue
        ts = datetime.fromisoformat(t)
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        if start_u <= ts <= end_u:
            samples.append(WeatherSample(ts, float(g), float(a)))
    return samples


def _as_utc(moment: datetime) -> datetime:
    if moment.tzinfo is None:
        return moment.replace(tzinfo=timezone.utc)
    return moment.astimezone(timezone.utc)
