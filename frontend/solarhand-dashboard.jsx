import React, { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
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
  Filter,
  Plus,
  Zap,
  Thermometer,
  Activity,
  Check,
  Send,
} from "lucide-react";
import { fetchStationMetrics, fetchAlerts as apiFetchAlerts, postWorkOrder } from "./api";

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
  cursor: pointer;
}
.sh-nav-item:hover { color: var(--off-white); background: rgba(242,239,230,0.03); }
.sh-nav-item.active {
  color: var(--off-white);
  background: rgba(227,167,61,0.08);
  border-left: 2px solid var(--gold);
}
`;

const severityStyle = {
  Critical: { color: "var(--red)", bg: "var(--red-dim)", label: "Critical" },
  High: { color: "var(--gold)", bg: "rgba(227,167,61,0.14)", label: "High" },
  Medium: { color: "var(--off-white-70)", bg: "rgba(242,239,230,0.07)", label: "Medium" },
};

const activityDot = {
  verified: "var(--green-bright)",
  dispatch: "var(--gold)",
  alert: "var(--red)",
  sync: "var(--blue-sync)",
  checkin: "var(--gold)",
  pending: "var(--off-white-35)",
};

const regionColor = {
  red: "var(--red)",
  gold: "var(--gold)",
  green: "var(--green-bright)",
};

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { id: "fleet", label: "Fleet", icon: MapPin },
  { id: "alerts", label: "Alerts", icon: AlertTriangle },
  { id: "workorders", label: "Work Orders", icon: ListChecks },
  { id: "technicians", label: "Technicians", icon: UserRound },
  { id: "sites", label: "Sites", icon: Building2 },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

function PulseWaveform() {
  const points = [
    4, 6, 5, 9, 7, 14, 8, 5, 6, 10, 18, 9, 6, 5, 8, 22, 11, 6, 5, 7, 9, 6, 5,
    12, 15, 8, 6, 5, 9, 7,
  ];
  const w = 8;
  const h = 28;
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${i * w} ${h - p}`)
    .join(" ");

  return (
    <div className="w-48 h-7 overflow-hidden relative flex items-center">
      <div className="sh-pulse-track">
        <svg width={points.length * w} height={h} className="shrink-0 overflow-visible">
          <path d={path} fill="none" stroke="var(--green-bright)" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
        </svg>
        <svg width={points.length * w} height={h} className="shrink-0 overflow-visible">
          <path d={path} fill="none" stroke="var(--green-bright)" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
        </svg>
      </div>
    </div>
  );
}

function MetricCard({ metric, onClick }) {
  const Icon = metric.icon;
  const toneMap = {
    green: "var(--green-bright)",
    gold: "var(--gold)",
    blue: "var(--blue-sync)",
    red: "var(--red)",
    default: "var(--off-white)",
  };
  const toneColor = toneMap[metric.tone] || "var(--off-white)";

  return (
    <div
      onClick={onClick}
      className="sh-card rounded-md p-3.5 flex flex-col justify-between min-w-0 cursor-pointer transition-colors hover:border-gold/30"
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[11px] font-medium truncate" style={{ color: "var(--off-white-50)" }}>
          {metric.label}
        </span>
        <Icon size={14} style={{ color: toneColor }} className="shrink-0" />
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-1">
        <span className="sh-display text-xl font-bold tracking-tight" style={{ color: "var(--off-white)" }}>
          {metric.value}
        </span>
        {metric.delta && (
          <span
            className="sh-mono text-[10px] font-medium flex items-center gap-0.5"
            style={{ color: metric.up === true ? "var(--green-bright)" : metric.up === false ? "var(--red)" : "var(--off-white-50)" }}
          >
            {metric.up === true && <ArrowUpRight size={10} />}
            {metric.up === false && <ArrowDownRight size={10} />}
            {metric.delta}
          </span>
        )}
      </div>
    </div>
  );
}

