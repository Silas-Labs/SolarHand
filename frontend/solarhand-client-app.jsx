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
  const Icon = alert.icon;
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

function AlertsScreen({ onBack, onOpenAlert }) {
  const [filter, setFilter] = useState("all");
  const filtered = alerts.filter((a) => (filter === "all" ? true : filter === "action" ? a.status === "action" : a.status === "resolved" || a.status === "scheduled"));

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--line)" }}>
        <button onClick={onBack} className="ca-tap ca-focusable w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--charcoal-800)" }}>
          <ArrowLeft size={15} style={{ color: "var(--off-white)" }} />
        </button>
        <h1 className="text-sm font-semibold" style={{ color: "var(--off-white)" }}>Alerts &amp; Maintenance</h1>
      </div>

      <div className="flex gap-2 px-4 pt-3 pb-1 shrink-0">
        {[
          { key: "all", label: "All" },
          { key: "action", label: "Action needed" },
          { key: "other", label: "Scheduled / resolved" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="ca-tap ca-focusable text-xs px-3 py-1.5 rounded-full"
            style={{
              background: filter === f.key ? "var(--gold)" : "var(--charcoal-800)",
              color: filter === f.key ? "var(--charcoal-950)" : "var(--off-white-70)",
              border: `1px solid ${filter === f.key ? "var(--gold)" : "var(--line)"}`,
              fontWeight: filter === f.key ? 600 : 500,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto ca-scrollbar px-4 pt-3 pb-6 flex flex-col gap-2.5">
        {filtered.map((a) => {
          const Icon = a.icon;
          const s = severityStyle[a.severity];
          return (
            <button
              key={a.id}
              onClick={() => onOpenAlert(a)}
              className="ca-tap ca-focusable ca-rise text-left rounded-lg p-3.5 flex flex-col gap-2"
              style={{ background: "var(--charcoal-800)", border: "1px solid var(--line)" }}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: s.bg }}>
                  <Icon size={14} style={{ color: s.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium" style={{ color: "var(--off-white)" }}>{a.title}</p>
                    {a.status === "resolved" && <CheckCircle2 size={13} style={{ color: "var(--green-bright)" }} />}
                  </div>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--off-white-70)" }}>{a.detail}</p>
                  <p className="ca-mono text-[10px] mt-1.5" style={{ color: "var(--off-white-35)" }}>{a.time}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

function AlertDetailScreen({ alert, onBack, onRequestAssistance }) {
  const Icon = alert.icon;
  const s = severityStyle[alert.severity];
  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--line)" }}>
        <button onClick={onBack} className="ca-tap ca-focusable w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--charcoal-800)" }}>
          <ArrowLeft size={15} style={{ color: "var(--off-white)" }} />
        </button>
        <h1 className="text-sm font-semibold" style={{ color: "var(--off-white)" }}>Alert details</h1>
      </div>
      <div className="flex-1 overflow-y-auto ca-scrollbar px-4 pt-5 pb-28 flex flex-col gap-4">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: s.bg }}>
            <Icon size={24} style={{ color: s.color }} />
          </div>
          <div>
            <span className="ca-mono text-[10px] font-semibold px-2 py-0.5 rounded" style={{ color: s.color, background: s.bg }}>
              {alert.severity.toUpperCase()} PRIORITY
            </span>
            <h2 className="ca-display text-lg font-bold mt-2" style={{ color: "var(--off-white)" }}>{alert.title}</h2>
          </div>
        </div>
        <p className="text-sm leading-relaxed rounded-lg p-4" style={{ color: "var(--off-white-70)", background: "var(--charcoal-800)", border: "1px solid var(--line)" }}>
          {alert.detail}
        </p>
        {alert.status === "action" && (
          <div className="rounded-lg p-3.5 flex items-start gap-2.5" style={{ background: "rgba(227,167,61,0.08)", border: "1px solid rgba(227,167,61,0.25)" }}>
            <Sparkles size={14} style={{ color: "var(--gold)" }} className="shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed" style={{ color: "var(--off-white-70)" }}>
              We'll keep monitoring this automatically. You can also request a technician now if you'd rather not wait.
            </p>
          </div>
        )}
      </div>
      {alert.status === "action" && (
        <div className="absolute bottom-0 left-0 right-0 p-4 pt-3" style={{ background: "linear-gradient(to top, var(--charcoal-950) 60%, transparent)" }}>
          <button
            onClick={() => onRequestAssistance(alert.title)}
            className="ca-tap ca-focusable w-full py-3.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: "var(--gold)", color: "var(--charcoal-950)" }}
          >
            <LifeBuoy size={15} />
            Request Assistance
          </button>
        </div>
      )}
    </>
  );
}

function RequestScreen({ onBack, onSubmitted, prefill }) {
  const [issue, setIssue] = useState(prefill || null);
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState("soon");

  const canSubmit = !!issue && description.trim().length > 0;

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--line)" }}>
        <button onClick={onBack} className="ca-tap ca-focusable w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--charcoal-800)" }}>
          <ArrowLeft size={15} style={{ color: "var(--off-white)" }} />
        </button>
        <h1 className="text-sm font-semibold" style={{ color: "var(--off-white)" }}>Request Assistance</h1>
      </div>

      <div className="flex-1 overflow-y-auto ca-scrollbar px-4 pt-4 pb-28 flex flex-col gap-5">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--off-white-50)" }}>What's going on?</h2>
          <div className="flex flex-wrap gap-2">
            {issueTypes.map((t) => (
              <button
                key={t}
                onClick={() => setIssue(t)}
                className="ca-tap ca-focusable text-xs px-3 py-1.5 rounded-full"
                style={{
                  background: issue === t ? "var(--gold)" : "var(--charcoal-800)",
                  color: issue === t ? "var(--charcoal-950)" : "var(--off-white-70)",
                  border: `1px solid ${issue === t ? "var(--gold)" : "var(--line)"}`,
                  fontWeight: issue === t ? 600 : 500,
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--off-white-50)" }}>Tell us more</h2>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what you're noticing — when it started, how it's affecting your system…"
            rows={4}
            className="ca-focusable w-full rounded-lg p-3 text-sm outline-none resize-none"
            style={{ background: "var(--charcoal-800)", border: "1px solid var(--line)", color: "var(--off-white)" }}
          />
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--off-white-50)" }}>How urgent is this?</h2>
          <div className="flex gap-2">
            {urgencyOptions.map((u) => (
              <button
                key={u.key}
                onClick={() => setUrgency(u.key)}
                className="ca-tap ca-focusable flex-1 rounded-lg p-2.5 text-center"
                style={{
                  background: urgency === u.key ? "rgba(227,167,61,0.12)" : "var(--charcoal-800)",
                  border: `1px solid ${urgency === u.key ? "var(--gold)" : "var(--line)"}`,
                }}
              >
                <p className="text-xs font-semibold" style={{ color: urgency === u.key ? "var(--gold)" : "var(--off-white)" }}>{u.label}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--off-white-50)" }}>{u.window}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--off-white-50)" }}>Your past requests</h2>
          <div className="flex flex-col gap-2">
            {priorRequests.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-lg p-3" style={{ background: "var(--charcoal-800)", border: "1px solid var(--line)" }}>
                <CircleCheck size={15} style={{ color: "var(--green-bright)" }} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate" style={{ color: "var(--off-white)" }}>{r.title}</p>
                  <p className="ca-mono text-[10px]" style={{ color: "var(--off-white-35)" }}>{r.id} · {r.time}</p>
                </div>
                <span className="ca-mono text-[10px] font-medium" style={{ color: "var(--green-bright)" }}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 pt-3" style={{ background: "linear-gradient(to top, var(--charcoal-950) 60%, transparent)" }}>
        <button
          disabled={!canSubmit}
          onClick={() => onSubmitted({ issue, urgency })}
          className="ca-tap ca-focusable w-full py-3.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
          style={{
            background: canSubmit ? "var(--gold)" : "var(--charcoal-700)",
            color: canSubmit ? "var(--charcoal-950)" : "var(--off-white-35)",
          }}
        >
          <Send size={14} />
          Send request
        </button>
      </div>
    </>
  );
}

function ConfirmationScreen({ requestData, onDone }) {
  const urgencyInfo = urgencyOptions.find((u) => u.key === requestData.urgency);
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
      <div className="ca-pop w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(89,161,126,0.14)" }}>
        <CheckCircle2 size={28} style={{ color: "var(--green-bright)" }} />
      </div>
      <div>
        <h1 className="ca-display text-lg font-bold" style={{ color: "var(--off-white)" }}>Request received</h1>
        <p className="text-xs mt-2 leading-relaxed max-w-[280px]" style={{ color: "var(--off-white-70)" }}>
          We've logged <span style={{ color: "var(--off-white)" }}>{requestData.issue}</span> for {owner.system}. Our
          operations team typically responds {urgencyInfo?.window}.
        </p>
      </div>
      <div className="w-full max-w-[280px] rounded-lg p-3.5 flex flex-col gap-2 text-left" style={{ background: "var(--charcoal-800)", border: "1px solid var(--line)" }}>
        <div className="flex items-center justify-between">
          <span className="ca-mono text-[11px]" style={{ color: "var(--off-white-35)" }}>Tracking ID</span>
          <span className="ca-mono text-[11px] font-medium" style={{ color: "var(--off-white)" }}>REQ-1042</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="ca-mono text-[11px]" style={{ color: "var(--off-white-35)" }}>Status</span>
          <span className="ca-mono text-[11px] font-medium" style={{ color: "var(--gold)" }}>Logged with operations</span>
        </div>
      </div>
      <div className="w-full max-w-[280px] rounded-lg p-3 flex items-center gap-2.5 text-left" style={{ background: "var(--charcoal-800)", border: "1px solid var(--line)" }}>
        <PhoneCall size={14} style={{ color: "var(--blue-sync)" }} className="shrink-0" />
        <p className="text-[11px]" style={{ color: "var(--off-white-50)" }}>
          Need to talk to someone sooner? Call the SolarHand support line anytime.
        </p>
      </div>
      <button
        onClick={onDone}
        className="ca-tap ca-focusable mt-2 px-5 py-2.5 rounded-lg text-sm font-semibold"
        style={{ background: "var(--green-deep)", color: "var(--off-white)" }}
      >
        Back to home
      </button>
    </div>
  );
}

