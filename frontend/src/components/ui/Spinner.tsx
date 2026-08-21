import { cx } from "@/lib/util";

interface SpinnerProps {
  size?: "sm" | "lg";
  onInk?: boolean;
}

export function Spinner({ size = "sm", onInk = false }: SpinnerProps) {
  return (
    <span
      className={cx("sh-spinner", size === "lg" && "sh-spinner--lg", onInk && "sh-spinner--onink")}
      role="status"
      aria-label="Loading"
    />
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="sh-loading">
      <Spinner size="lg" />
      <span>{label}</span>
    </div>
  );
}
