import React from "react";

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

export default CustomTooltip;