import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Flag, Gauge, Plus, WifiOff } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { db, saveFaultLocal, saveReadingLocal } from "@/lib/db";
import { useDexieQuery } from "@/hooks/useDexieQuery";
import { useAuth } from "@/store/auth";
import { useSync } from "@/store/sync";
import { toast } from "@/store/toast";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { InputField, SelectField, TextareaField } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Spinner";
import { Verdict } from "./Verdict";
import { FAULT_CATEGORY_LABEL } from "@/lib/format";
import { newId, nowIso, todayIso } from "@/lib/util";
import type {
  AnalysisResponse,
  FaultCategory,
  FaultReportRead,
  FaultSeverity,
  ReadingRead,
} from "@/lib/types";

const CATEGORIES: FaultCategory[] = [
  "soiling",
  "shading",
  "string_outage",
  "inverter_fault",
  "clipping",
  "wiring",
  "other",
];

function inferCategory(causes: string[]): FaultCategory {
  const t = causes.join(" ").toLowerCase();
  if (t.includes("soil")) return "soiling";
  if (t.includes("shad")) return "shading";
  if (t.includes("string")) return "string_outage";
  if (t.includes("inverter")) return "inverter_fault";
  if (t.includes("clip")) return "clipping";
  if (t.includes("wir")) return "wiring";
  return "other";
}

function faultSeverityFor(severity: AnalysisResponse["severity"]): FaultSeverity {
  if (severity === "severe" || severity === "anomalous") return "critical";
  if (severity === "moderate" || severity === "minor") return "warning";
  return "info";
}

