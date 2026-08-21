import React from "react";
import { Sun, AlertTriangle, Wrench, WifiOff, Users, ShieldAlert, CheckCircle2, Search, Bell, ChevronRight, Clock, Radio, MapPin, LayoutGrid, ListChecks, Hammer, UserRound, Building2, BarChart3, Settings, ArrowUpRight, ArrowDownRight } from "lucide-react";

function MetricCard({ metric }) {
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

export default MetricCard;