function BottomNav({ active }) {
  const items = [
    { key: "home", label: "Home", icon: Home },
    { key: "alerts", label: "Alerts", icon: Bell },
    { key: "support", label: "Support", icon: MessageCircle },
    { key: "profile", label: "Profile", icon: User },
  ];
  return (
    <div className="flex items-stretch shrink-0" style={{ background: "var(--charcoal-900)", borderTop: "1px solid var(--line)" }}>
      {items.map((it) => {
        const Icon = it.icon;
        const isActive = it.key === active;
        return (
          <button key={it.key} className="ca-tap ca-focusable flex-1 flex flex-col items-center gap-1 py-2.5">
            <Icon size={17} style={{ color: isActive ? "var(--gold)" : "var(--off-white-35)" }} strokeWidth={isActive ? 2.3 : 2} />
            <span className="text-[10px] font-medium" style={{ color: isActive ? "var(--gold)" : "var(--off-white-35)" }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function SolarHandClientApp() {
  const [screen, setScreen] = useState("home");
  const [activeAlert, setActiveAlert] = useState(null);
  const [prefillIssue, setPrefillIssue] = useState(null);
  const [requestData, setRequestData] = useState(null);

  const navActive = screen === "home" ? "home" : screen === "alerts" || screen === "alertDetail" ? "alerts" : screen === "request" || screen === "confirmation" ? "support" : "home";
  const showNav = screen === "home" || screen === "alerts";

  const goRequest = (prefill) => {
    setPrefillIssue(prefill || null);
    setScreen("request");
  };

  return (
    <div className="ca-root w-full min-h-screen flex items-center justify-center py-8 px-3" style={{ background: "var(--charcoal-950)" }}>
      <style>{fontImport}</style>
      <div
        className="relative w-full flex flex-col overflow-hidden"
        style={{
          maxWidth: 390,
          height: 780,
          background: "var(--charcoal-950)",
          borderRadius: 40,
          border: "10px solid var(--charcoal-900)",
          boxShadow: "0 30px 60px rgba(0,0,0,0.5), 0 0 0 1px var(--line)",
        }}
      >
        <StatusBar />
        <div className="flex-1 relative flex flex-col min-h-0">
          {screen === "home" && (
            <HomeScreen
              onOpenAlerts={() => setScreen("alerts")}
              onOpenAlert={(a) => { setActiveAlert(a); setScreen("alertDetail"); }}
              onRequestAssistance={() => goRequest(null)}
            />
          )}
          {screen === "alerts" && (
            <AlertsScreen onBack={() => setScreen("home")} onOpenAlert={(a) => { setActiveAlert(a); setScreen("alertDetail"); }} />
          )}
          {screen === "alertDetail" && activeAlert && (
            <AlertDetailScreen alert={activeAlert} onBack={() => setScreen("alerts")} onRequestAssistance={(title) => goRequest(null)} />
          )}
          {screen === "request" && (
            <RequestScreen onBack={() => setScreen("home")} onSubmitted={(data) => { setRequestData(data); setScreen("confirmation"); }} prefill={prefillIssue} />
          )}
          {screen === "confirmation" && requestData && (
            <ConfirmationScreen requestData={requestData} onDone={() => { setScreen("home"); setRequestData(null); }} />
          )}
        </div>
        {showNav && <BottomNav active={navActive} />}
      </div>
    </div>
  );
}
