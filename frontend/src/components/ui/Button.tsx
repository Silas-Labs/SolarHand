import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/util";
import { Spinner } from "./Spinner";

type Variant = "primary" | "go" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  block?: boolean;
  size?: "md" | "sm";
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = "primary",
  block = false,
  size = "md",
  loading = false,
  icon,
  children,
  className,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  const onInk = variant === "primary" || variant === "go";
  return (
    <button
      type={type}
      className={cx(
        "sh-btn",
        `sh-btn--${variant}`,
        block && "sh-btn--block",
        size === "sm" && "sh-btn--sm",
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Spinner onInk={onInk} /> : icon}
      {children}
    </button>
  );
}
