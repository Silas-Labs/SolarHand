import { useState } from "react";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cx } from "@/lib/util";
import { loadChecklist, saveChecklist } from "./checklists";

interface ChecklistProps {
  jobId: string;
  items: string[];
}

export function Checklist({ jobId, items }: ChecklistProps) {
  const [done, setDone] = useState<boolean[]>(() => {
    const saved = loadChecklist(jobId);
    return items.map((_, i) => saved[i] ?? false);
  });

  function toggle(i: number) {
    setDone((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      saveChecklist(jobId, next);
      return next;
    });
  }

  const completed = done.filter(Boolean).length;

  return (
    <Card>
      <div className="sh-row sh-row--between">
        <span className="sh-title-sm">Checklist</span>
        <span className="sh-mono sh-faint">
          {completed}/{items.length}
        </span>
      </div>
      <div style={{ marginTop: "var(--sh-sp-2)" }}>
        {items.map((label, i) => (
          <button
            type="button"
            key={label}
            className={cx("sh-check", done[i] && "is-done")}
            onClick={() => toggle(i)}
            aria-pressed={done[i] ?? false}
          >
            <span className="sh-check__box">
              <Check aria-hidden />
            </span>
            <span className="sh-check__label">{label}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}
