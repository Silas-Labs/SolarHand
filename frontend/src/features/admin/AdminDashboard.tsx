/* AdminDashboard — the fleet-overview landing screen for administrators.
   Composes assets, jobs, faults and users into a handful of KPIs, two quiet
   bar breakdowns, and an actionable list of open faults. Online-first: reads
   come straight from the API via useAsync. */

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  CheckCircle2,
  MapPin,
  RefreshCw,
  ShieldAlert,
  Sun,
  TriangleAlert,
  Users,
  Wrench,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { FaultBadge } from "@/components/ui/SeverityBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Spinner";
import { toast } from "@/store/toast";
import { FAULT_CATEGORY_LABEL, FAULT_SOURCE_LABEL, fmtRelative } from "@/lib/format";
import type {
  AssetRead,
  AssetStatus,
  FaultReportRead,
  FaultSeverity,
  FaultSource,
  JobRead,
  JobStatus,
} from "@/lib/types";
import { JOB_STATUS_LABEL } from "@/lib/format";

const SEVERITY_RANK: Record<FaultSeverity, number> = {
  critical: 3,
  warning: 2,
  info: 1,
};

/** Provenance chip tone — machine sources (telemetry/forecast) stand out. */
const SOURCE_TONE: Record<FaultSource, ChipTone> = {
  telemetry: "info",
  forecast: "amber",
  system: "neutral",
  technician: "neutral",
};

const JOB_BAR: { status: JobStatus; tone: string }[] = [
  { status: "pending", tone: "warn" },
  { status: "in_progress", tone: "info" },
  { status: "done", tone: "go" },
  { status: "cancelled", tone: "neutral" },
];

const ASSET_BAR: { status: AssetStatus; label: string; tone: string }[] = [
  { status: "active", label: "Active", tone: "go" },
  { status: "maintenance", label: "Maintenance", tone: "warn" },
  { status: "inactive", label: "Inactive", tone: "neutral" },
];

