import React, { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Sun,
  AlertTriangle,
  Wrench,
  WifiOff,
  Users,
  ShieldAlert,
  CheckCircle2,
  Search,
  Bell,
  ChevronRight,
  Clock,
  Radio,
  MapPin,
  LayoutGrid,
  ListChecks,
  Hammer,
  UserRound,
  Building2,
  BarChart3,
  Settings,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const fontImport = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800;900&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

:root {
  --charcoal-950: #14181B;
  --charcoal-900: #191E21;
  --charcoal-800: #1F262A;
  --charcoal-700: #2A3236;
  --charcoal-600: #384145;
  --line: rgba(242,239,230,0.09);
  --line-strong: rgba(242,239,230,0.16);
  --green-deep: #1F4D3A;
  --green-bright: #59A17E;
  --gold: #E3A73D;
  --gold-dim: #B98A34;
  --off-white: #F2EFE6;
  --off-white-70: rgba(242,239,230,0.7);
  --off-white-50: rgba(242,239,230,0.5);
  --off-white-35: rgba(242,239,230,0.35);
  --red: #C24B34;
  --red-dim: rgba(194,75,52,0.16);
  --blue-sync: #6C8FA3;
  --font-display: 'Archivo', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;
}

.sh-root * { box-sizing: border-box; }
.sh-root { font-family: var(--font-body); }
.sh-display { font-family: var(--font-display); letter-spacing: -0.01em; }
.sh-mono { font-family: var(--font-mono); letter-spacing: 0.01em; }

.sh-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
.sh-scrollbar::-webkit-scrollbar-thumb { background: var(--charcoal-600); border-radius: 3px; }
.sh-scrollbar::-webkit-scrollbar-track { background: transparent; }

@keyframes sh-marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
.sh-pulse-track {
  display: flex;
  width: max-content;
  animation: sh-marquee 9s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .sh-pulse-track { animation: none; }
}

@keyframes sh-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
.sh-live-dot { animation: sh-blink 2.2s ease-in-out infinite; }

@keyframes sh-ping {
  0% { transform: scale(0.9); opacity: 0.7; }
  75%, 100% { transform: scale(2.2); opacity: 0; }
}
.sh-ping-ring { animation: sh-ping 2.4s cubic-bezier(0,0,0.2,1) infinite; }

.sh-focusable:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}

.sh-card {
  background: var(--charcoal-800);
  border: 1px solid var(--line);
}
.sh-card:hover { border-color: var(--line-strong); }

