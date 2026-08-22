/* Display formatting — kept in one place so units and phrasing stay consistent
   across the app (labels are for the person reading a meter, not the database). */

import type {
  AnalyticsSeverity,
  FaultCategory,
  FaultSource,
  JobStatus,
  JobType,
} from "./types";

export function fmtEnergy(kwh: number, digits = 1): string {
  return `${kwh.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} kWh`;
}

export function fmtNumber(n: number, digits = 1): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** health_ratio (~1.0 = healthy) rendered as a percentage of expected. */
export function fmtRatioPct(ratio: number | null | undefined): string {
  if (ratio === null || ratio === undefined) return "—";
  return `${Math.round(ratio * 100)}%`;
}

export function fmtKwp(kwp: number): string {
  return `${fmtNumber(kwp, kwp < 10 ? 2 : 1)} kWp`;
}

export function fmtCoords(lat: number, lon: number): string {
  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

const DATE_FMT: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, DATE_FMT);
}

export function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return fmtDate(iso);
}

export function humanize(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const JOB_TYPE_LABEL: Record<JobType, string> = {
  install: "Installation",
  inspection: "Inspection",
  repair: "Repair",
  cleaning: "Cleaning",
  commissioning: "Commissioning",
};

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  done: "Done",
  cancelled: "Cancelled",
};

export const SEVERITY_LABEL: Record<AnalyticsSeverity, string> = {
  healthy: "Healthy",
  minor: "Minor loss",
  moderate: "Moderate loss",
  severe: "Severe loss",
  anomalous: "Anomalous",
  unknown: "Unknown",
};

export const FAULT_CATEGORY_LABEL: Record<FaultCategory, string> = {
  soiling: "Soiling",
  shading: "Shading",
  string_outage: "String outage",
  inverter_fault: "Inverter fault",
  clipping: "Clipping",
  wiring: "Wiring",
  other: "Other",
};

/** How a fault was raised — shown as a small provenance chip. */
export const FAULT_SOURCE_LABEL: Record<FaultSource, string> = {
  technician: "Reported",
  system: "Performance check",
  telemetry: "Device telemetry",
  forecast: "Forecast",
};

/** AC power, W → a compact "850 W" / "4.2 kW". */
export function fmtPower(watts: number | null | undefined): string {
  if (watts === null || watts === undefined) return "—";
  if (watts < 1000) return `${Math.round(watts)} W`;
  return `${fmtNumber(watts / 1000, watts < 10000 ? 2 : 1)} kW`;
}

export function fmtTemp(celsius: number | null | undefined): string {
  if (celsius === null || celsius === undefined) return "—";
  return `${Math.round(celsius)} °C`;
}

export function fmtVolts(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `${fmtNumber(v, 0)} V`;
}

/** Short local time (for a live-feed "last seen" stamp). */
export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/** Friendly labels for the diagnostic channel keys stored on a fault's detail. */
export const CHANNEL_LABEL: Record<string, string> = {
  dc_string_voltages: "DC string voltages",
  inverter_status: "Inverter status",
  inverter_code: "Inverter code",
  ac_power_w: "AC power",
  module_temp_c: "Module temp",
  grid_voltage_v: "Grid voltage",
  dc_current_a: "DC current",
};

/** Render a channel snapshot value for display (arrays, power, temp, etc.). */
export function fmtChannelValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) {
    return value.map((v) => (typeof v === "number" ? fmtNumber(v, 0) : String(v))).join(" · ");
  }
  if (typeof value === "number") {
    if (key === "ac_power_w") return fmtPower(value);
    if (key === "module_temp_c") return fmtTemp(value);
    if (key === "grid_voltage_v") return fmtVolts(value);
    return fmtNumber(value, 1);
  }
  return String(value);
}
