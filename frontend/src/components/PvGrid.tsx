/* PvGrid — the app's signature status glyph.
   A miniature PV module whose cells are dim/dormant when idle, glow amber while
   work is queued or syncing, and settle to green once the outbox is drained.
   Purely presentational; SyncPill maps live sync state onto it. */

import { cx } from "@/lib/util";

export type PvTone = "amber" | "green" | "idle";

interface PvGridProps {
  total?: number;
  cols?: number;
  /** Number of lit cells (0..total). */
  lit?: number;
  tone?: PvTone;
  animate?: boolean;
  /** Cell edge length in px. */
  cell?: number;
  gap?: number;
  title?: string;
}

export function PvGrid({
  total = 9,
  cols = 3,
  lit = 0,
  tone = "idle",
  animate = false,
  cell = 6,
  gap = 2,
  title,
}: PvGridProps) {
  const rows = Math.ceil(total / cols);
  const radius = Math.max(1, cell * 0.22);
  const width = cols * cell + (cols - 1) * gap;
  const height = rows * cell + (rows - 1) * gap;
  const litClass =
    tone === "green"
      ? "sh-pvgrid__cell--lit-green"
      : tone === "amber"
        ? "sh-pvgrid__cell--lit-amber"
        : "sh-pvgrid__cell--idle";

  const cells = Array.from({ length: total }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const isLit = i < lit;
    return (
      <rect
        key={i}
        x={col * (cell + gap)}
        y={row * (cell + gap)}
        width={cell}
        height={cell}
        rx={radius}
        className={cx("sh-pvgrid__cell", isLit && litClass)}
      />
    );
  });

  return (
    <svg
      className={cx("sh-pvgrid", animate && tone === "amber" && "is-animated")}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={title ?? "Sync status"}
      xmlns="http://www.w3.org/2000/svg"
    >
      {cells}
    </svg>
  );
}