function AlertRow({ alert }) {
  const s = severityStyle[alert.severity] || severityStyle.Medium;
  return (
    <div
      className="flex items-center justify-between gap-3 p-2.5 rounded transition-colors"
      style={{ background: "rgba(242,239,230,0.02)", border: "1px solid var(--line)" }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="sh-mono text-[10px] font-semibold px-2 py-0.5 rounded shrink-0" style={{ color: s.color, background: s.bg }}>
          {s.label}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 truncate">
            <span className="text-xs font-semibold" style={{ color: "var(--off-white)" }}>
              {alert.asset}
            </span>
            <span className="text-[11px]" style={{ color: "var(--off-white-35)" }}>
              · {alert.site}
            </span>
          </div>
          <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--off-white-50)" }}>
            {alert.cause}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right hidden sm:block">
          <span className="sh-mono text-[10px] block" style={{ color: "var(--off-white-35)" }}>
            SLA REMAINING
          </span>
          <span className="sh-mono text-xs font-medium" style={{ color: "var(--gold)" }}>
            {alert.sla}
          </span>
        </div>
        <ChevronRight size={14} style={{ color: "var(--off-white-35)" }} />
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 rounded shadow-lg sh-mono text-xs" style={{ background: "var(--charcoal-900)", border: "1px solid var(--line-strong)", color: "var(--off-white)" }}>
        <p className="font-semibold">{payload[0].payload.day}</p>
        <p style={{ color: "var(--green-bright)" }}>Uptime: {payload[0].value}%</p>
      </div>
    );
  }
  return null;
}

/* ---------------------- PAGE VIEWS ---------------------- */

