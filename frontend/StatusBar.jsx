import React from "react";

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

export default StatusBar;