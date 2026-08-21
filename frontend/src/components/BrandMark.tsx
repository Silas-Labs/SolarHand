/* Inline brand mark — a monocrystalline module tile. Inlined (not an <img>) so
   it renders instantly and works fully offline. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      role="img"
      aria-label="SolarHand"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="8" fill="#10152e" />
      <rect
        x="6"
        y="6"
        width="20"
        height="20"
        rx="3"
        fill="#161d3f"
        stroke="#263166"
        strokeWidth="0.75"
      />
      {/* 3×3 PV cells: one amber (charge), two green (healthy), rest dormant. */}
      <g>
        <rect x="8" y="8" width="4.8" height="4.8" rx="1" fill="#1b2450" />
        <rect x="13.6" y="8" width="4.8" height="4.8" rx="1" fill="#1b2450" />
        <rect x="19.2" y="8" width="4.8" height="4.8" rx="1" fill="#f2a413" />
        <rect x="8" y="13.6" width="4.8" height="4.8" rx="1" fill="#1b2450" />
        <rect x="13.6" y="13.6" width="4.8" height="4.8" rx="1" fill="#1b2450" />
        <rect x="19.2" y="13.6" width="4.8" height="4.8" rx="1" fill="#1b2450" />
        <rect x="8" y="19.2" width="4.8" height="4.8" rx="1" fill="#1b2450" />
        <rect x="13.6" y="19.2" width="4.8" height="4.8" rx="1" fill="#2f7d55" />
        <rect x="19.2" y="19.2" width="4.8" height="4.8" rx="1" fill="#2f7d55" />
      </g>
    </svg>
  );
}