export function AdminDashboard() {
  const { data, loading, error, reload } = useAsync(async () => {
    const [assets, jobs, faults, users] = await Promise.all([
      api.listAssets(),
      api.listJobs(),
      api.listFaults({ resolved: false }),
      api.listUsers(),
    ]);
    return { assets, jobs, faults, users };
  }, []);

  const [resolving, setResolving] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function onRollup() {
    setRefreshing(true);
    try {
      const res = await api.runTelemetryRollup({ includeToday: false });
      const n = res.readings.length;
      toast.success(
        n > 0
          ? `Rolled up ${n} telemetry reading${n === 1 ? "" : "s"}.`
          : "Telemetry is up to date — no new readings.",
      );
      reload();
    } catch {
      toast.error("Couldn't refresh telemetry. Try again.");
    } finally {
      setRefreshing(false);
    }
  }

  const assets = useMemo(() => (Array.isArray(data?.assets) ? data.assets : []), [data]);
  const jobs = useMemo(() => (Array.isArray(data?.jobs) ? data.jobs : []), [data]);
  const faults = useMemo(() => (Array.isArray(data?.faults) ? data.faults : []), [data]);
  const users = useMemo(() => (Array.isArray(data?.users) ? data.users : []), [data]);

  const assetById = useMemo(() => {
    const m = new Map<string, AssetRead>();
    for (const a of assets) m.set(a.id, a);
    return m;
  }, [assets]);

  const kpis = useMemo(() => summarize({ assets, jobs, faults, users }), [assets, jobs, faults, users]);

  const recentFaults = useMemo(() => {
    const sorted = [...faults];
    sorted.sort((a, b) => {
      const r = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
      if (r !== 0) return r;
      return b.created_at.localeCompare(a.created_at);
    });
    return sorted.slice(0, 6);
  }, [faults]);

  async function onResolve(fault: FaultReportRead) {
    setResolving(fault.id);
    try {
      await api.resolveFault(fault.id);
      toast.success("Fault marked resolved.");
      reload();
    } catch {
      toast.error("Couldn't resolve that fault. Try again.");
    } finally {
      setResolving(null);
    }
  }

  return (
    <>
      <div className="sh-pagehead">
        <div>
          <p className="sh-eyebrow">Fleet overview</p>
          <h1>Dashboard</h1>
        </div>
      </div>

      {loading ? (
        <Loading label="Loading fleet…" />
      ) : error ? (
        <EmptyState icon={<TriangleAlert aria-hidden />} title="Couldn't load the fleet">
          {error} <button className="sh-linklike" onClick={reload}>Retry</button>
        </EmptyState>
      ) : (
        <>
          <div className="sh-adm-kpis">
            <KpiCard
              icon={<Sun aria-hidden />}
              label="Installed systems"
              value={kpis.assetsTotal}
              foot={
                kpis.assetsConnected > 0
                  ? `${kpis.assetsActive} active · ${kpis.assetsConnected} connected`
                  : `${kpis.assetsActive} active`
              }
              tone="info"
            />
            <KpiCard
              icon={<ShieldAlert aria-hidden />}
              label="Open faults"
              value={kpis.faultsOpen}
              foot={kpis.faultsCritical > 0 ? `${kpis.faultsCritical} critical` : "none critical"}
              tone={kpis.faultsCritical > 0 ? "alert" : kpis.faultsOpen > 0 ? "warn" : "go"}
            />
            <KpiCard
              icon={<Wrench aria-hidden />}
              label="Open jobs"
              value={kpis.jobsOpen}
              foot={`${kpis.jobsPending} awaiting start`}
              tone={kpis.jobsOpen > 0 ? "info" : "go"}
            />
            <KpiCard
              icon={<Users aria-hidden />}
              label="Technicians"
              value={kpis.techsActive}
              foot={`${kpis.usersTotal} total members`}
              tone="info"
            />
          </div>

          <div className="sh-adm-grid2">
            <Card>
              <div className="sh-adm-cardhead">
                <Wrench aria-hidden />
                <h2 className="sh-title-sm">Jobs by status</h2>
              </div>
              {kpis.jobsTotal === 0 ? (
                <p className="sh-muted">No jobs scheduled yet.</p>
              ) : (
                <div className="sh-adm-bars">
                  {JOB_BAR.map(({ status, tone }) => (
                    <BarRow
                      key={status}
                      label={JOB_STATUS_LABEL[status]}
                      value={kpis.jobsByStatus[status]}
                      total={kpis.jobsTotal}
                      tone={tone}
                    />
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <div className="sh-adm-cardhead">
                <Activity aria-hidden />
                <h2 className="sh-title-sm">Systems by status</h2>
              </div>
              {kpis.assetsTotal === 0 ? (
                <p className="sh-muted">No systems registered yet.</p>
              ) : (
                <div className="sh-adm-bars">
                  {ASSET_BAR.map(({ status, label, tone }) => (
                    <BarRow
                      key={status}
                      label={label}
                      value={kpis.assetsByStatus[status]}
                      total={kpis.assetsTotal}
                      tone={tone}
                    />
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="sh-adm-sectionhead">
            <h2 className="sh-title-sm">Open faults</h2>
            <div className="sh-row" style={{ gap: "var(--sh-sp-3)", alignItems: "center" }}>
              {kpis.assetsConnected > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<RefreshCw aria-hidden />}
                  loading={refreshing}
                  onClick={() => void onRollup()}
                >
                  Refresh telemetry
                </Button>
              )}
              <Link to="/admin/map" className="sh-linklike">View on map</Link>
            </div>
          </div>

          {recentFaults.length === 0 ? (
            <EmptyState icon={<CheckCircle2 aria-hidden />} title="No open faults">
              Every system in the fleet is reporting healthy.
            </EmptyState>
          ) : (
            <div className="sh-list">
              {recentFaults.map((fault) => {
                const asset = assetById.get(fault.asset_id);
                return (
                  <Card key={fault.id} className="sh-adm-faultrow">
                    <div className="sh-row sh-row--between">
                      <div style={{ minWidth: 0 }}>
                        <div className="sh-row" style={{ gap: "var(--sh-sp-2)" }}>
                          <FaultBadge severity={fault.severity} />
                          <span className="sh-title-sm">
                            {FAULT_CATEGORY_LABEL[fault.category]}
                          </span>
                          <Chip tone={SOURCE_TONE[fault.source]}>
                            {FAULT_SOURCE_LABEL[fault.source]}
                          </Chip>
                        </div>
                        <div className="sh-jobcard__meta">
                          <MapPin aria-hidden />
                          <span className="sh-truncate">
                            {asset ? `${asset.customer_name} · ${asset.location_name}` : "Unknown system"}
                          </span>
                        </div>
                        {fault.description ? (
                          <p className="sh-adm-faultrow__desc sh-truncate">{fault.description}</p>
                        ) : null}
                      </div>
                      <div className="sh-adm-faultrow__side">
                        <span className="sh-faint">{fmtRelative(fault.created_at)}</span>
                        <Button
                          size="sm"
                          variant="go"
                          loading={resolving === fault.id}
                          onClick={() => void onResolve(fault)}
                        >
                          Resolve
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  );
}

/* -- KPI + bar helpers ------------------------------------------------------ */

function KpiCard({
  icon,
  label,
  value,
  foot,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  foot: string;
  tone: "info" | "go" | "warn" | "alert";
}) {
  return (
    <Card className="sh-adm-kpi">
      <span className={`sh-adm-kpi__icon sh-adm-kpi__icon--${tone}`}>{icon}</span>
      <span className="sh-adm-kpi__value">{value.toLocaleString()}</span>
      <span className="sh-adm-kpi__label">{label}</span>
      <span className="sh-adm-kpi__foot">{foot}</span>
    </Card>
  );
}

function BarRow({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="sh-adm-bar">
      <div className="sh-adm-bar__head">
        <span>{label}</span>
        <span className="sh-mono sh-faint">{value}</span>
      </div>
      <div className="sh-adm-bar__track">
        <div
          className={`sh-adm-bar__fill sh-adm-bar__fill--${tone}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

interface Kpis {
  assetsTotal: number;
  assetsActive: number;
  assetsConnected: number;
  assetsByStatus: Record<AssetStatus, number>;
  faultsOpen: number;
  faultsCritical: number;
  jobsTotal: number;
  jobsOpen: number;
  jobsPending: number;
  jobsByStatus: Record<JobStatus, number>;
  usersTotal: number;
  techsActive: number;
}

function summarize(data: {
  assets: AssetRead[];
  jobs: JobRead[];
  faults: FaultReportRead[];
  users: { role: string; is_active: boolean }[];
} | null): Kpis {
  const assets = Array.isArray(data?.assets) ? data.assets : [];
  const jobs = Array.isArray(data?.jobs) ? data.jobs : [];
  const faults = Array.isArray(data?.faults) ? data.faults : [];
  const users = Array.isArray(data?.users) ? data.users : [];

  const assetsByStatus: Record<AssetStatus, number> = {
    active: 0,
    maintenance: 0,
    inactive: 0,
  };
  const jobsByStatus: Record<JobStatus, number> = {
    pending: 0,
    in_progress: 0,
    done: 0,
    cancelled: 0,
  };
  for (const a of assets) assetsByStatus[a.status] += 1;
  for (const j of jobs) jobsByStatus[j.status] += 1;

  return {
    assetsTotal: assets.length,
    assetsActive: assetsByStatus.active,
    assetsConnected: (data?.assets ?? []).filter((a) => a.telemetry_enabled).length,
    assetsByStatus,
    faultsOpen: faults.length,
    faultsCritical: faults.filter((f) => f.severity === "critical").length,
    jobsTotal: jobs.length,
    jobsOpen: jobsByStatus.pending + jobsByStatus.in_progress,
    jobsPending: jobsByStatus.pending,
    jobsByStatus,
    usersTotal: users.length,
    techsActive: users.filter((u) => u.role === "technician" && u.is_active).length,
  };
}
