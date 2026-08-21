import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
}

export function EmptyState({ icon, title, children }: EmptyStateProps) {
  return (
    <div className="sh-empty">
      {icon && <div className="sh-empty__icon">{icon}</div>}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}
