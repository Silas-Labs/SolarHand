import React from "react";

function PulseWaveform() {
  // Build a single waveform path, then duplicate it for a seamless scroll loop.
  const points = [
    4, 6, 5, 9, 7, 14, 8, 5, 6, 10, 18, 9, 6, 5, 8, 22, 11, 6, 5, 7, 9, 6, 5,
    12, 15, 8, 6, 5, 9, 7,
  ];
  const w = 8;
  const h = 28;
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${i * w} ${h - p}`)
    .join(" ");

  const svg = (
    <svg
      width={points.length * w}
      height={h + 4}
      viewBox={`0 0 ${points.length * w} ${h + 4}`}
      fill="none"
      style={{ display: "block" }}
    >
      <path d={path} stroke="var(--green-bright)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <div
      className="relative overflow-hidden rounded"
      style={{ width: 260, height: 32, background: "var(--charcoal-900)", border: "1px solid var(--line)" }}
      role="img"
      aria-label="Live aggregate fleet telemetry pulse"
    >
      <div className="sh-pulse-track">
        {svg}
        {svg}
      </div>
      <div
        className="absolute inset-y-0 left-0 w-6 pointer-events-none"
        style={{ background: "linear-gradient(to right, var(--charcoal-900), transparent)" }}
      />
      <div
        className="absolute inset-y-0 right-0 w-6 pointer-events-none"
        style={{ background: "linear-gradient(to left, var(--charcoal-900), transparent)" }}
      />
    </div>
  );
}

export default PulseWaveform;