function FleetView({ stations, searchQuery }) {
  const [filter, setFilter] = useState("ALL");
  const [query, setQuery] = useState(searchQuery || "");

  useEffect(() => {
    if (searchQuery !== undefined) setQuery(searchQuery);
  }, [searchQuery]);

  const filtered = stations.filter((s) => {
    const matchesFilter = filter === "ALL" || s.status === filter;
    const matchesQuery = !query || (s.station_name && s.station_name.toLowerCase().includes(query.toLowerCase()));
    return matchesFilter && matchesQuery;
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="sh-display text-xl font-bold" style={{ color: "var(--off-white)" }}>
            Fleet Infrastructure
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--off-white-50)" }}>
            Real-time status of all {stations.length || 100} solar stations across Kenya
          </p>
        </div>

        <div className="flex items-center gap-2">
          {["ALL", "NORMAL", "WARNING", "FAULT"].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className="px-3 py-1.5 rounded text-xs font-semibold transition-colors"
              style={{
                background: filter === st ? "var(--gold)" : "var(--charcoal-800)",
                color: filter === st ? "var(--charcoal-950)" : "var(--off-white-70)",
                border: `1px solid ${filter === st ? "var(--gold)" : "var(--line)"}`,
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className="sh-card rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead style={{ background: "var(--charcoal-900)", borderBottom: "1px solid var(--line)" }}>
              <tr>
                <th className="py-3 px-4 font-semibold" style={{ color: "var(--off-white-50)" }}>Station Name</th>
                <th className="py-3 px-4 font-semibold" style={{ color: "var(--off-white-50)" }}>Status</th>
                <th className="py-3 px-4 font-semibold" style={{ color: "var(--off-white-50)" }}>Voltage</th>
                <th className="py-3 px-4 font-semibold" style={{ color: "var(--off-white-50)" }}>Current</th>
                <th className="py-3 px-4 font-semibold" style={{ color: "var(--off-white-50)" }}>Temperature</th>
                <th className="py-3 px-4 font-semibold" style={{ color: "var(--off-white-50)" }}>Power Output</th>
                <th className="py-3 px-4 font-semibold" style={{ color: "var(--off-white-50)" }}>Coordinates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(242,239,230,0.05)]">
              {filtered.map((s, idx) => {
                const statusColor = s.status === "FAULT" ? "var(--red)" : s.status === "WARNING" ? "var(--gold)" : "var(--green-bright)";
                const statusBg = s.status === "FAULT" ? "var(--red-dim)" : s.status === "WARNING" ? "rgba(227,167,61,0.14)" : "rgba(89,161,126,0.14)";
                return (
                  <tr key={idx} className="hover:bg-[rgba(242,239,230,0.02)] transition-colors">
                    <td className="py-3 px-4 font-medium" style={{ color: "var(--off-white)" }}>
                      {s.station_name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="sh-mono text-[10px] font-semibold px-2 py-0.5 rounded" style={{ color: statusColor, background: statusBg }}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 sh-mono" style={{ color: "var(--off-white-70)" }}>
                      {s.voltage ? `${s.voltage.toFixed(1)} V` : "--"}
                    </td>
                    <td className="py-3 px-4 sh-mono" style={{ color: "var(--off-white-70)" }}>
                      {s.current ? `${s.current.toFixed(1)} A` : "--"}
                    </td>
                    <td className="py-3 px-4 sh-mono" style={{ color: "var(--off-white-70)" }}>
                      {s.temperature ? `${s.temperature.toFixed(1)} °C` : "--"}
                    </td>
                    <td className="py-3 px-4 sh-mono font-semibold" style={{ color: "var(--gold)" }}>
                      {s.power ? `${s.power.toFixed(0)} W` : "--"}
                    </td>
                    <td className="py-3 px-4 sh-mono text-[11px]" style={{ color: "var(--off-white-35)" }}>
                      {s.latitude ? `${s.latitude.toFixed(4)}, ${s.longitude.toFixed(4)}` : "--"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AlertsView({ alerts }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="sh-display text-xl font-bold" style={{ color: "var(--off-white)" }}>
          Priority Alerts & Incidents
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--off-white-50)" }}>
          Active threshold violations and hardware diagnostics
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {alerts.map((a) => (
          <div key={a.id} className="sh-card rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: severityStyle[a.severity]?.bg || "var(--red-dim)" }}>
                <AlertTriangle size={18} style={{ color: severityStyle[a.severity]?.color || "var(--red)" }} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="sh-mono text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: severityStyle[a.severity]?.color, background: severityStyle[a.severity]?.bg }}>
                    {a.severity.toUpperCase()}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: "var(--off-white)" }}>{a.asset}</span>
                  <span className="text-xs" style={{ color: "var(--off-white-35)" }}>· {a.site}</span>
                </div>
                <p className="text-xs mt-1" style={{ color: "var(--off-white-70)" }}>{a.cause}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0" style={{ borderColor: "var(--line)" }}>
              <div className="text-left sm:text-right">
                <span className="sh-mono text-[10px] block" style={{ color: "var(--off-white-35)" }}>SLA REMAINING</span>
                <span className="sh-mono text-sm font-bold" style={{ color: "var(--gold)" }}>{a.sla}</span>
              </div>
              <button className="px-3 py-1.5 rounded text-xs font-semibold" style={{ background: "var(--gold)", color: "var(--charcoal-950)" }}>
                Dispatch Tech
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkOrdersView({ stations }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [site, setSite] = useState("");
  const [title, setTitle] = useState("");
  const [urgency, setUrgency] = useState("soon");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orders, setOrders] = useState([
    { id: "WO-4821", site: "Kisumu Solar Station 002", title: "Inverter Fault Repair", priority: "Critical", status: "In Progress", tech: "Otieno A." },
    { id: "WO-4826", site: "Nakuru Agri Cooperative", title: "Breaker Reset & Wiring", priority: "Critical", status: "Dispatched", tech: "Kamau P." },
    { id: "WO-4819", site: "Turkana Solar Pump Station 4", title: "Battery Cell Balancing", priority: "High", status: "Pending", tech: "Unassigned" },
    { id: "WO-3181", site: "Eldoret Water Board", title: "Panel Cleaning Follow-up", priority: "Medium", status: "Completed", tech: "Barasa K." },
  ]);

  const handleCreate = async () => {
    if (!title || !site) return;
    setIsSubmitting(true);
    await postWorkOrder({ title, station: site, urgency, timestamp: new Date().toISOString() });
    setOrders([
      { id: `WO-${4830 + orders.length}`, site, title, priority: urgency === "urgent" ? "Critical" : "High", status: "Pending", tech: "Unassigned" },
      ...orders,
    ]);
    setIsSubmitting(false);
    setShowCreateModal(false);
    setTitle("");
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="sh-display text-xl font-bold" style={{ color: "var(--off-white)" }}>Work Orders & Maintenance</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--off-white-50)" }}>Field technician dispatch queue and ticket lifecycle</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded text-xs font-semibold"
          style={{ background: "var(--gold)", color: "var(--charcoal-950)" }}
        >
          <Plus size={14} /> Create Work Order
        </button>
      </div>

      {showCreateModal && (
        <div className="sh-card p-4 rounded-md flex flex-col gap-3" style={{ border: "1px solid var(--gold)" }}>
          <h3 className="text-sm font-semibold" style={{ color: "var(--off-white)" }}>Create New Work Order</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              placeholder="Work order title (e.g. Inverter Repair)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-transparent outline-none p-2 rounded text-xs"
              style={{ background: "var(--charcoal-900)", border: "1px solid var(--line)", color: "var(--off-white)" }}
            />
            <select
              value={site}
              onChange={(e) => setSite(e.target.value)}
              className="bg-transparent outline-none p-2 rounded text-xs"
              style={{ background: "var(--charcoal-900)", border: "1px solid var(--line)", color: "var(--off-white)" }}
            >
              <option value="">Select Target Solar Station…</option>
              {stations.slice(0, 15).map((s, i) => (
                <option key={i} value={s.station_name} style={{ background: "var(--charcoal-900)" }}>
                  {s.station_name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setShowCreateModal(false)} className="px-3 py-1.5 text-xs rounded" style={{ color: "var(--off-white-50)" }}>Cancel</button>
            <button onClick={handleCreate} disabled={isSubmitting} className="px-4 py-1.5 rounded text-xs font-semibold" style={{ background: "var(--gold)", color: "var(--charcoal-950)" }}>
              {isSubmitting ? "Posting to API…" : "Dispatch Work Order"}
            </button>
          </div>
        </div>
      )}

      <div className="sh-card rounded-md overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead style={{ background: "var(--charcoal-900)", borderBottom: "1px solid var(--line)" }}>
            <tr>
              <th className="py-3 px-4 font-semibold" style={{ color: "var(--off-white-50)" }}>Ticket ID</th>
              <th className="py-3 px-4 font-semibold" style={{ color: "var(--off-white-50)" }}>Station / Site</th>
              <th className="py-3 px-4 font-semibold" style={{ color: "var(--off-white-50)" }}>Task Details</th>
              <th className="py-3 px-4 font-semibold" style={{ color: "var(--off-white-50)" }}>Priority</th>
              <th className="py-3 px-4 font-semibold" style={{ color: "var(--off-white-50)" }}>Status</th>
              <th className="py-3 px-4 font-semibold" style={{ color: "var(--off-white-50)" }}>Assigned Tech</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(242,239,230,0.05)]">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-[rgba(242,239,230,0.02)]">
                <td className="py-3 px-4 sh-mono font-semibold" style={{ color: "var(--gold)" }}>{o.id}</td>
                <td className="py-3 px-4 font-medium" style={{ color: "var(--off-white)" }}>{o.site}</td>
                <td className="py-3 px-4" style={{ color: "var(--off-white-70)" }}>{o.title}</td>
                <td className="py-3 px-4">
                  <span className="sh-mono text-[10px] font-semibold px-2 py-0.5 rounded" style={{ color: o.priority === "Critical" ? "var(--red)" : "var(--gold)", background: o.priority === "Critical" ? "var(--red-dim)" : "rgba(227,167,61,0.14)" }}>
                    {o.priority}
                  </span>
                </td>
                <td className="py-3 px-4 sh-mono">{o.status}</td>
                <td className="py-3 px-4" style={{ color: "var(--off-white-50)" }}>{o.tech}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TechniciansView() {
  const techs = [
    { name: "Otieno Achieng", role: "Senior Solar Tech", region: "Kisumu", status: "On Site (WO-4821)", phone: "+254 712 445 908" },
    { name: "Kamau Njoroge", role: "Electrical Specialist", region: "Nakuru", status: "En Route (WO-4826)", phone: "+254 720 118 662" },
    { name: "Ekiru Loduk", role: "Pump & Battery Tech", region: "Turkana", status: "Standby", phone: "+254 733 902 271" },
    { name: "Achieng Mwangi", role: "Field Technician", region: "Maseno", status: "Off Duty", phone: "+254 700 112 334" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="sh-display text-xl font-bold" style={{ color: "var(--off-white)" }}>Field Technicians Roster</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--off-white-50)" }}>Technician locations, dispatches, and active availability</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {techs.map((t, i) => (
          <div key={i} className="sh-card rounded-md p-4 flex flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center sh-display text-sm font-bold shrink-0" style={{ background: "var(--green-deep)", color: "var(--off-white)" }}>
                {t.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold truncate" style={{ color: "var(--off-white)" }}>{t.name}</h3>
                <p className="text-xs truncate" style={{ color: "var(--off-white-50)" }}>{t.role}</p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t flex flex-col gap-1 text-xs" style={{ borderColor: "var(--line)" }}>
              <div className="flex justify-between"><span style={{ color: "var(--off-white-35)" }}>Region:</span><span style={{ color: "var(--off-white)" }}>{t.region}</span></div>
              <div className="flex justify-between"><span style={{ color: "var(--off-white-35)" }}>Status:</span><span style={{ color: "var(--gold)" }}>{t.status}</span></div>
              <div className="flex justify-between"><span style={{ color: "var(--off-white-35)" }}>Contact:</span><span className="sh-mono">{t.phone}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SitesView({ stations }) {
  const regions = ["Kisumu", "Ahero", "Maseno", "Muhoroni", "Nyakach", "Kombewa", "Nyando", "Seme", "Kisumu West", "Kisumu East"];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="sh-display text-xl font-bold" style={{ color: "var(--off-white)" }}>Regional Solar Sites</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--off-white-50)" }}>Station clusters grouped by region across Kenya</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {regions.map((reg) => {
          const regStations = stations.filter((s) => s.station_name && s.station_name.toLowerCase().includes(reg.toLowerCase()));
          const count = regStations.length;
          const faults = regStations.filter((s) => s.status === "FAULT").length;
          const warnings = regStations.filter((s) => s.status === "WARNING").length;

          return (
            <div key={reg} className="sh-card rounded-md p-4 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold" style={{ color: "var(--off-white)" }}>{reg} Cluster</h3>
                <span className="sh-mono text-xs px-2 py-0.5 rounded" style={{ background: "var(--charcoal-900)", color: "var(--gold)" }}>
                  {count || 10} Sites
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span style={{ color: "var(--green-bright)" }}>Healthy: {(count || 10) - faults - warnings}</span>
                <span style={{ color: "var(--gold)" }}>Warnings: {warnings}</span>
                <span style={{ color: "var(--red)" }}>Faults: {faults}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnalyticsView({ stations, trendData }) {
  const totalPowerKw = (stations.reduce((acc, s) => acc + (s.power || 0), 0) / 1000).toFixed(1);
  const statusData = [
    { name: "Normal", value: stations.filter((s) => s.status === "NORMAL").length || 92, color: "var(--green-bright)" },
    { name: "Warning", value: stations.filter((s) => s.status === "WARNING").length || 5, color: "var(--gold)" },
    { name: "Fault", value: stations.filter((s) => s.status === "FAULT").length || 3, color: "var(--red)" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="sh-display text-xl font-bold" style={{ color: "var(--off-white)" }}>Telemetry Analytics & Performance</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--off-white-50)" }}>Aggregated fleet generation metrics and status distribution</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="sh-card rounded-md p-4 flex flex-col gap-3">
          <h3 className="text-sm font-semibold" style={{ color: "var(--off-white)" }}>Total Power Output Stream</h3>
          <p className="sh-display text-2xl font-bold" style={{ color: "var(--gold)" }}>{totalPowerKw} kW Live Generation</p>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <CartesianGrid stroke="var(--line)" />
                <XAxis dataKey="day" stroke="var(--off-white-35)" fontSize={10} />
                <YAxis stroke="var(--off-white-35)" fontSize={10} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="uptime" stroke="var(--green-bright)" fill="var(--green-deep)" opacity={0.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="sh-card rounded-md p-4 flex flex-col gap-3">
          <h3 className="text-sm font-semibold" style={{ color: "var(--off-white)" }}>Fleet Status Distribution</h3>
          <div className="flex items-center justify-around h-48">
            {statusData.map((d) => (
              <div key={d.name} className="flex flex-col items-center">
                <span className="sh-display text-2xl font-bold" style={{ color: d.color }}>{d.value}</span>
                <span className="text-xs mt-1" style={{ color: "var(--off-white-50)" }}>{d.name} Stations</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsView({ apiConnected }) {
  const [apiUrl, setApiUrl] = useState("http://localhost:8000");

  return (
    <div className="flex flex-col gap-5 max-w-xl">
      <div>
        <h1 className="sh-display text-xl font-bold" style={{ color: "var(--off-white)" }}>System Settings</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--off-white-50)" }}>Configure backend API endpoints and dashboard preferences</p>
      </div>

      <div className="sh-card rounded-md p-4 flex flex-col gap-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: "var(--off-white-50)" }}>
            Backend API Endpoint URL
          </label>
          <input
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            className="w-full bg-transparent outline-none p-2.5 rounded text-sm sh-mono"
            style={{ background: "var(--charcoal-900)", border: "1px solid var(--line)", color: "var(--off-white)" }}
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "var(--line)" }}>
          <span className="text-xs" style={{ color: "var(--off-white-70)" }}>API Server Connection Status:</span>
          <span className="sh-mono text-xs font-bold" style={{ color: apiConnected ? "var(--green-bright)" : "var(--gold)" }}>
            {apiConnected ? "Connected (http://localhost:8000)" : "Polling..."}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------------------- MAIN DASHBOARD ---------------------- */

export default function SolarHandDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [time, setTime] = useState(new Date());
  const [liveStations, setLiveStations] = useState([]);
  const [apiConnected, setApiConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [trendData, setTrendData] = useState([
    { day: "08:00", uptime: 91.2 },
    { day: "09:00", uptime: 92.4 },
    { day: "10:00", uptime: 93.1 },
    { day: "11:00", uptime: 89.7 },
    { day: "12:00", uptime: 94.0 },
    { day: "13:00", uptime: 94.2 },
  ]);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // Poll API for live station telemetry every 2 seconds
  useEffect(() => {
    let isMounted = true;
    async function loadApiData() {
      const stations = await fetchStationMetrics();
      if (!isMounted) return;

      if (stations && Array.isArray(stations) && stations.length > 0) {
        setLiveStations(stations);
        setApiConnected(true);

        // Update live uptime trend point
        const total = stations.length;
        const normal = stations.filter((s) => s.status === "NORMAL").length;
        const uptimePct = parseFloat(((normal / total) * 100).toFixed(1));
        const timeStr = new Date().toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });

        setTrendData((prev) => {
          const next = [...prev, { day: timeStr, uptime: uptimePct }];
          return next.slice(-12);
        });
      } else {
        setApiConnected(false);
      }
    }

    loadApiData();
    const interval = setInterval(loadApiData, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Dynamic calculations
  const totalStations = liveStations.length;
  const normalCount = liveStations.filter((s) => s.status === "NORMAL").length;
  const warningCount = liveStations.filter((s) => s.status === "WARNING").length;
  const faultCount = liveStations.filter((s) => s.status === "FAULT").length;
  const uptimeVal = totalStations > 0 ? ((normalCount / totalStations) * 100).toFixed(1) : "94.2";

  const metrics = [
    { label: "Fleet Uptime", value: `${uptimeVal}%`, delta: "+1.1%", up: true, icon: Sun, tone: "green", targetTab: "dashboard" },
    { label: "Active Alerts", value: `${faultCount + warningCount}`, delta: `+${faultCount}`, up: false, icon: AlertTriangle, tone: "gold", targetTab: "alerts" },
    { label: "Work Orders Active", value: `${faultCount}`, delta: "+2", up: true, icon: Wrench, tone: "default", targetTab: "workorders" },
    { label: "Systems Offline", value: `${faultCount}`, delta: "-2", up: true, icon: WifiOff, tone: "blue", targetTab: "fleet" },
    { label: "Technicians Dispatched", value: `${Math.min(faultCount, 12)}`, delta: "of 18", up: null, icon: Users, tone: "default", targetTab: "technicians" },
    { label: "SLA At Risk", value: `${faultCount}`, delta: "urgent", up: false, icon: ShieldAlert, tone: "red", targetTab: "alerts" },
    { label: "Verified Stations", value: `${normalCount}`, delta: `of ${totalStations || 100}`, up: true, icon: CheckCircle2, tone: "green", targetTab: "fleet" },
  ];

  const alerts = liveStations.length > 0
    ? liveStations
        .filter((s) => s.status !== "NORMAL")
        .slice(0, 8)
        .map((s, idx) => ({
          id: `AL-${4800 + idx}`,
          severity: s.status === "FAULT" ? "Critical" : "High",
          asset: `Solar Station (${s.voltage ? s.voltage.toFixed(1) + "V" : "Inverter"})`,
          site: s.station_name,
          cause: `Telemetry reading: ${s.voltage ? s.voltage.toFixed(1) + "V" : ""}, ${s.current ? s.current.toFixed(1) + "A" : ""}, ${s.temperature ? s.temperature.toFixed(1) + "°C" : ""}, ${s.power ? s.power.toFixed(0) + "W" : ""}`,
          sla: s.status === "FAULT" ? "45m" : "2h 15m",
        }))
    : [
        { severity: "Critical", asset: "Inverter Array B", site: "Kisumu Central Mini-Grid", cause: "String voltage dropped 40%", sla: "1h 12m", id: "AL-4821" },
        { severity: "High", asset: "Battery Bank 2", site: "Turkana Solar Pump Station 4", cause: "Charge cycle anomaly", sla: "3h 40m", id: "AL-4819" },
      ];

  const regionConfig = [
    { name: "Turkana", top: "10%", left: "24%" },
    { name: "Eldoret", top: "28%", left: "16%" },
    { name: "Kisumu", top: "40%", left: "11%" },
    { name: "Nakuru", top: "47%", left: "31%" },
    { name: "Nairobi", top: "60%", left: "44%" },
    { name: "Machakos", top: "64%", left: "54%" },
    { name: "Garissa", top: "34%", left: "76%" },
    { name: "Kwale", top: "86%", left: "70%" },
    { name: "Ahero", top: "45%", left: "20%" },
    { name: "Maseno", top: "35%", left: "14%" },
  ];

  const regions = regionConfig.map((r) => {
    const matched = liveStations.filter((s) => s.station_name && s.station_name.toLowerCase().includes(r.name.toLowerCase()));
    const siteCount = matched.length;
    const hasFault = matched.some((s) => s.status === "FAULT");
    const hasWarning = matched.some((s) => s.status === "WARNING");
    const status = hasFault ? "red" : hasWarning ? "gold" : "green";
    return { name: r.name, sites: siteCount || 10, status, top: r.top, left: r.left };
  });

  const activity = liveStations.length > 0
    ? liveStations
        .filter((s) => s.status !== "NORMAL")
        .slice(0, 6)
        .map((s) => ({
          time: new Date(s.timestamp || Date.now()).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }),
          text: `Telemetry alert on ${s.station_name} — Status: ${s.status} (${s.power ? s.power.toFixed(0) + "W" : ""})`,
          type: s.status === "FAULT" ? "alert" : "dispatch",
        }))
    : [
        { time: "09:42", text: "Work order WO-3187 verified — Eldoret Water Board", type: "verified" },
        { time: "09:31", text: "Achieng M. dispatched to Kisumu Central Mini-Grid", type: "dispatch" },
      ];

  return (
    <div className="sh-root w-full min-h-screen flex" style={{ background: "var(--charcoal-950)" }}>
      <style>{fontImport}</style>

      {/* Sidebar */}
      <aside className="hidden md:flex flex-col shrink-0 w-56" style={{ background: "var(--charcoal-900)", borderRight: "1px solid var(--line)" }}>
        <div className="flex items-center gap-2.5 px-5 py-5" style={{ borderBottom: "1px solid var(--line)" }}>
          <div className="w-7 h-7 rounded flex items-center justify-center shrink-0" style={{ background: "var(--green-deep)" }}>
            <Sun size={15} style={{ color: "var(--gold)" }} strokeWidth={2.5} />
          </div>
          <span className="sh-display text-[15px] font-bold" style={{ color: "var(--off-white)" }}>
            SolarHand
          </span>
        </div>

        <nav className="flex-1 py-3 flex flex-col gap-0.5 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`sh-nav-item sh-focusable flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors text-left ${
                  isActive ? "active" : ""
                }`}
              >
                <Icon size={16} strokeWidth={2} />
                {item.label}
              </button>
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
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeTab !== "fleet") setActiveTab("fleet");
                }}
                className="bg-transparent outline-none text-sm flex-1 min-w-0"
                style={{ color: "var(--off-white)" }}
              />
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{
                background: apiConnected ? "rgba(89,161,126,0.14)" : "rgba(227,167,61,0.14)",
                border: `1px solid ${apiConnected ? "rgba(89,161,126,0.3)" : "rgba(227,167,61,0.3)"}`,
              }}
            >
              <span className="sh-live-dot relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full" style={{ background: apiConnected ? "var(--green-bright)" : "var(--gold)" }} />
              </span>
              <span className="sh-mono text-[11px] font-medium" style={{ color: apiConnected ? "var(--green-bright)" : "var(--gold)" }}>
                {apiConnected ? "API LIVE (:8000)" : "POLLING API"}
              </span>
            </div>
            <PulseWaveform />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="sh-mono text-xs hidden sm:block" style={{ color: "var(--off-white-35)" }}>
              {time.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })} EAT
            </span>
            <button
              onClick={() => setActiveTab("alerts")}
              className="sh-focusable relative w-8 h-8 rounded-md flex items-center justify-center"
              style={{ background: "var(--charcoal-800)", border: "1px solid var(--line)" }}
            >
              <Bell size={14} style={{ color: "var(--off-white-70)" }} />
              {alerts.length > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full sh-mono text-[9px] flex items-center justify-center"
                  style={{ background: "var(--red)", color: "var(--off-white)" }}
                >
                  {alerts.length}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-5 md:px-7 py-6 flex flex-col gap-6 sh-scrollbar overflow-y-auto">
          {activeTab === "dashboard" && (
            <>
              <div>
                <h1 className="sh-display text-xl font-bold" style={{ color: "var(--off-white)" }}>
                  Operations Overview
                </h1>
                <p className="text-sm mt-1" style={{ color: "var(--off-white-50)" }}>
                  Fleet status across {totalStations || 100} sites · {apiConnected ? "Streaming live from backend API (http://localhost:8000)" : "Connecting to API on port 8000…"}
                </p>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                {metrics.map((m) => (
                  <MetricCard key={m.label} metric={m} onClick={() => setActiveTab(m.targetTab)} />
                ))}
              </div>

              {/* Alerts + Regional coverage */}
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
                <div className="sh-card rounded-md xl:col-span-3 flex flex-col min-w-0">
                  <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: "1px solid var(--line)" }}>
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={15} style={{ color: "var(--gold)" }} />
                      <h2 className="text-sm font-semibold" style={{ color: "var(--off-white)" }}>
                        Priority Alerts ({alerts.length})
                      </h2>
                    </div>
                    <button onClick={() => setActiveTab("alerts")} className="sh-focusable text-xs flex items-center gap-0.5" style={{ color: "var(--gold)" }}>
                      View all
                      <ChevronRight size={12} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5 p-2">
                    {alerts.map((a) => (
                      <AlertRow key={a.id} alert={a} />
                    ))}
                  </div>
                </div>

                <div className="sh-card rounded-md xl:col-span-2 flex flex-col min-w-0">
                  <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: "1px solid var(--line)" }}>
                    <div className="flex items-center gap-2">
                      <Radio size={15} style={{ color: "var(--green-bright)" }} />
                      <h2 className="text-sm font-semibold" style={{ color: "var(--off-white)" }}>
                        Regional Coverage
                      </h2>
                    </div>
                    <button onClick={() => setActiveTab("sites")} className="sh-mono text-[11px]" style={{ color: "var(--gold)" }}>
                      {regions.length} regions
                    </button>
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
                        onClick={() => setActiveTab("sites")}
                        className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 cursor-pointer"
                        style={{ top: r.top, left: r.left }}
                      >
                        <div className="relative flex items-center justify-center">
                          {r.status === "red" && (
                            <span className="sh-ping-ring absolute w-2.5 h-2.5 rounded-full" style={{ background: regionColor[r.status] }} />
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
                  <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: "1px solid var(--line)" }}>
                    <div className="flex items-center gap-2">
                      <BarChart3 size={15} style={{ color: "var(--green-bright)" }} />
                      <h2 className="text-sm font-semibold" style={{ color: "var(--off-white)" }}>
                        Fleet Health Trend
                      </h2>
                    </div>
                    <button onClick={() => setActiveTab("analytics")} className="sh-mono text-[11px]" style={{ color: "var(--gold)" }}>
                      Analytics
                    </button>
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
                          interval={1}
                        />
                        <YAxis
                          domain={[70, 100]}
                          tick={{ fill: "var(--off-white-35)", fontSize: 10, fontFamily: "var(--font-mono)" }}
                          axisLine={false}
                          tickLine={false}
                          width={34}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="uptime" stroke="var(--green-bright)" strokeWidth={2} fill="url(#shUptime)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="sh-card rounded-md xl:col-span-2 flex flex-col min-w-0">
                  <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: "1px solid var(--line)" }}>
                    <div className="flex items-center gap-2">
                      <Hammer size={15} style={{ color: "var(--gold)" }} />
                      <h2 className="text-sm font-semibold" style={{ color: "var(--off-white)" }}>
                        Telemetry Stream Activity
                      </h2>
                    </div>
                  </div>
                  <div className="flex flex-col p-4 gap-4 sh-scrollbar overflow-y-auto" style={{ maxHeight: 260 }}>
                    {activity.map((a, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: activityDot[a.type] || "var(--gold)" }} />
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
            </>
          )}

          {activeTab === "fleet" && <FleetView stations={liveStations} searchQuery={searchQuery} />}
          {activeTab === "alerts" && <AlertsView alerts={alerts} />}
          {activeTab === "workorders" && <WorkOrdersView stations={liveStations} />}
          {activeTab === "technicians" && <TechniciansView />}
          {activeTab === "sites" && <SitesView stations={liveStations} />}
          {activeTab === "analytics" && <AnalyticsView stations={liveStations} trendData={trendData} />}
          {activeTab === "settings" && <SettingsView apiConnected={apiConnected} />}
        </main>
      </div>
    </div>
  );
}
