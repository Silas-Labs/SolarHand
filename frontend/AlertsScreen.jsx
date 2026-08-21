import React, { useState } from "react";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

const severityStyle = {
  Critical: { color: "var(--red)", bg: "var(--red-dim)", label: "Critical" },
  High: { color: "var(--gold)", bg: "rgba(227,167,61,0.14)", label: "High" },
  Medium: { color: "var(--off-white-70)", bg: "rgba(242,239,230,0.07)", label: "Medium" },
};

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

function AlertsScreen({ onBack, onOpenAlert }) {
  const [filter, setFilter] = useState("all");
  const filtered = alerts.filter((a) => (filter === "all" ? true : filter === "action" ? a.status === "action" : a.status === "resolved" || a.status === "scheduled"));

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--line)" }}>
        <button onClick={onBack} className="ca-tap ca-focusable w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--charcoal-800)" }}>
          <ArrowLeft size={15} style={{ color: "var(--off-white)" }} />
        </button>
        <h1 className="text-sm font-semibold" style={{ color: "var(--off-white)" }}>Alerts & Maintenance</h1>
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

export default AlertsScreen;