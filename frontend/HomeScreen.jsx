import React, { useState } from "react";
import {
  ArrowLeft,
  Sun,
  Battery,
  Zap,
  TrendingUp,
  Bell,
  Home,
  LifeBuoy,
  User,
  ChevronRight,
  CheckCircle2,
  Wrench,
  Sparkles,
  MessageCircle,
  PhoneCall,
  Send,
  CircleCheck,
} from "lucide-react";

const fontImport = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800;900&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

:root {
  --charcoal-950: #14181B;
  --charcoal-900: #191E21;
  --charcoal-800: #1F262A;
  --charcoal-700: #2A3236;
  --charcoal-600: #384145;
  --line: rgba(242,239,230,0.09);
  --line-strong: rgba(242,239,230,0.18);
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

.ca-root * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
.ca-root { font-family: var(--font-body); }
.ca-display { font-family: var(--font-display); letter-spacing: -0.01em; }
.ca-mono { font-family: var(--font-mono); letter-spacing: 0.01em; }
.ca-scrollbar::-webkit-scrollbar { width: 0px; }

@keyframes ca-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.ca-live-dot { animation: ca-blink 2s ease-in-out infinite; }

@keyframes ca-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
.ca-rise { animation: ca-rise 0.28s ease-out both; }

@keyframes ca-pop {
  0% { transform: scale(0.7); opacity: 0; }
  60% { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
.ca-pop { animation: ca-pop 0.4s cubic-bezier(0.2,0.8,0.3,1.2) both; }

@keyframes ca-ring {
  from { stroke-dashoffset: var(--ring-full); }
  to { stroke-dashoffset: var(--ring-offset); }
}
.ca-ring-progress { animation: ca-ring 1.1s cubic-bezier(0.22,0.8,0.3,1) both; }

.ca-focusable:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.ca-tap { transition: transform 0.08s ease, background 0.15s ease; }
.ca-tap:active { transform: scale(0.97); }

@media (prefers-reduced-motion: reduce) {
  .ca-live-dot, .ca-rise, .ca-pop, .ca-ring-progress { animation: none; }
}

`;

const owner = { name: "Neema", system: "Neema's Cold Storage — Kisumu", capacity: "5.2 kW system" };

const alerts = [
  {
    id: "A-1",
    title: "Battery capacity declining",
    severity: "Medium",
    status: "action",
    detail:
      "Your battery is holding 78% of rated capacity, down from 92% last quarter. We recommend scheduling a replacement check within 6 weeks so cold storage stays protected overnight.",
    time: "2 hours ago",
    icon: Battery,
  },
  {
    id: "A-2",
    title: "Panel cleaning recommended",
    severity: "Low",
    status: "action",
    detail:
      "Dust buildup is reducing your output by an estimated 9%. A routine clean usually restores full performance within a day.",
    time: "Yesterday",
    icon: Sun,
  },
  {
    id: "A-3",
    title: "Inverter fan maintenance due",
    severity: "Medium",
    status: "scheduled",
    detail:
      "Scheduled maintenance is due in 12 days as part of your service plan. A technician will confirm a visit window closer to the date.",
    time: "3 days ago",
    icon: Wrench,
  },
  {
    id: "A-4",
    title: "Charge controller check completed",
    severity: "Info",
    status: "resolved",
    detail: "Routine inspection completed with no issues found. Next check is scheduled automatically.",
    time: "5 days ago",
    icon: CheckCircle2,
  },
];

const severityStyle = {
  Medium: { color: "var(--gold)", bg: "rgba(227,167,61,0.14)" },
  Low: { color: "var(--blue-sync)", bg: "rgba(108,143,163,0.14)" },
  Info: { color: "var(--off-white-50)", bg: "rgba(242,239,230,0.06)" },
};

const issueTypes = ["Performance drop", "Strange noise", "No power", "Battery issue", "Routine maintenance", "Other"];
const urgencyOptions = [
  { key: "wait", label: "Can wait", window: "within 3–5 days" },
  { key: "soon", label: "Soon", window: "within 24 hours" },
  { key: "urgent", label: "Urgent", window: "within 4 hours" },
];

const priorRequests = [
  { id: "REQ-1038", title: "Inverter making noise", status: "Completed", time: "3 weeks ago" },
  { id: "REQ-1021", title: "Output lower than usual", status: "Completed", time: "2 months ago" },
];

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-6 pt-3 pb-1 shrink-0">
      <span className="ca-mono text-[13px] font-medium" style={{ color: "var(--off-white)" }}>9:41</span>
      <div className="flex items-center gap-1.5">
        <div className="flex items-end gap-0.5 h-2.5">
          {[3, 5, 7, 9].map((h, i) => (
            <span key={i} className="w-0.5 rounded-sm" style={{ height: h, background: "var(--off-white-70)" }} />
          ))}
        </div>
        <div className="w-5 h-2.5 rounded-sm border flex items-center px-px" style={{ borderColor: "var(--off-white-50)" }}>
          <span className="block h-full rounded-[1px]" style={{ width: "80%", background: "var(--off-white-70)" }} />
        </div>
      </div>
    </div>
  );
}

function HealthRing({ score = 92 }) {
  const radius = 64;
  const stroke = 10;
  const norm = radius - stroke / 2;
  const circumference = 2 * Math.PI * norm;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "var(--green-bright)" : score >= 55 ? "var(--gold)" : "var(--red)";
  const label = score >= 80 ? "Good" : score >= 55 ? "Fair" : "Needs attention";

  return (
    <div className="relative flex items-center justify-center" style={{ width: radius * 2, height: radius * 2 }}>
      <svg width={radius * 2} height={radius * 2} className="-rotate-90">
        <circle cx={radius} cy={radius} r={norm} fill="none" stroke="var(--charcoal-700)" strokeWidth={stroke} />
        <circle
          cx={radius}
          cy={radius}
          r={norm}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          className="ca-ring-progress"
          style={{ "--ring-full": circumference, "--ring-offset": offset, strokeDashoffset: offset }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="ca-display text-3xl font-bold" style={{ color: "var(--off-white)" }}>{score}</span>
        <span className="text-[11px] font-medium" style={{ color }}>{label}</span>
      </div>
    </div>
  );
}

function SnapshotStat({ icon: Icon, label, value, sub }) {
  return (
    <div className="flex-1 rounded-lg p-3 min-w-0" style={{ background: "var(--charcoal-800)", border: "1px solid var(--line)" }}>
      <div className="flex items-center gap-1.5">
        <Icon size={12} style={{ color: "var(--off-white-35)" }} />
        <span className="ca-mono text-[10px]" style={{ color: "var(--off-white-35)" }}>{label}</span>
      </div>
      <p className="text-sm font-semibold mt-1.5 truncate" style={{ color: "var(--off-white)" }}>{value}</p>
      {sub && <p className="text-[10px] mt-0.5" style={{ color: "var(--off-white-50)" }}>{sub}</p>}
    </div>
  );
}

function AlertPreviewCard({ alert, onOpen }) {
  const severityStyle = {
    Medium: { color: "var(--gold)", bg: "rgba(227,167,61,0.14)" },
    Low: { color: "var(--blue-sync)", bg: "rgba(108,143,163,0.14)" },
    Info: { color: "var(--off-white-50)", bg: "rgba(242,239,230,0.06)" },
  };
  const s = severityStyle[alert.severity];

  return (
    <button
      onClick={onOpen}
      className="ca-tap ca-focusable w-full text-left rounded-lg p-3 flex items-center gap-3"
      style={{ background: "var(--charcoal-800)", border: "1px solid var(--line)" }}
    >
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: s.bg }}>
        <Icon size={14} style={{ color: s.color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate" style={{ color: "var(--off-white)" }}>{alert.title}</p>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--off-white-50)" }}>{alert.time}</p>
      </div>
      <ChevronRight size={15} style={{ color: "var(--off-white-35)" }} className="shrink-0" />
    </button>
  );
}

function HomeScreen({ onOpenAlerts, onOpenAlert, onRequestAssistance }) {
  const actionAlerts = alerts.filter((a) => a.status === "action");
  return (
    <div className="flex-1 overflow-y-auto ca-scrollbar px-4 pb-24 pt-2">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs" style={{ color: "var(--off-white-50)" }}>Hi {owner.name},</p>
          <h1 className="ca-display text-base font-bold" style={{ color: "var(--off-white)" }}>{owner.system}</h1>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: "rgba(89,161,126,0.14)", border: "1px solid rgba(89,161,126,0.3)" }}>
          <span className="ca-live-dot relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full" style={{ background: "var(--green-bright)" }} />
          </span>
          <span className="ca-mono text-[10px] font-medium" style={{ color: "var(--green-bright)" }}>Producing</span>
        </div>
      </div>

      <div className="ca-rise flex flex-col items-center gap-2 rounded-xl p-5 mb-4" style={{ background: "var(--charcoal-800)", border: "1px solid var(--line)" }}>
        <span className="ca-mono text-[10px] uppercase tracking-wide" style={{ color: "var(--off-white-35)" }}>System Health</span>
        <HealthRing score={92} />
        <p className="text-[11px]" style={{ color: "var(--off-white-50)" }}>Last checked 10 minutes ago</p>
      </div>

      <div className="flex gap-2 mb-4">
        <SnapshotStat icon={Zap} label="TODAY" value="18.4 kWh" sub="Generated so far" />
        <SnapshotStat icon={Battery} label="BATTERY" value="78%" sub="Charged" />
        <SnapshotStat icon={TrendingUp} label="UPTIME" value="99.1%" sub="This month" />
      </div>

      <button
        onClick={onRequestAssistance}
        className="ca-tap ca-focusable w-full flex items-center justify-center gap-2 py-3.5 rounded-lg text-sm font-semibold mb-4"
        style={{ background: "var(--gold)", color: "var(--charcoal-950)" }}
      >
        <LifeBuoy size={15} />
        Request Assistance
      </button>

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--off-white-50)" }}>
          Needs your attention · {actionAlerts.length}
        </h2>
        <button onClick={onOpenAlerts} className="ca-focusable text-xs flex items-center gap-0.5" style={{ color: "var(--gold)" }}>
          View all
          <ChevronRight size={12} />
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {actionAlerts.map((a) => (
          <AlertPreviewCard key={a.id} alert={a} onOpen={() => onOpenAlert(a)} />
        ))}
      </div>
    </div>
  );
}

export default HomeScreen;