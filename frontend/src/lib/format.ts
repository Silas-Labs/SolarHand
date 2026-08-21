/* Display formatting — kept in one place so units and phrasing stay consistent
   across the app (labels are for the person reading a meter, not the database). */

import type {
  AnalyticsSeverity,
  FaultCategory,
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
