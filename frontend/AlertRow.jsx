import React from "react";
import { Clock } from "lucide-react";

function AlertRow({ alert }) {
  const severityStyle = {
    Critical: { color: "var(--red)", bg: "var(--red-dim)", label: "Critical" },
    High: { color: "var(--gold)", bg: "rgba(227,167,61,0.14)", label: "High" },
    Medium: { color: "var(--off-white-70)", bg: "rgba(242,239,230,0.07)", label: "Medium" },
  };
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

export default AlertRow;