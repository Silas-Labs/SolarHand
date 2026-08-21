import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Gauge,
  MapPin,
  Play,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { db, updateJobStatusLocal } from "@/lib/db";
import { useDexieQuery } from "@/hooks/useDexieQuery";
import { useSync } from "@/store/sync";
import { toast } from "@/store/toast";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Spinner";
import { Checklist } from "./Checklist";
import { CHECKLISTS } from "./checklists";
import { JOB_STATUS_TONE, PRIORITY_LABEL } from "./jobMaps";
import { JOB_STATUS_LABEL, JOB_TYPE_LABEL, fmtDate } from "@/lib/format";
import type { JobStatus } from "@/lib/types";

export function JobDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const pending = useSync((s) => s.pending);
  const lastSyncedAt = useSync((s) => s.lastSyncedAt);
  const online = useSync((s) => s.online);
  const syncNow = useSync((s) => s.syncNow);
  const refreshPending = useSync((s) => s.refreshPending);

  const [busy, setBusy] = useState<JobStatus | null>(null);

  const { data, loading, reload } = useDexieQuery(async () => {
    const job = await db.jobs.get(id);
    const asset = job ? await db.assets.get(job.asset_id) : undefined;
    return { job, asset };
  }, [id, pending, lastSyncedAt]);

  const job = data?.job;
  const asset = data?.asset;

  async function changeStatus(next: JobStatus) {
    if (!job) return;
    setBusy(next);
    try {
      await updateJobStatusLocal(job, next);
      await refreshPending();
      toast.success(next === "done" ? "Job marked complete" : "Job updated");
      reload();
      if (online) void syncNow();
    } catch {
      toast.error("Couldn't update the job");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <Loading label="Loading job…" />;

  if (!job) {
    return (
      <>
        <Link to="/jobs" className="sh-back">
          <ArrowLeft aria-hidden /> Jobs
        </Link>
        <EmptyState title="Job not found">
          This job isn't on your device yet. Open the Sync screen to pull the
          latest data.
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <Link to="/jobs" className="sh-back">
        <ArrowLeft aria-hidden /> Jobs
      </Link>

      <div className="sh-stack">
        <div>
          <div className="sh-row sh-row--between">
            <span className="sh-eyebrow">{JOB_TYPE_LABEL[job.type]}</span>
            <Chip tone={JOB_STATUS_TONE[job.status]} dot>
              {JOB_STATUS_LABEL[job.status]}
            </Chip>
          </div>
          <h1 style={{ marginTop: 6, fontSize: "var(--sh-fs-xl)" }}>{job.title}</h1>
        </div>

        {asset && (
          <Link to={`/assets/${asset.id}`} className="sh-linkcard">
            <div className="sh-row sh-row--between">
              <div style={{ minWidth: 0 }}>
                <div className="sh-jobcard__meta" style={{ marginTop: 0 }}>
                  <MapPin aria-hidden />
                  <span className="sh-truncate">{asset.location_name}</span>
                </div>
                <div className="sh-title-sm sh-truncate" style={{ marginTop: 2 }}>
                  {asset.customer_name}
                </div>
              </div>
              <Chip tone="info">{asset.system_kwp} kWp</Chip>
            </div>
          </Link>
        )}

        {job.description && (
          <Card>
            <p className="sh-grouplabel">Notes</p>
            <p>{job.description}</p>
          </Card>
        )}

        <Card>
          <div className="sh-kv">
            <div>
              <div className="sh-kv__k">Priority</div>
              <div className="sh-kv__v">{PRIORITY_LABEL[job.priority]}</div>
            </div>
            <div>
              <div className="sh-kv__k">Scheduled</div>
              <div className="sh-kv__v">{fmtDate(job.scheduled_date)}</div>
            </div>
            <div>
              <div className="sh-kv__k">Completed</div>
              <div className="sh-kv__v">{fmtDate(job.completed_at)}</div>
            </div>
            <div>
              <div className="sh-kv__k">Job ID</div>
              <div className="sh-kv__v sh-mono sh-truncate">{job.id.slice(0, 8)}</div>
            </div>
          </div>
        </Card>

        <Checklist jobId={job.id} items={CHECKLISTS[job.type]} />

        <Button
          variant="ghost"
          block
          icon={<Gauge aria-hidden />}
          onClick={() => navigate(`/assets/${job.asset_id}/reading?job=${job.id}`)}
        >
          Capture meter reading
        </Button>

        <div className="sh-btnrow">
          {job.status === "pending" && (
            <Button
              variant="primary"
              icon={<Play aria-hidden />}
              loading={busy === "in_progress"}
              onClick={() => changeStatus("in_progress")}
            >
              Start job
            </Button>
          )}
          {job.status === "in_progress" && (
            <Button
              variant="go"
              icon={<CheckCircle2 aria-hidden />}
              loading={busy === "done"}
              onClick={() => changeStatus("done")}
            >
              Complete
            </Button>
          )}
          {job.status === "done" && (
            <Button
              variant="ghost"
              icon={<RotateCcw aria-hidden />}
              loading={busy === "in_progress"}
              onClick={() => changeStatus("in_progress")}
            >
              Reopen
            </Button>
          )}
          {(job.status === "pending" || job.status === "in_progress") && (
            <Button
              variant="danger"
              icon={<XCircle aria-hidden />}
              loading={busy === "cancelled"}
              onClick={() => changeStatus("cancelled")}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
