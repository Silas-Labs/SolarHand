import React, { useState } from "react";
import {
  issueTypes,
  urgencyOptions,
  priorRequests,
} from "./solarhand-client-app";

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

export default RequestScreen;