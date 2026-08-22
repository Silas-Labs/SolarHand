/* Dispatch — the admin's job board. Jobs are grouped by status into a
   responsive board (columns on desktop, stacked on phones). A collapsible form
   creates and assigns work; each job row can be reassigned or moved through
   statuses inline. Online-first via useAsync + direct API writes. */

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { Button } from "@/components/ui/Button";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { InputField, SelectField, TextareaField } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Spinner";
import { toast } from "@/store/toast";
import { JOB_STATUS_LABEL, JOB_TYPE_LABEL, fmtDate } from "@/lib/format";
import type {
  AssetRead,
  JobPriority,
  JobRead,
  JobStatus,
  JobType,
  JobUpsert,
  UserRead,
} from "@/lib/types";

const STATUS_ORDER: JobStatus[] = ["pending", "in_progress", "done", "cancelled"];
const TYPES: JobType[] = ["inspection", "install", "repair", "cleaning", "commissioning"];

const PRIORITY_LABEL: Record<JobPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};
const PRIORITY_TONE: Record<JobPriority, ChipTone> = {
  low: "neutral",
  normal: "info",
  high: "amber",
  urgent: "alert",
};
const PRIORITY_RANK: Record<JobPriority, number> = { urgent: 3, high: 2, normal: 1, low: 0 };

interface JobForm {
  asset_id: string;
  type: JobType;
  title: string;
  priority: JobPriority;
  assigned_to: string;
  scheduled_date: string;
  description: string;
}

const EMPTY_FORM: JobForm = {
  asset_id: "",
  type: "inspection",
  title: "",
  priority: "normal",
  assigned_to: "",
  scheduled_date: "",
  description: "",
};

