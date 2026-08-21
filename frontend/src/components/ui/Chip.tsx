import type { ReactNode } from "react";
import { cx } from "@/lib/util";

export type ChipTone = "go" | "warn" | "alert" | "info" | "amber" | "neutral";

interface ChipProps {
  tone?: ChipTone;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}

export function Chip({ tone = "neutral", dot = false, className, children }: ChipProps) {
  return (
    <span className={cx("sh-chip", `sh-chip--${tone}`, className)}>
      {dot && <span className="sh-chip__dot" aria-hidden />}
      {children}
    </span>
  );
}