.sh-nav-item {
  color: var(--off-white-70);
  border-left: 2px solid transparent;
}
.sh-nav-item:hover { color: var(--off-white); background: rgba(242,239,230,0.03); }
.sh-nav-item.active {
  color: var(--off-white);
  background: rgba(227,167,61,0.08);
  border-left: 2px solid var(--gold);
}
`;

const metrics = [
  { label: "Fleet Uptime", value: "94.2%", delta: "+1.1%", up: true, icon: Sun, tone: "green" },
  { label: "Active Alerts", value: "23", delta: "+4", up: false, icon: AlertTriangle, tone: "gold" },
  { label: "Work Orders Active", value: "15", delta: "+2", up: true, icon: Wrench, tone: "default" },
  { label: "Systems Offline", value: "7", delta: "-2", up: true, icon: WifiOff, tone: "blue" },
  { label: "Technicians Dispatched", value: "12", delta: "of 18", up: null, icon: Users, tone: "default" },
  { label: "SLA At Risk", value: "4", delta: "urgent", up: false, icon: ShieldAlert, tone: "red" },
  { label: "Verified This Week", value: "31", delta: "+9", up: true, icon: CheckCircle2, tone: "green" },
];

const alerts = [
  {
    severity: "Critical",
    asset: "Inverter Array B",
    site: "Kisumu Central Mini-Grid",
    cause: "String voltage dropped 40% over 20 min",
    sla: "1h 12m",
    id: "AL-4821",
  },
  {
    severity: "Critical",
    asset: "Grid Connection Point",
    site: "Nakuru Agri Cooperative",
    cause: "Zero output recorded for 45 minutes",
    sla: "40m",
    id: "AL-4826",
  },
  {
    severity: "High",
    asset: "Battery Bank 2",
    site: "Turkana Solar Pump Station 4",
    cause: "Charge cycle anomaly, capacity fade suspected",
    sla: "3h 40m",
    id: "AL-4819",
  },
  {
    severity: "High",
    asset: "Telemetry Gateway",
    site: "Machakos Ridge Array 2",
    cause: "No telemetry received for 6 hours",
    sla: "2h 05m",
    id: "AL-4830",
  },
  {
    severity: "Medium",
    asset: "Panel Row 3",
    site: "Kwale Coastal Array",
    cause: "Output 18% below expected, soiling likely",
    sla: "1d 4h",
    id: "AL-4802",
  },
  {
    severity: "Medium",
    asset: "Charge Controller",
    site: "Garissa Relief Site",
    cause: "Overtemperature flag, non-critical threshold",
    sla: "6h 50m",
    id: "AL-4811",
  },
];

const severityStyle = {
  Critical: { color: "var(--red)", bg: "var(--red-dim)", label: "Critical" },
  High: { color: "var(--gold)", bg: "rgba(227,167,61,0.14)", label: "High" },
  Medium: { color: "var(--off-white-70)", bg: "rgba(242,239,230,0.07)", label: "Medium" },
};

const activity = [
  { time: "09:42", text: "Work order WO-3187 verified — Eldoret Water Board", type: "verified" },
  { time: "09:31", text: "Achieng M. dispatched to Kisumu Central Mini-Grid", type: "dispatch" },
  { time: "09:18", text: "New critical alert raised — Nakuru Agri Cooperative", type: "alert" },
  { time: "08:57", text: "Sync completed — 6 offline work orders uploaded", type: "sync" },
  { time: "08:40", text: "Barasa K. checked in on site — Machakos Ridge Array 2", type: "checkin" },
  { time: "08:12", text: "Work order WO-3181 submitted, awaiting telemetry", type: "pending" },
];

const activityDot = {
  verified: "var(--green-bright)",
  dispatch: "var(--gold)",
  alert: "var(--red)",
  sync: "var(--blue-sync)",
  checkin: "var(--gold)",
  pending: "var(--off-white-35)",
};

const regions = [
  { name: "Turkana", sites: 14, status: "gold", top: "10%", left: "24%" },
  { name: "Eldoret", sites: 9, status: "green", top: "28%", left: "16%" },
  { name: "Kisumu", sites: 22, status: "red", top: "40%", left: "11%" },
  { name: "Nakuru", sites: 18, status: "red", top: "47%", left: "31%" },
  { name: "Nairobi", sites: 27, status: "green", top: "60%", left: "44%" },
  { name: "Machakos", sites: 11, status: "gold", top: "64%", left: "54%" },
  { name: "Garissa", sites: 7, status: "gold", top: "34%", left: "76%" },
  { name: "Kwale", sites: 13, status: "green", top: "86%", left: "70%" },
];

const regionColor = {
  red: "var(--red)",
  gold: "var(--gold)",
  green: "var(--green-bright)",
};

const trendData = [
  { day: "Aug 8", uptime: 91.2 },
  { day: "Aug 9", uptime: 90.8 },
  { day: "Aug 10", uptime: 92.4 },
  { day: "Aug 11", uptime: 93.1 },
  { day: "Aug 12", uptime: 89.7 },
  { day: "Aug 13", uptime: 91.5 },
  { day: "Aug 14", uptime: 92.9 },
  { day: "Aug 15", uptime: 93.6 },
  { day: "Aug 16", uptime: 94.0 },
  { day: "Aug 17", uptime: 92.8 },
  { day: "Aug 18", uptime: 93.4 },
  { day: "Aug 19", uptime: 94.9 },
  { day: "Aug 20", uptime: 93.7 },
  { day: "Aug 21", uptime: 94.2 },
];

const navItems = [
  { label: "Dashboard", icon: LayoutGrid, active: true },
  { label: "Fleet", icon: MapPin },
  { label: "Alerts", icon: AlertTriangle },
  { label: "Work Orders", icon: ListChecks },
  { label: "Technicians", icon: UserRound },
  { label: "Sites", icon: Building2 },
  { label: "Analytics", icon: BarChart3 },
  { label: "Settings", icon: Settings },
];

function PulseWaveform() {
  // Build a single waveform path, then duplicate it for a seamless scroll loop.
  const points = [
    4, 6, 5, 9, 7, 14, 8, 5, 6, 10, 18, 9, 6, 5, 8, 22, 11, 6, 5, 7, 9, 6, 5,
    12, 15, 8, 6, 5, 9, 7,
  ];
  const w = 8;
  const h = 28;
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${i * w} ${h - p}`)
    .join(" ");

  const svg = (
    <svg
      width={points.length * w}
      height={h + 4}
      viewBox={`0 0 ${points.length * w} ${h + 4}`}
      fill="none"
      style={{ display: "block" }}
    >
      <path d={path} stroke="var(--green-bright)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <div
      className="relative overflow-hidden rounded"
      style={{ width: 260, height: 32, background: "var(--charcoal-900)", border: "1px solid var(--line)" }}
      role="img"
      aria-label="Live aggregate fleet telemetry pulse"
    >
      <div className="sh-pulse-track">
        {svg}
        {svg}
      </div>
      <div
        className="absolute inset-y-0 left-0 w-6 pointer-events-none"
        style={{ background: "linear-gradient(to right, var(--charcoal-900), transparent)" }}
      />
      <div
        className="absolute inset-y-0 right-0 w-6 pointer-events-none"
        style={{ background: "linear-gradient(to left, var(--charcoal-900), transparent)" }}
      />
    </div>
  );
}

