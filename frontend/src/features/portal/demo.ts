/* Customer portal — demo dataset and pure helpers.
   ----------------------------------------------------------------------------
   The portal is a *customer-facing* surface: the organisations that own the
   solar installations (a school, a clinic, an SME) sign in to see how their
   systems are performing and to raise support requests with their installer.

   The installer/technician app authenticates against the real backend, but the
   backend has no "customer" accounts — so this portal runs on a self-contained,
   clearly-labelled demo dataset. That keeps it fully functional with no backend
   (e.g. on Vercel) and means it never touches the installer's real auth or the
   offline sync engine.

   Honesty note (matches the rest of SolarHand): performance here is *modelled*
   — expected output computed from the system's rating, location and the day's
   weather, compared against verified meter readings. SolarHand does not stream
   data off inverters, so nothing in here implies a live fleet feed. */

export type SiteHealth = "healthy" | "watch" | "action";

export interface PortalSite {
  id: string;
  name: string;
  locationName: string;
  county: string;
  systemKwp: number;
  /** Modelled performance ratio (actual ÷ expected), ~1.0 = on spec. */
  ratio: number;
  telemetryEnabled: boolean;
  commissionedOn: string; // ISO date
  moduleSummary: string;
  inverterSummary: string;
  lastVerifiedOn: string; // ISO date of the reading the ratio is based on
  /** ~kWh produced in the most recent full month (illustrative). */
  monthKwh: number;
  /** 6-month modelled performance-ratio history, oldest → newest. */
  history: number[];
  /** Present when the site needs attention — plain-language, owner-facing. */
  openIssue: string | null;
}

export interface PortalCustomer {
  org: string;
  contactName: string;
  contactEmail: string;
  county: string;
  installer: string;
  customerSince: string; // ISO month
  sites: PortalSite[];
}

export type ReportKind = "performance" | "compliance" | "savings";

export interface PortalReport {
  id: string;
  kind: ReportKind;
  title: string;
  period: string;
  issuedOn: string; // ISO date
  siteId: string | null; // null = whole portfolio
  summary: string;
  rows: Array<{ label: string; value: string }>;
}

export type TicketCategory =
  | "underperformance"
  | "outage"
  | "damage"
  | "billing"
  | "question"
  | "other";

export type TicketPriority = "low" | "normal" | "high";
export type TicketStatus = "open" | "in_review" | "scheduled" | "resolved";

export interface TicketUpdate {
  at: string; // ISO datetime
  by: string; // "You" or the installer name
  note: string;
  status: TicketStatus;
}

export interface Ticket {
  id: string;
  ref: string; // human reference, e.g. "SUP-2048"
  subject: string;
  siteId: string | null;
  category: TicketCategory;
  priority: TicketPriority;
  description: string;
  status: TicketStatus;
  createdAt: string; // ISO datetime
  updates: TicketUpdate[];
}

/* -- Demo credentials (shown on the portal login screen) ----------------- */
export const DEMO_EMAIL = "grace@stmonicas.ac.ke";
export const DEMO_PASSWORD = "solarhand";

/* -- The demo customer: a Kisumu girls' school with two arrays ----------- */
export const DEMO_CUSTOMER: PortalCustomer = {
  org: "St. Monica's Girls' High School",
  contactName: "Grace Achieng'",
  contactEmail: DEMO_EMAIL,
  county: "Kisumu",
  installer: "Lakeside Solar Ltd",
  customerSince: "2024-03",
  sites: [
    {
      id: "site-main",
      name: "Main campus array",
      locationName: "Administration & classrooms roof",
      county: "Kisumu",
      systemKwp: 40,
      ratio: 0.96,
      telemetryEnabled: true,
      commissionedOn: "2024-03-18",
      moduleSummary: "74 × Canadian Solar 550 W",
      inverterSummary: "Huawei SUN2000 40 kVA",
      lastVerifiedOn: "2026-08-19",
      monthKwh: 4320,
      history: [0.95, 0.97, 0.96, 0.94, 0.97, 0.96],
      openIssue: null,
    },
    {
      id: "site-dorm",
      name: "Dormitory block",
      locationName: "Girls' dormitory roof",
      county: "Kisumu",
      systemKwp: 12.5,
      ratio: 0.87,
      telemetryEnabled: false,
      commissionedOn: "2024-09-02",
      moduleSummary: "23 × Jinko 545 W",
      inverterSummary: "Growatt 12 kVA",
      lastVerifiedOn: "2026-08-17",
      monthKwh: 1180,
      history: [0.96, 0.95, 0.93, 0.91, 0.89, 0.87],
      openIssue:
        "Producing about 13% below expected. The pattern most closely matches panel soiling after the dry spell — a cleaning visit is recommended.",
    },
  ],
};

