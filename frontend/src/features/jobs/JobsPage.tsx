import { useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";
import { db, pendingKeys } from "@/lib/db";
import { useDexieQuery } from "@/hooks/useDexieQuery";
import { useAuth } from "@/store/auth";
import { useSync } from "@/store/sync";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Spinner";
import { cx } from "@/lib/util";
import { JobCard } from "./JobCard";
import { PRIORITY_RANK, STATUS_RANK } from "./jobMaps";
import type { AssetRead, JobRead } from "@/lib/types";

type Scope = "mine" | "all";
type StatusFilter = "open" | "all" | "done";

const OPEN_STATUSES = new Set<JobRead["status"]>(["pending", "in_progress"]);

export function JobsPage() {
  const user = useAuth((s) => s.user);
  const pending = useSync((s) => s.pending);
  const lastSyncedAt = useSync((s) => s.lastSyncedAt);

  const [scope, setScope] = useState<Scope>(
    user?.role === "technician" ? "mine" : "all",
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");

  const { data, loading } = useDexieQuery(async () => {
    const [jobs, assets, keys] = await Promise.all([
      db.jobs.toArray(),
      db.assets.toArray(),
      pendingKeys(),
    ]);
    const assetsById = new Map<string, AssetRead>(assets.map((a) => [a.id, a]));
    return { jobs, assetsById, keys };
  }, [pending, lastSyncedAt]);

  const visible = useMemo(() => {
    if (!data) return [];
    let jobs = data.jobs;
    if (scope === "mine" && user) {
      jobs = jobs.filter((j) => j.assigned_to === user.id);
    }
    if (statusFilter === "open") {
      jobs = jobs.filter((j) => OPEN_STATUSES.has(j.status));
    } else if (statusFilter === "done") {
      jobs = jobs.filter((j) => j.status === "done");
    }
    return [...jobs].sort((a, b) => {
      const s = STATUS_RANK[a.status] - STATUS_RANK[b.status];
      if (s !== 0) return s;
      const p = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (p !== 0) return p;
      const ad = a.scheduled_date ?? "9999";
      const bd = b.scheduled_date ?? "9999";
      return ad < bd ? -1 : ad > bd ? 1 : 0;
    });
  }, [data, scope, statusFilter, user]);

  return (
    <>
      <div className="sh-pagehead">
        <div>
          <p className="sh-eyebrow">Field queue</p>
          <h1>Jobs</h1>
        </div>
      </div>

      <div className="sh-toolbar">
        <div className="sh-seg" role="tablist" aria-label="Job scope">
          <button
            role="tab"
            aria-selected={scope === "mine"}
            className={cx("sh-seg__btn", scope === "mine" && "is-active")}
            onClick={() => setScope("mine")}
          >
            Mine
          </button>
          <button
            role="tab"
            aria-selected={scope === "all"}
            className={cx("sh-seg__btn", scope === "all" && "is-active")}
            onClick={() => setScope("all")}
          >
            All
          </button>
        </div>
        <div className="sh-seg" role="tablist" aria-label="Status filter">
          {(["open", "all", "done"] as StatusFilter[]).map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={statusFilter === f}
              className={cx("sh-seg__btn", statusFilter === f && "is-active")}
              onClick={() => setStatusFilter(f)}
            >
              {f === "open" ? "Open" : f === "done" ? "Done" : "All"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Loading label="Loading jobs…" />
      ) : visible.length === 0 ? (
        <EmptyState icon={<ClipboardList aria-hidden />} title="No jobs here">
          {scope === "mine"
            ? "Nothing assigned to you in this view. Try “All”, or pull to sync."
            : "No jobs match this filter yet."}
        </EmptyState>
      ) : (
        <div className="sh-list">
          {visible.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              asset={data?.assetsById.get(job.asset_id)}
              pending={data?.keys.has(`job:${job.id}`)}
            />
          ))}
        </div>
      )}
    </>
  );
}
