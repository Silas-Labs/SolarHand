import React from "react";

function HealthRing({ score = 92 }) {
  const radius = 64;
  const stroke = 10;
  const norm = radius - stroke / 2;
  const circumference = 2 * Math.PI * norm;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "var(--green-bright)" : score >= 55 ? "var(--gold)" : "var(--red)";
  const label = score >= 80 ? "Good" : score >= 55 ? "Fair" : "Needs attention";

  return (
    <div className="relative flex items-center justify-center" style={{ width: radius * 2, height: radius * 2 }}>
      <svg width={radius * 2} height={radius * 2} className="-rotate-90">
        <circle cx={radius} cy={radius} r={norm} fill="none" stroke="var(--charcoal-700)" strokeWidth={stroke} />
        <circle
          cx={radius}
          cy={radius}
          r={norm}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          className="ca-ring-progress"
          style={{ "--ring-full": circumference, "--ring-offset": offset, strokeDashoffset: offset }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="ca-display text-3xl font-bold" style={{ color: "var(--off-white)" }}>{score}</span>
        <span className="text-[11px] font-medium" style={{ color }}>{label}</span>
      </div>
    </div>
  );
}

export default HealthRing;