/* -- Seed support tickets (owner sees these on first sign-in) ------------ */
export const SEED_TICKETS: Ticket[] = [
  {
    id: "seed-2",
    ref: "SUP-2051",
    subject: "Cleaning quote for the dormitory panels",
    siteId: "site-dorm",
    category: "underperformance",
    priority: "normal",
    description:
      "SolarHand flagged the dormitory array as underperforming. Please send a quote for a cleaning visit.",
    status: "in_review",
    createdAt: "2026-08-18T08:12:00+03:00",
    updates: [
      {
        at: "2026-08-18T08:12:00+03:00",
        by: "You",
        note: "Request raised from the performance alert.",
        status: "open",
      },
      {
        at: "2026-08-18T14:40:00+03:00",
        by: "Lakeside Solar Ltd",
        note: "Received — we're preparing a cleaning quote and will confirm a visit date.",
        status: "in_review",
      },
    ],
  },
  {
    id: "seed-1",
    ref: "SUP-2016",
    subject: "Dormitory lights off in the morning",
    siteId: "site-dorm",
    category: "outage",
    priority: "high",
    description:
      "The dormitory had no power before sunrise for two days running. Please check.",
    status: "resolved",
    createdAt: "2026-06-12T06:30:00+03:00",
    updates: [
      {
        at: "2026-06-12T06:30:00+03:00",
        by: "You",
        note: "Reported no power before sunrise.",
        status: "open",
      },
      {
        at: "2026-06-12T09:05:00+03:00",
        by: "Lakeside Solar Ltd",
        note: "Technician assigned — visiting today.",
        status: "scheduled",
      },
      {
        at: "2026-06-12T15:20:00+03:00",
        by: "Lakeside Solar Ltd",
        note: "A tripped MCB on the battery circuit was reset and tested. Output restored; a follow-up reading confirmed recovery.",
        status: "resolved",
      },
    ],
  },
];

/* -- Reports available to the owner -------------------------------------- */
export const DEMO_REPORTS: PortalReport[] = [
  {
    id: "rep-main-perf",
    kind: "performance",
    title: "Monthly performance statement — Main campus array",
    period: "July 2026",
    issuedOn: "2026-08-01",
    siteId: "site-main",
    summary:
      "The main campus array performed on spec through July, holding a 96% performance ratio against modelled expectation.",
    rows: [
      { label: "System size", value: "40.0 kWp" },
      { label: "Energy produced", value: "4,320 kWh" },
      { label: "Modelled expected", value: "4,500 kWh" },
      { label: "Performance ratio (IEC 61724)", value: "96%" },
      { label: "Verdict", value: "Healthy — no action needed" },
    ],
  },
  {
    id: "rep-dorm-perf",
    kind: "performance",
    title: "Monthly performance statement — Dormitory block",
    period: "July 2026",
    issuedOn: "2026-08-01",
    siteId: "site-dorm",
    summary:
      "The dormitory array slipped to an 87% performance ratio in July, consistent with panel soiling. A cleaning visit is recommended.",
    rows: [
      { label: "System size", value: "12.5 kWp" },
      { label: "Energy produced", value: "1,180 kWh" },
      { label: "Modelled expected", value: "1,355 kWh" },
      { label: "Performance ratio (IEC 61724)", value: "87%" },
      { label: "Verdict", value: "Watch — cleaning recommended" },
    ],
  },
  {
    id: "rep-compliance",
    kind: "compliance",
    title: "EPRA compliance & maintenance record",
    period: "As of 21 Aug 2026",
    issuedOn: "2026-08-21",
    siteId: null,
    summary:
      "Both systems are maintained by an EPRA-licensed contractor, and every visit is recorded in a tamper-evident, hash-chained audit trail.",
    rows: [
      { label: "Maintaining contractor", value: "Lakeside Solar Ltd" },
      { label: "EPRA contractor licence", value: "T3/1189 — valid" },
      { label: "Systems covered", value: "2 (Main campus, Dormitory)" },
      { label: "Audit trail integrity", value: "Verified — chain intact" },
      { label: "Last inspection", value: "19 Aug 2026" },
    ],
  },
  {
    id: "rep-savings",
    kind: "savings",
    title: "Estimated annual savings summary",
    period: "Last 12 months",
    issuedOn: "2026-08-01",
    siteId: null,
    summary:
      "Estimated grid electricity avoided across both systems over the last 12 months, valued at an indicative commercial tariff.",
    rows: [
      { label: "Total energy produced", value: "≈ 66,000 kWh" },
      { label: "Indicative tariff", value: "KES 25 / kWh" },
      { label: "Estimated savings", value: "≈ KES 1,650,000" },
      { label: "Basis", value: "Modelled from verified readings — indicative only" },
    ],
  },
];

/* -- Pure helpers -------------------------------------------------------- */

export function healthOf(site: PortalSite): SiteHealth {
  if (site.ratio >= 0.93) return "healthy";
  if (site.ratio >= 0.8) return "watch";
  return "action";
}

export interface Verdict {
  label: string;
  tone: "go" | "warn" | "alert";
}

export function verdictOf(site: PortalSite): Verdict {
  const h = healthOf(site);
  if (h === "healthy") return { label: "Performing as expected", tone: "go" };
  if (h === "watch") return { label: "Needs attention", tone: "warn" };
  return { label: "Action required", tone: "alert" };
}

export const TICKET_CATEGORY_LABEL: Record<TicketCategory, string> = {
  underperformance: "Underperformance",
  outage: "Outage",
  damage: "Physical damage",
  billing: "Billing / PAYG",
  question: "Question",
  other: "Other",
};

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open",
  in_review: "In review",
  scheduled: "Visit scheduled",
  resolved: "Resolved",
};

export const TICKET_STATUS_TONE: Record<
  TicketStatus,
  "info" | "warn" | "amber" | "go"
> = {
  open: "info",
  in_review: "amber",
  scheduled: "warn",
  resolved: "go",
};

/** Turn a report into a CSV string for download (client-side, offline-safe). */
export function reportToCsv(report: PortalReport): string {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    ["SolarHand report", report.title].map(esc).join(","),
    ["Period", report.period].map(esc).join(","),
    ["Issued", report.issuedOn].map(esc).join(","),
    "",
    ["Metric", "Value"].map(esc).join(","),
    ...report.rows.map((r) => [r.label, r.value].map(esc).join(",")),
  ];
  return lines.join("\r\n");
}

/** Trigger a client-side file download (no server round-trip). */
export function downloadText(filename: string, text: string, mime = "text/csv"): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
