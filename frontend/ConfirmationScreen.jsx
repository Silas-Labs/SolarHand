import React from "react";
import { urgencyOptions } from "./solarhand-client-app";

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

export default ConfirmationScreen;