export function Dispatch() {
  const { data, loading, error, reload } = useAsync(async () => {
    const [jobs, assets, users] = await Promise.all([
      api.listJobs(),
      api.listAssets(),
      api.listUsers(),
    ]);
    return { jobs, assets, users };
  }, []);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<JobForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const compareText = (a?: string | null, b?: string | null) =>
    (a ?? "").localeCompare(b ?? "");

  const assets = useMemo(
    () => {
      const rows = Array.isArray(data?.assets) ? data.assets : [];
      return [...rows].sort((a, b) => compareText(a.customer_name, b.customer_name));
    },
    [data],
  );
  const assignable = useMemo(() => {
    const users = Array.isArray(data?.users) ? data.users : [];
    return users
      .filter((u) => u.is_active)
      .sort((a, b) => compareText(a.full_name, b.full_name));
  }, [data]);
  const assetById = useMemo(() => {
    const m = new Map<string, AssetRead>();
    for (const a of assets) m.set(a.id, a);
    return m;
  }, [assets]);
  const userById = useMemo(() => {
    const m = new Map<string, UserRead>();
    for (const u of Array.isArray(data?.users) ? data.users : []) m.set(u.id, u);
    return m;
  }, [data]);

  const groups = useMemo(() => {
    const g: Record<JobStatus, JobRead[]> = {
      pending: [],
      in_progress: [],
      done: [],
      cancelled: [],
    };
    for (const j of Array.isArray(data?.jobs) ? data.jobs : []) g[j.status].push(j);
    for (const status of STATUS_ORDER) {
      g[status].sort((a, b) => {
        const p = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
        if (p !== 0) return p;
        return (a.scheduled_date ?? "9999").localeCompare(b.scheduled_date ?? "9999");
      });
    }
    return g;
  }, [data]);

  const canSubmit = form.asset_id !== "" && form.title.trim() !== "" && !submitting;

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    const payload: JobUpsert = {
      asset_id: form.asset_id,
      type: form.type,
      title: form.title.trim(),
      priority: form.priority,
      assigned_to: form.assigned_to || null,
      scheduled_date: form.scheduled_date || null,
      description: form.description.trim() || null,
    };
    try {
      await api.createJob(payload);
      toast.success("Job created.");
      setForm(EMPTY_FORM);
      setShowForm(false);
      reload();
    } catch {
      toast.error("Couldn't create the job. Check the details and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const set = <K extends keyof JobForm>(key: K, value: JobForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <>
      <div className="sh-pagehead">
        <div>
          <p className="sh-eyebrow">Schedule &amp; assign work</p>
          <h1>Dispatch</h1>
        </div>
        <Button
          icon={showForm ? <X aria-hidden /> : <Plus aria-hidden />}
          variant={showForm ? "ghost" : "primary"}
          onClick={() => setShowForm((v) => !v)}
          disabled={!loading && !error && assets.length === 0}
        >
          {showForm ? "Cancel" : "New job"}
        </Button>
      </div>

      {showForm && (
        <form className="sh-card sh-adm-form" onSubmit={onCreate}>
          <div className="sh-adm-form__grid">
            <SelectField
              label="System"
              value={form.asset_id}
              onChange={(e) => set("asset_id", e.target.value)}
              required
            >
              <option value="" disabled>
                Choose a system…
              </option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.customer_name} · {a.location_name}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Type"
              value={form.type}
              onChange={(e) => set("type", e.target.value as JobType)}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {JOB_TYPE_LABEL[t]}
                </option>
              ))}
            </SelectField>
            <InputField
              label="Title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Quarterly inspection"
              required
            />
            <SelectField
              label="Priority"
              value={form.priority}
              onChange={(e) => set("priority", e.target.value as JobPriority)}
            >
              {(Object.keys(PRIORITY_LABEL) as JobPriority[]).map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Assign to"
              hint="Optional — leave unassigned to triage later"
              value={form.assigned_to}
              onChange={(e) => set("assigned_to", e.target.value)}
            >
              <option value="">Unassigned</option>
              {assignable.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </SelectField>
            <InputField
              label="Scheduled date"
              type="date"
              value={form.scheduled_date}
              onChange={(e) => set("scheduled_date", e.target.value)}
            />
          </div>
          <TextareaField
            label="Notes"
            rows={2}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Anything the technician should know before arriving"
          />
          <div className="sh-btnrow">
            <Button type="submit" variant="primary" loading={submitting} disabled={!canSubmit}>
              Create job
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <Loading label="Loading jobs…" />
      ) : error ? (
        <EmptyState title="Couldn't load jobs">
          {error} <button className="sh-linklike" onClick={reload}>Retry</button>
        </EmptyState>
      ) : (data?.jobs.length ?? 0) === 0 ? (
        <EmptyState title="No jobs yet">
          {assets.length === 0
            ? "Register a system first, then schedule work against it."
            : "Create the first job to start dispatching your team."}
        </EmptyState>
      ) : (
        <div className="sh-adm-board">
          {STATUS_ORDER.map((status) => (
            <section key={status} className="sh-adm-col">
              <div className="sh-adm-col__head">
                <span>{JOB_STATUS_LABEL[status]}</span>
                <span className="sh-mono sh-faint">{groups[status].length}</span>
              </div>
              <div className="sh-adm-col__body">
                {groups[status].length === 0 ? (
                  <p className="sh-adm-col__empty">Nothing here</p>
                ) : (
                  groups[status].map((job) => (
                    <DispatchRow
                      key={job.id}
                      job={job}
                      asset={assetById.get(job.asset_id) ?? null}
                      assignee={job.assigned_to ? userById.get(job.assigned_to) ?? null : null}
                      assignable={assignable}
                      onChanged={reload}
                    />
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

/* One job on the board, with inline status + assignee controls. */
function DispatchRow({
  job,
  asset,
  assignee,
  assignable,
  onChanged,
}: {
  job: JobRead;
  asset: AssetRead | null;
  assignee: UserRead | null;
  assignable: UserRead[];
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function patch(payload: Partial<JobUpsert>, okMsg: string) {
    setBusy(true);
    try {
      await api.updateJob(job.id, payload);
      toast.success(okMsg);
      onChanged();
    } catch {
      toast.error("Update failed. Try again.");
      setBusy(false); // onChanged() will remount on success; only reset on failure
    }
  }

  return (
    <div className="sh-adm-jobcard" data-busy={busy || undefined}>
      <div className="sh-row sh-row--between">
        <span className="sh-title-sm sh-truncate">{job.title}</span>
        <Chip tone={PRIORITY_TONE[job.priority]}>{PRIORITY_LABEL[job.priority]}</Chip>
      </div>
      <p className="sh-adm-jobcard__meta sh-truncate">
        {JOB_TYPE_LABEL[job.type]}
        {asset ? ` · ${asset.customer_name}` : ""}
      </p>
      {job.scheduled_date ? (
        <p className="sh-adm-jobcard__date sh-mono">{fmtDate(job.scheduled_date)}</p>
      ) : null}

      <div className="sh-adm-jobcard__controls">
        <label className="sh-adm-minifield">
          <span>Status</span>
          <select
            className="sh-select sh-select--sm"
            value={job.status}
            disabled={busy}
            onChange={(e) => void patch({ status: e.target.value as JobStatus }, "Status updated.")}
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {JOB_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="sh-adm-minifield">
          <span>Assignee</span>
          <select
            className="sh-select sh-select--sm"
            value={assignee?.id ?? ""}
            disabled={busy}
            onChange={(e) =>
              void patch({ assigned_to: e.target.value || null }, "Reassigned.")
            }
          >
            <option value="">Unassigned</option>
            {assignable.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
