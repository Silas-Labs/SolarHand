import React from "react";
import { ArrowLeft, Sparkles, CheckCircle2 } from "lucide-react";

const severityStyle = {
  Medium: { color: "var(--gold)", bg: "rgba(227,167,61,0.14)" },
  Low: { color: "var(--blue-sync)", bg: "rgba(108,143,163,0.14)" },
  Info: { color: "var(--off-white-50)", bg: "rgba(242,239,230,0.06)" },
};

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

export default AlertDetailScreen;