export function ReadingCapture() {
  const { id: assetId = "" } = useParams();
  const [params] = useSearchParams();
  const jobId = params.get("job");
  const navigate = useNavigate();

  const user = useAuth((s) => s.user);
  const online = useSync((s) => s.online);
  const syncNow = useSync((s) => s.syncNow);
  const refreshPending = useSync((s) => s.refreshPending);

  const { data: asset, loading } = useDexieQuery(
    () => db.assets.get(assetId),
    [assetId],
  );

  const [energy, setEnergy] = useState("");
  const [periodDays, setPeriodDays] = useState("30");
  const [readingDate, setReadingDate] = useState(todayIso());
  const [meterValue, setMeterValue] = useState("");
  const [notes, setNotes] = useState("");
  const [energyError, setEnergyError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [analysisSkipped, setAnalysisSkipped] = useState(false);
  const [savedReadingId, setSavedReadingId] = useState<string | null>(null);

  const [faultCategory, setFaultCategory] = useState<FaultCategory>("other");
  const [faultLogged, setFaultLogged] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const energyKwh = Number.parseFloat(energy);
    if (!Number.isFinite(energyKwh) || energyKwh <= 0) {
      setEnergyError("Enter the energy generated (kWh).");
      return;
    }
    setEnergyError(null);
    const period = Math.min(92, Math.max(1, Number.parseInt(periodDays, 10) || 30));
    const meter = meterValue.trim() ? Number.parseFloat(meterValue) : null;

    const reading: ReadingRead = {
      id: newId(),
      asset_id: assetId,
      job_id: jobId,
      reading_date: readingDate,
      energy_kwh: energyKwh,
      period_days: period,
      meter_value: Number.isFinite(meter as number) ? meter : null,
      notes: notes.trim() || null,
      source: "manual",
      recorded_by: user?.id ?? null,
      health_ratio: null,
      pr_iec: null,
      created_at: nowIso(),
      client_updated_at: nowIso(),
    };

    setSaving(true);
    try {
      await saveReadingLocal(reading);
      setSavedReadingId(reading.id);
      await refreshPending();

      if (online) {
        try {
          const analysis = await api.analyzeAsset(assetId, {
            energy_kwh: energyKwh,
            reading_date: readingDate,
            period_days: period,
          });
          setResult(analysis);
          setFaultCategory(inferCategory(analysis.likely_causes));
        } catch (err) {
          if (err instanceof ApiError && err.isNetwork) {
            setAnalysisSkipped(true);
          } else {
            toast.error(
              err instanceof ApiError ? err.detail : "Analysis unavailable",
            );
            setAnalysisSkipped(true);
          }
        }
        void syncNow();
      } else {
        setAnalysisSkipped(true);
      }
      toast.success("Reading saved");
    } catch {
      toast.error("Couldn't save the reading");
    } finally {
      setSaving(false);
    }
  }

  async function logFault() {
    if (!result) return;
    const fault: FaultReportRead = {
      id: newId(),
      asset_id: assetId,
      job_id: jobId,
      reading_id: savedReadingId,
      category: faultCategory,
      severity: faultSeverityFor(result.severity),
      source: "technician",
      description: result.summary,
      detail: null,
      resolved: false,
      created_at: nowIso(),
    };
    try {
      await saveFaultLocal(fault);
      await refreshPending();
      setFaultLogged(true);
      toast.success("Fault logged");
      if (online) void syncNow();
    } catch {
      toast.error("Couldn't log the fault");
    }
  }

  function reset() {
    setResult(null);
    setAnalysisSkipped(false);
    setSavedReadingId(null);
    setFaultLogged(false);
    setEnergy("");
    setMeterValue("");
    setNotes("");
    setReadingDate(todayIso());
  }

  const backTo = jobId ? `/jobs/${jobId}` : `/assets/${assetId}`;

  if (loading) return <Loading label="Loading…" />;

  if (!asset) {
    return (
      <>
        <Link to="/assets" className="sh-back">
          <ArrowLeft aria-hidden /> Assets
        </Link>
        <EmptyState title="Asset not found">
          This system isn't on your device yet. Sync to pull the latest data.
        </EmptyState>
      </>
    );
  }

  const showResult = result !== null || analysisSkipped;
  const canLogFault =
    result !== null &&
    result.severity !== "healthy" &&
    result.severity !== "unknown";

  return (
    <>
      <Link to={backTo} className="sh-back">
        <ArrowLeft aria-hidden /> {jobId ? "Job" : "Asset"}
      </Link>

      <div className="sh-pagehead">
        <div>
          <p className="sh-eyebrow">Digital Twin check</p>
          <h1>Meter reading</h1>
          <p className="sh-truncate">
            {asset.customer_name} · {asset.system_kwp} kWp
          </p>
        </div>
      </div>

      {!showResult ? (
        <form className="sh-stack" onSubmit={onSubmit} noValidate>
          <Card>
            <InputField
              label="Energy generated"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              data
              unit="kWh"
              value={energy}
              onChange={(e) => setEnergy(e.target.value)}
              error={energyError}
              placeholder="0.0"
              autoFocus
            />
            <InputField
              label="Over how many days?"
              type="number"
              inputMode="numeric"
              step="1"
              min="1"
              max="92"
              value={periodDays}
              onChange={(e) => setPeriodDays(e.target.value)}
              hint="The billing/observation window for this reading (max 92)."
            />
            <InputField
              label="Reading date"
              type="date"
              value={readingDate}
              onChange={(e) => setReadingDate(e.target.value)}
            />
            <InputField
              label="Meter value"
              hint="Optional — the cumulative meter figure, if noted."
              type="number"
              inputMode="decimal"
              step="0.1"
              value={meterValue}
              onChange={(e) => setMeterValue(e.target.value)}
            />
            <TextareaField
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything unusual on site?"
            />
          </Card>

          {!online && (
            <div className="sh-note sh-note--amber">
              <WifiOff aria-hidden />
              <span>
                You're offline. The reading is saved on this device and the
                performance check runs automatically once you reconnect.
              </span>
            </div>
          )}

          <Button type="submit" block loading={saving} icon={<Gauge aria-hidden />}>
            Save &amp; check performance
          </Button>
        </form>
      ) : (
        <div className="sh-stack">
          {result ? (
            <Verdict result={result} />
          ) : (
            <div className="sh-note sh-note--amber">
              <WifiOff aria-hidden />
              <span>
                Reading saved. The performance check will run when you're back
                online — look for the verdict on the asset afterwards.
              </span>
            </div>
          )}

          {canLogFault && !faultLogged && (
            <Card className="sh-stack">
              <span className="sh-title-sm">Log this as a fault?</span>
              <SelectField
                label="Category"
                value={faultCategory}
                onChange={(e) => setFaultCategory(e.target.value as FaultCategory)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {FAULT_CATEGORY_LABEL[c]}
                  </option>
                ))}
              </SelectField>
              <Button variant="danger" icon={<Flag aria-hidden />} onClick={logFault}>
                Log fault
              </Button>
            </Card>
          )}

          {faultLogged && (
            <div className="sh-note">
              <Flag aria-hidden />
              <span>Fault logged and queued for the office.</span>
            </div>
          )}

          <div className="sh-btnrow">
            <Button variant="ghost" icon={<Plus aria-hidden />} onClick={reset}>
              New reading
            </Button>
            <Button onClick={() => navigate(backTo)}>Done</Button>
          </div>
        </div>
      )}
    </>
  );
}
