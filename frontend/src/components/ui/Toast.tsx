import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { useToast } from "@/store/toast";
import { cx } from "@/lib/util";

export function ToastHost() {
  const toasts = useToast((s) => s.toasts);
  const dismiss = useToast((s) => s.dismiss);
  if (!toasts.length) return null;
  return (
    <div className="sh-toasts" role="region" aria-live="polite" aria-label="Notifications">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          className={cx("sh-toast", `sh-toast--${t.kind}`)}
          onClick={() => dismiss(t.id)}
        >
          {t.kind === "success" ? (
            <CheckCircle2 aria-hidden />
          ) : t.kind === "error" ? (
            <AlertTriangle aria-hidden />
          ) : (
            <Info aria-hidden />
          )}
          <span>{t.message}</span>
        </button>
      ))}
    </div>
  );
}
