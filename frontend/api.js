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

/**
 * Fetch fleet summary metrics from API
 */
export async function fetchFleetMetrics() {
  try {
    const res = await fetch(`${API_BASE}/api/metrics/summary`);
    if (res.ok) return await res.json();
  } catch (e) {
    // API unready
  }
  return null;
}

/**
 * Fetch active alerts from API
 */
export async function fetchAlerts() {
  try {
    const res = await fetch(`${API_BASE}/api/alerts`);
    if (res.ok) return await res.json();
  } catch (e) {
    // API unready
  }
  return null;
}

/**
 * Fetch work orders from API
 */
export async function fetchWorkOrders() {
  try {
    const res = await fetch(`${API_BASE}/api/work-orders`);
    if (res.ok) return await res.json();
  } catch (e) {
    // API unready
  }
  return null;
}

/**
 * Post work order / telemetry data to backend API
 */
export async function postWorkOrder(payload) {
  try {
    const res = await fetch(`${API_BASE}/api/work-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (e) {
    console.error('API Error submitting work order:', e);
    return false;
  }
}

/**
 * Post telemetry object directly to http://localhost:8000/Stationmetrics
 */
export async function postTelemetry(telemetry) {
  try {
    const res = await fetch(`${API_BASE}/Stationmetrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(telemetry),
    });
    return res.ok;
  } catch (e) {
    console.error('API Error posting telemetry:', e);
    return false;
  }
}