function MetricCard({ metric }) {
  const Icon = metric.icon;
  const toneColor = {
    green: "var(--green-bright)",
    gold: "var(--gold)",
    red: "var(--red)",
    blue: "var(--blue-sync)",
    default: "var(--off-white-70)",
  }[metric.tone];

  return (
    <div className="sh-card rounded-md p-4 flex flex-col gap-3 min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide" style={{ color: "var(--off-white-50)" }}>
          {metric.label}
        </span>
        <Icon size={15} style={{ color: toneColor }} strokeWidth={2} />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="sh-display text-2xl font-bold" style={{ color: "var(--off-white)" }}>
          {metric.value}
        </span>
        {metric.up !== null && (
          <span
            className="sh-mono text-xs flex items-center gap-0.5"
            style={{ color: metric.up ? "var(--green-bright)" : "var(--red)" }}
          >
            {metric.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {metric.delta}
          </span>
        )}
        {metric.up === null && (
          <span className="sh-mono text-xs" style={{ color: "var(--off-white-50)" }}>
            {metric.delta}
          </span>
        )}
      </div>
    </div>
  );
}

function AlertRow({ alert }) {
  const s = severityStyle[alert.severity];
  return (
    <div
      className="sh-focusable flex items-start gap-3 px-4 py-3 rounded-md cursor-pointer transition-colors"
      style={{ borderLeft: `2px solid ${s.color}`, background: "rgba(242,239,230,0.02)" }}
      tabIndex={0}
    >
      <div className="flex flex-col items-start gap-1 shrink-0 w-16">
        <span
          className="sh-mono text-[10px] font-medium px-1.5 py-0.5 rounded"
          style={{ color: s.color, background: s.bg }}
        >
          {s.label}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-medium" style={{ color: "var(--off-white)" }}>
            {alert.asset}
          </span>
          <span className="sh-mono text-[11px]" style={{ color: "var(--off-white-35)" }}>
            {alert.id}
          </span>
        </div>
        <div className="text-xs mt-0.5" style={{ color: "var(--off-white-50)" }}>
          {alert.site}
        </div>
        <div className="text-xs mt-1" style={{ color: "var(--off-white-70)" }}>
          {alert.cause}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <div className="flex items-center gap-1 sh-mono text-xs" style={{ color: s.color }}>
          <Clock size={11} />
          {alert.sla}
        </div>
        <button
          className="sh-focusable flex items-center gap-1 text-xs px-2 py-1 rounded"
          style={{ color: "var(--charcoal-950)", background: "var(--gold)", fontWeight: 600 }}
        >
          Dispatch
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      className="sh-mono text-xs px-2.5 py-1.5 rounded"
      style={{ background: "var(--charcoal-700)", border: "1px solid var(--line-strong)", color: "var(--off-white)" }}
    >
      <div style={{ color: "var(--off-white-50)" }}>{label}</div>
      <div style={{ color: "var(--green-bright)" }}>{payload[0].value}% uptime</div>
    </div>
  );
}

export default function SolarHandDashboard() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="sh-root w-full min-h-screen flex" style={{ background: "var(--charcoal-950)" }}>
      <style>{fontImport}</style>

      {/* Sidebar */}
      <aside
        className="hidden md:flex flex-col shrink-0 w-56"
        style={{ background: "var(--charcoal-900)", borderRight: "1px solid var(--line)" }}
      >
        <div className="flex items-center gap-2.5 px-5 py-5" style={{ borderBottom: "1px solid var(--line)" }}>
          <div
            className="w-7 h-7 rounded flex items-center justify-center shrink-0"
            style={{ background: "var(--green-deep)" }}
          >
            <Sun size={15} style={{ color: "var(--gold)" }} strokeWidth={2.5} />
          </div>
          <span className="sh-display text-[15px] font-bold" style={{ color: "var(--off-white)" }}>
            SolarHand
          </span>
        </div>

        <nav className="flex-1 py-3 flex flex-col gap-0.5 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.label}
                href="#"
                className={`sh-nav-item sh-focusable flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors ${
                  item.active ? "active" : ""
                }`}
              >
                <Icon size={16} strokeWidth={2} />
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="px-4 py-4" style={{ borderTop: "1px solid var(--line)" }}>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center sh-display text-xs font-bold"
              style={{ background: "var(--green-deep)", color: "var(--off-white)" }}
            >
              JM
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium truncate" style={{ color: "var(--off-white)" }}>
                Jomo Mwangi
              </div>
              <div className="text-[11px] truncate" style={{ color: "var(--off-white-50)" }}>
                Ops Manager
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header
          className="flex items-center justify-between gap-4 px-5 md:px-7 py-3.5 sticky top-0 z-10"
          style={{ background: "var(--charcoal-950)", borderBottom: "1px solid var(--line)" }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0 max-w-md">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-md flex-1"
              style={{ background: "var(--charcoal-800)", border: "1px solid var(--line)" }}
            >
              <Search size={14} style={{ color: "var(--off-white-35)" }} />
              <input
                placeholder="Search sites, assets, work orders…"
                className="bg-transparent outline-none text-sm flex-1 min-w-0"
                style={{ color: "var(--off-white)" }}
              />
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <div className="relative flex items-center">
              <span className="sh-live-dot relative flex h-2 w-2 mr-2">
                <span
                  className="absolute inline-flex h-full w-full rounded-full"
                  style={{ background: "var(--green-bright)" }}
                />
              </span>
              <span className="sh-mono text-[11px]" style={{ color: "var(--off-white-50)" }}>
                SYSTEM PULSE
              </span>
            </div>
            <PulseWaveform />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="sh-mono text-xs hidden sm:block" style={{ color: "var(--off-white-35)" }}>
              {time.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })} EAT
            </span>
            <button
              className="sh-focusable relative w-8 h-8 rounded-md flex items-center justify-center"
              style={{ background: "var(--charcoal-800)", border: "1px solid var(--line)" }}
            >
              <Bell size={14} style={{ color: "var(--off-white-70)" }} />
              <span
                className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full sh-mono text-[9px] flex items-center justify-center"
                style={{ background: "var(--red)", color: "var(--off-white)" }}
              >
                4
              </span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-5 md:px-7 py-6 flex flex-col gap-6 sh-scrollbar overflow-y-auto">
          <div>
            <h1 className="sh-display text-xl font-bold" style={{ color: "var(--off-white)" }}>
              Operations Overview
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--off-white-50)" }}>
              Fleet status across 121 sites · last refreshed 40 seconds ago
            </p>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {metrics.map((m) => (
              <MetricCard key={m.label} metric={m} />
            ))}
          </div>

          {/* Alerts + Regional coverage */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
            <div className="sh-card rounded-md xl:col-span-3 flex flex-col min-w-0">
              <div
                className="flex items-center justify-between px-4 py-3.5"
                style={{ borderBottom: "1px solid var(--line)" }}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle size={15} style={{ color: "var(--gold)" }} />
                  <h2 className="text-sm font-semibold" style={{ color: "var(--off-white)" }}>
                    Priority Alerts
                  </h2>
                </div>
                <a
                  href="#"
                  className="sh-focusable text-xs flex items-center gap-0.5"
                  style={{ color: "var(--gold)" }}
                >
                  View all 23
                  <ChevronRight size={12} />
                </a>
              </div>
              <div className="flex flex-col gap-1.5 p-2">
                {alerts.map((a) => (
                  <AlertRow key={a.id} alert={a} />
                ))}
              </div>
            </div>

            <div className="sh-card rounded-md xl:col-span-2 flex flex-col min-w-0">
              <div
                className="flex items-center justify-between px-4 py-3.5"
                style={{ borderBottom: "1px solid var(--line)" }}
              >
                <div className="flex items-center gap-2">
                  <Radio size={15} style={{ color: "var(--green-bright)" }} />
                  <h2 className="text-sm font-semibold" style={{ color: "var(--off-white)" }}>
                    Regional Coverage
                  </h2>
                </div>
                <span className="sh-mono text-[11px]" style={{ color: "var(--off-white-35)" }}>
                  8 regions
                </span>
              </div>

              <div className="relative flex-1 min-h-[240px] m-3 rounded overflow-hidden" style={{ background: "var(--charcoal-900)" }}>
                <svg className="absolute inset-0 w-full h-full opacity-40" preserveAspectRatio="none">
                  <defs>
                    <pattern id="sh-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="var(--line)" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#sh-grid)" />
                </svg>
                {regions.map((r) => (
                  <div
                    key={r.name}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
                    style={{ top: r.top, left: r.left }}
                  >
                    <div className="relative flex items-center justify-center">
                      {r.status === "red" && (
                        <span
                          className="sh-ping-ring absolute w-2.5 h-2.5 rounded-full"
                          style={{ background: regionColor[r.status] }}
                        />
                      )}
                      <span
                        className="relative w-2.5 h-2.5 rounded-full"
                        style={{ background: regionColor[r.status], boxShadow: "0 0 0 3px var(--charcoal-900)" }}
                      />
                    </div>
                    <span
                      className="sh-mono text-[10px] px-1 py-0.5 rounded whitespace-nowrap"
                      style={{ color: "var(--off-white-70)", background: "rgba(20,24,27,0.75)" }}
                    >
                      {r.name} · {r.sites}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 px-4 pb-3.5 pt-1">
                {Object.entries(regionColor).map(([key, color]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                    <span className="text-[11px] capitalize" style={{ color: "var(--off-white-50)" }}>
                      {key === "red" ? "Needs attention" : key === "gold" ? "Monitoring" : "Healthy"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trend + activity */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 pb-2">
            <div className="sh-card rounded-md xl:col-span-3 flex flex-col min-w-0">
              <div
                className="flex items-center justify-between px-4 py-3.5"
                style={{ borderBottom: "1px solid var(--line)" }}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 size={15} style={{ color: "var(--green-bright)" }} />
                  <h2 className="text-sm font-semibold" style={{ color: "var(--off-white)" }}>
                    Fleet Health Trend
                  </h2>
                </div>
                <span className="sh-mono text-[11px]" style={{ color: "var(--off-white-35)" }}>
                  14 days
                </span>
              </div>
              <div className="p-4 pt-2" style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="shUptime" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--green-bright)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--green-bright)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--line)" vertical={false} />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: "var(--off-white-35)", fontSize: 10, fontFamily: "var(--font-mono)" }}
                      axisLine={{ stroke: "var(--line)" }}
                      tickLine={false}
                      interval={2}
                    />
                    <YAxis
                      domain={[85, 100]}
                      tick={{ fill: "var(--off-white-35)", fontSize: 10, fontFamily: "var(--font-mono)" }}
                      axisLine={false}
                      tickLine={false}
                      width={34}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="uptime"
                      stroke="var(--green-bright)"
                      strokeWidth={2}
                      fill="url(#shUptime)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="sh-card rounded-md xl:col-span-2 flex flex-col min-w-0">
              <div
                className="flex items-center justify-between px-4 py-3.5"
                style={{ borderBottom: "1px solid var(--line)" }}
              >
                <div className="flex items-center gap-2">
                  <Hammer size={15} style={{ color: "var(--gold)" }} />
                  <h2 className="text-sm font-semibold" style={{ color: "var(--off-white)" }}>
                    Recent Activity
                  </h2>
                </div>
              </div>
              <div className="flex flex-col p-4 gap-4 sh-scrollbar overflow-y-auto" style={{ maxHeight: 260 }}>
                {activity.map((a, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: activityDot[a.type] }} />
                      {i !== activity.length - 1 && (
                        <span className="w-px flex-1" style={{ background: "var(--line)", minHeight: 18 }} />
                      )}
                    </div>
                    <div className="min-w-0 pb-0.5">
                      <p className="text-xs leading-snug" style={{ color: "var(--off-white-70)" }}>
                        {a.text}
                      </p>
                      <span className="sh-mono text-[10px]" style={{ color: "var(--off-white-35)" }}>
                        {a.time} EAT
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
