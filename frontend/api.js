const API_BASE = import.meta.env?.VITE_API_URL || 'http://localhost:8000';

/**
 * Fetch latest station telemetry data from the API endpoint.
 * Accepts both http://localhost:8000/Stationmetrics and http://localhost:8000/api/stations
 */
export async function fetchStationMetrics() {
  try {
    const res = await fetch(`${API_BASE}/Stationmetrics`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : (data.stations || [data]);
    }
  } catch (e) {
    // try REST endpoint as fallback
  }

  try {
    const res = await fetch(`${API_BASE}/api/stations`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // API unready or offline
  }

  return null;
}
