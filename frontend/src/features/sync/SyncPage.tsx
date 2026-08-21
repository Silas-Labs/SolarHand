import { CloudOff, RefreshCw, TriangleAlert } from "lucide-react";
import { useSync } from "@/store/sync";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PvGrid, type PvTone } from "@/components/PvGrid";
import { fmtRelative } from "@/lib/format";

export function SyncPage() {
  const online = useSync((s) => s.online);
  const status = useSync((s) => s.status);
  const pending = useSync((s) => s.pending);
  const lastSyncedAt = useSync((s) => s.lastSyncedAt);
  const lastError = useSync((s) => s.lastError);
  const lastResult = useSync((s) => s.lastResult);
  const itemErrors = useSync((s) => s.itemErrors);
  const syncNow = useSync((s) => s.syncNow);

  const syncing = status === "syncing";

  let tone: PvTone = "green";
  let lit = 9;
  let headline = "Everything's synced";
  let sub = lastSyncedAt ? `Last synced ${fmtRelative(lastSyncedAt)}` : "Ready to sync";

  if (!online) {
    tone = "idle";
    lit = 0;
    headline = "You're offline";
    sub =
      pending > 0
        ? `${pending} change${pending > 1 ? "s" : ""} saved on this device`
        : "Changes will sync when you reconnect";
  } else if (syncing) {
    tone = "amber";
    lit = 6;
    headline = "Syncing…";
    sub = "Sending your changes and pulling the latest";
  } else if (status === "error") {
    tone = "amber";
    lit = 4;
    headline = "Some items need attention";
    sub = lastError ?? "Sync finished with issues";
  } else if (pending > 0) {
    tone = "amber";
    lit = 5;
    headline = `${pending} change${pending > 1 ? "s" : ""} queued`;
    sub = "Tap sync to send them now";
  }

  return (
    <>
      <div className="sh-pagehead">
        <div>
          <p className="sh-eyebrow">Data &amp; offline</p>
          <h1>Sync</h1>
        </div>
      </div>

      <div className="sh-stack">
        <Card className="sh-syncstate">
          <PvGrid
            total={9}
            cols={3}
            lit={lit}
            tone={tone}
            animate={syncing}
            cell={16}
            gap={4}
            title={headline}
          />
          <div style={{ minWidth: 0 }}>
            <div className="sh-syncstate__title">{headline}</div>
            <p className="sh-muted">{sub}</p>
          </div>
        </Card>

        <Button
          block
          icon={online ? <RefreshCw aria-hidden /> : <CloudOff aria-hidden />}
          loading={syncing}
          disabled={!online || syncing}
          onClick={() => void syncNow()}
        >
          {online ? "Sync now" : "Offline — can't sync"}
        </Button>

        {lastResult && (
          <Card>
            <p className="sh-grouplabel">Last upload</p>
            <div className="sh-kv">
              <div>
                <div className="sh-kv__k">Created</div>
                <div className="sh-kv__v">{lastResult.created}</div>
              </div>
              <div>
                <div className="sh-kv__k">Updated</div>
                <div className="sh-kv__v">{lastResult.updated}</div>
              </div>
              <div>
                <div className="sh-kv__k">Skipped</div>
                <div className="sh-kv__v">{lastResult.skipped}</div>
              </div>
              <div>
                <div className="sh-kv__k">Errors</div>
                <div className="sh-kv__v">{lastResult.errors}</div>
              </div>
            </div>
          </Card>
        )}

        {itemErrors.length > 0 && (
          <div>
            <p className="sh-grouplabel">Couldn't sync</p>
            <div className="sh-list">
              {itemErrors.map((e) => (
                <Card key={`${e.entity}:${e.id}`}>
                  <div className="sh-row" style={{ gap: "var(--sh-sp-2)" }}>
                    <TriangleAlert aria-hidden className="sh-icon-alert" />
                    <div style={{ minWidth: 0 }}>
                      <div className="sh-title-sm">{e.entity}</div>
                      <p className="sh-muted">{e.detail ?? "Rejected by the server"}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <p className="sh-faint" style={{ fontSize: "var(--sh-fs-xs)" }}>
          SolarHand keeps a copy of your fleet on this device so it works with no
          signal. Readings, jobs and faults you record offline upload
          automatically the moment you're back online.
        </p>
      </div>
    </>
  );
}
