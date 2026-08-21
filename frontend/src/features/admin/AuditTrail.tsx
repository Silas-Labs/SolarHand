/* AuditTrail — a window onto the tamper-evident, hash-chained audit log.
   Every write on the server appends an entry whose hash folds in the previous
   entry's hash, so any later edit breaks the chain. The "Verify integrity"
   action recomputes the chain end to end and reports whether it still holds.

   Entries are fetched once and filtered in the browser, so the type filter is
   built from the entity types actually present rather than a hard-coded list.
   Online-first via useAsync. */

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { Button } from "@/components/ui/Button";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Spinner";
import { toast } from "@/store/toast";
import { fmtDate, fmtRelative, humanize } from "@/lib/format";
import { cx } from "@/lib/util";
import type { AuditLogRead, AuditVerifyResult, UserRead } from "@/lib/types";

function actionTone(action: string): ChipTone {
  const a = action.toLowerCase();
  if (a.startsWith("creat")) return "go";
  if (a.startsWith("updat")) return "info";
  if (a.startsWith("delet") || a.startsWith("remov")) return "alert";
  return "neutral";
}

function shortHash(hash: string): string {
  return hash ? hash.slice(0, 12) : "—";
}

export function AuditTrail() {
  const users = useAsync(() => api.listUsers(), []);
  const log = useAsync(() => api.listAudit({ limit: 200 }), []);

  const [entityType, setEntityType] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verdict, setVerdict] = useState<AuditVerifyResult | null>(null);

  const userById = useMemo(() => {
    const m = new Map<string, UserRead>();
    for (const u of users.data ?? []) m.set(u.id, u);
    return m;
  }, [users.data]);

  const entries = useMemo(
    () => [...(log.data ?? [])].sort((a, b) => b.id - a.id),
    [log.data],
  );
  const types = useMemo(
    () => Array.from(new Set(entries.map((e) => e.entity_type))).sort(),
    [entries],
  );
  const shown = entityType
    ? entries.filter((e) => e.entity_type === entityType)
    : entries;

  async function onVerify() {
    setVerifying(true);
    try {
      const result = await api.verifyAudit();
      setVerdict(result);
      if (result.valid) {
        toast.success(`Chain intact — ${result.entries} entries verified.`);
      } else {
        toast.error("Integrity check failed — the log has been altered.");
      }
    } catch {
      toast.error("Couldn't run the integrity check. Try again.");
    } finally {
      setVerifying(false);
    }
  }

  function actorName(actorId: string | null): string {
    if (!actorId) return "System";
    return userById.get(actorId)?.full_name ?? "Unknown user";
  }

  return (
    <>
      <div className="sh-pagehead">
        <div>
          <p className="sh-eyebrow">Tamper-evident history</p>
          <h1>Audit trail</h1>
        </div>
        <Button
          icon={<ShieldCheck aria-hidden />}
          variant="primary"
          loading={verifying}
          disabled={log.loading || entries.length === 0}
          onClick={() => void onVerify()}
        >
          Verify integrity
        </Button>
      </div>

      {verdict ? (
        <div
          className={cx("sh-audit__verdict", verdict.valid ? "is-ok" : "is-bad")}
          role="status"
        >
          {verdict.valid ? <ShieldCheck aria-hidden /> : <ShieldAlert aria-hidden />}
          <div>
            <strong>
              {verdict.valid ? "Chain intact" : "Integrity check failed"}
            </strong>
            <span>
              {verdict.valid
                ? `${verdict.entries} entries verified end to end.`
                : `The chain breaks at hash ${shortHash(verdict.first_bad_hash ?? "")}. An entry has been altered or removed.`}
            </span>
          </div>
        </div>
      ) : null}

      {log.loading ? (
        <Loading label="Loading audit log…" />
      ) : log.error ? (
        <EmptyState title="Couldn't load the audit log">
          {log.error}{" "}
          <button className="sh-linklike" onClick={log.reload}>Retry</button>
        </EmptyState>
      ) : entries.length === 0 ? (
        <EmptyState title="No audit entries yet">
          Actions across the fleet will be recorded here as an unbroken chain.
        </EmptyState>
      ) : (
        <>
          {types.length > 1 ? (
            <div className="sh-audit__filters" role="tablist" aria-label="Filter by type">
              <button
                type="button"
                className={cx("sh-audit__filter", entityType === "" && "is-active")}
                onClick={() => setEntityType("")}
              >
                All
              </button>
              {types.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={cx("sh-audit__filter", entityType === t && "is-active")}
                  onClick={() => setEntityType(t)}
                >
                  {humanize(t)}
                </button>
              ))}
            </div>
          ) : null}

          <div className="sh-list">
            {shown.map((entry) => (
              <AuditRow
                key={entry.id}
                entry={entry}
                actor={actorName(entry.actor_id)}
                open={expanded === entry.id}
                onToggle={() =>
                  setExpanded((cur) => (cur === entry.id ? null : entry.id))
                }
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function AuditRow({
  entry,
  actor,
  open,
  onToggle,
}: {
  entry: AuditLogRead;
  actor: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="sh-card sh-audit__row">
      <button
        type="button"
        className="sh-audit__rowhead"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className="sh-audit__chevron" aria-hidden>
          {open ? <ChevronDown /> : <ChevronRight />}
        </span>
        <Chip tone={actionTone(entry.action)}>{humanize(entry.action)}</Chip>
        <span className="sh-audit__entity sh-truncate">
          {humanize(entry.entity_type)}
          <span className="sh-mono sh-faint"> · {entry.entity_id.slice(0, 8)}</span>
        </span>
        <span className="sh-audit__when sh-faint" title={entry.created_at}>
          {fmtRelative(entry.created_at)}
        </span>
      </button>

      {open ? (
        <div className="sh-audit__detail">
          <dl className="sh-audit__facts">
            <div><dt>Actor</dt><dd>{actor}</dd></div>
            <div><dt>Timestamp</dt><dd>{fmtDate(entry.created_at)}</dd></div>
            <div>
              <dt>Entry</dt>
              <dd className="sh-mono">#{entry.id}</dd>
            </div>
            <div>
              <dt>Hash</dt>
              <dd className="sh-mono sh-truncate">{shortHash(entry.hash)}</dd>
            </div>
            <div>
              <dt>Previous</dt>
              <dd className="sh-mono sh-truncate">{shortHash(entry.prev_hash)}</dd>
            </div>
          </dl>
          <pre className="sh-audit__payload sh-mono">
            {JSON.stringify(entry.payload, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
