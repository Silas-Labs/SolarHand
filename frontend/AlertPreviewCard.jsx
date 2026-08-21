import React from "react";
import { ChevronRight } from "lucide-react";

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

export default AlertPreviewCard;