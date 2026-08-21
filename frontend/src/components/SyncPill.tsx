import { Link } from "react-router-dom";
import { PvGrid, type PvTone } from "./PvGrid";
import { useSync } from "@/store/sync";
import { fmtRelative } from "@/lib/format";
import { cx } from "@/lib/util";

const TOTAL = 9;

/* Compact sync status in the app bar. Taps through to the Sync screen. */
export function SyncPill() {
  const online = useSync((s) => s.online);
  const status = useSync((s) => s.status);
  const pending = useSync((s) => s.pending);
  const lastSyncedAt = useSync((s) => s.lastSyncedAt);

  let tone: PvTone = "green";
  let animate = false;
  let text = "Synced";
  let sub = "";
  let lit = TOTAL;

  if (!online) {
    tone = "idle";
    text = "Offline";
    lit = Math.min(pending, TOTAL);
    sub = pending ? `${pending} queued` : "no signal";
  } else if (status === "syncing") {
    tone = "amber";
    animate = true;
    text = "Syncing…";
    lit = Math.max(1, Math.min(pending || TOTAL, TOTAL));
  } else if (pending > 0) {
    tone = "amber";
    text = `${pending} queued`;
    lit = Math.min(pending, TOTAL);
    sub = "tap to sync";
  } else if (status === "error") {
    tone = "amber";
    text = "Sync issue";
    sub = "tap for details";
  } else {
    tone = "green";
    text = "Synced";
    sub = lastSyncedAt ? fmtRelative(lastSyncedAt) : "";
  }

  const toneClass =
    tone === "green"
      ? "sh-syncpill--green"
      : tone === "amber"
        ? "sh-syncpill--amber"
        : "sh-syncpill--idle";

  return (
    <Link to="/sync" className={cx("sh-syncpill", toneClass)} aria-label={`Sync status: ${text}`}>
      <PvGrid total={TOTAL} cols={3} lit={lit} tone={tone} animate={animate} cell={5} gap={1.6} title={text} />
      <span className="sh-syncpill__col">
        <span className="sh-syncpill__text">{text}</span>
        {sub ? <span className="sh-syncpill__sub">{sub}</span> : null}
      </span>
    </Link>
  );
}
