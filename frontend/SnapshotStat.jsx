import React from "react";

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

export default SnapshotStat;