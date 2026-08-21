import type { HTMLAttributes } from "react";
import { cx } from "@/lib/util";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  flush?: boolean;
}

export function Card({ flush = false, className, children, ...rest }: CardProps) {
  return (
    <div className={cx("sh-card", flush && "sh-card--flush", className)} {...rest}>
      {children}
    </div>
  );
}
