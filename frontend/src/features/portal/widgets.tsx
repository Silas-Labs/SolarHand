/* Portal presentational widgets.
   These carry the portal's distinct visual identity: the calm, owner-facing
   "your system is verified" register (vs. the installer app's field
   instrument). Kept dependency-free — inline SVG so they render instantly and
   work offline. */

export type MeterTone = "go" | "warn" | "alert";

/* The portal's signature motif: a verification seal. It embodies what an owner
   actually wants — assurance the system was checked and the record can't be
   quietly edited (SolarHand's hash-chained audit trail). Amber is spent here
   and almost nowhere else. */
export function VerifiedSeal({
  size = 76,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Verified by SolarHand"
    >
      <defs>
        <path id="sh-seal-arc" d="M50,50 m-33,0 a33,33 0 1,1 66,0 a33,33 0 1,1 -66,0" />
      </defs>
      <circle cx="50" cy="50" r="46" fill="none" stroke="var(--sh-amp)" strokeWidth="1.5" opacity="0.5" />
      <circle cx="50" cy="50" r="41" fill="none" stroke="var(--sh-amp)" strokeWidth="0.75" strokeDasharray="1 3" opacity="0.7" />
      <circle cx="50" cy="50" r="30" fill="var(--sh-amp-soft)" />
      <text fontSize="8.5" fontWeight="700" letterSpacing="1.6" fill="var(--sh-amp-strong)">
        <textPath href="#sh-seal-arc" startOffset="2%">
          VERIFIED · SOLARHAND · VERIFIED · SOLARHAND ·
        </textPath>
      </text>
      <path
        d="M39 50.5 l7.5 7.5 L63 41"
        fill="none"
        stroke="var(--sh-amp-strong)"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* Performance meter: a site's modelled ratio against the 100%-of-expected
   line. The track runs to 115% so on-spec and slightly-over sites both read
   clearly and the target tick stays visible. */
export function HealthMeter({ ratio, tone }: { ratio: number; tone: MeterTone }) {
  const CEIL = 115;
  const pct = Math.max(0, Math.min(CEIL, ratio * 100));
  const fill = (pct / CEIL) * 100;
  const target = (100 / CEIL) * 100;
  return (
    <div className={`sh-pt-meter sh-pt-meter--${tone}`}>
      <div className="sh-pt-meter__track">
        <div className="sh-pt-meter__fill" style={{ width: `${fill}%` }} />
        <span className="sh-pt-meter__target" style={{ left: `${target}%` }} aria-hidden />
      </div>
      <div className="sh-pt-meter__scale">
        <span>0</span>
        <span>expected output</span>
      </div>
    </div>
  );
}

/* Tiny 6-point performance-history sparkline. */
export function Sparkline({
  values,
  width = 108,
  height = 30,
  tone = "go",
}: {
  values: number[];
  width?: number;
  height?: number;
  tone?: MeterTone;
}) {
  if (values.length < 2) return null;
  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const n = values.length;
  const pts = values.map((v, i) => {
    const x = pad + (i / (n - 1)) * w;
    const y = pad + (1 - (v - min) / span) * h;
    return { x, y };
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  const stroke =
    tone === "alert" ? "var(--sh-alert)" : tone === "warn" ? "var(--sh-warn)" : "var(--sh-go)";
  return (
    <svg
      className="sh-pt-spark"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Six-month performance trend"
    >
      <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {last && <circle cx={last.x} cy={last.y} r="2.6" fill={stroke} />}
    </svg>
  );
}
