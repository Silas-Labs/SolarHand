import { AlertOctagon, AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import { fmtNumber, fmtRatioPct, SEVERITY_LABEL } from "@/lib/format";
import { cx } from "@/lib/util";
import type { AnalysisResponse, AnalyticsSeverity } from "@/lib/types";

function Icon({ severity }: { severity: AnalyticsSeverity }) {
  switch (severity) {
    case "healthy":
      return <CheckCircle2 aria-hidden />;
    case "minor":
    case "moderate":
      return <AlertTriangle aria-hidden />;
    case "severe":
    case "anomalous":
      return <AlertOctagon aria-hidden />;
    default:
      return <HelpCircle aria-hidden />;
  }
}

function meterFillClass(severity: AnalyticsSeverity): string {
  if (severity === "healthy") return "";
  if (severity === "minor" || severity === "moderate") return "sh-meter__fill--warn";
  if (severity === "severe" || severity === "anomalous") return "sh-meter__fill--alert";
  return "sh-meter__fill--warn";
}

export function Verdict({ result }: { result: AnalysisResponse }) {
  const ratio = result.health_ratio;
  const pct = ratio === null ? null : Math.max(0, Math.min(1, ratio)) * 100;

  return (
    <div className="sh-stack">
      <div className={cx("sh-verdict", `sh-verdict--${result.severity}`)}>
        <div className="sh-verdict__icon">
          <Icon severity={result.severity} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="sh-verdict__title">{SEVERITY_LABEL[result.severity]}</div>
          <p className="sh-verdict__summary">{result.summary}</p>
        </div>
      </div>

      {pct !== null && (
        <div className="sh-meter">
          <div className="sh-meter__track">
            <div
              className={cx("sh-meter__fill", meterFillClass(result.severity))}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="sh-meter__scale">
            <span>0%</span>
            <span>Actual vs expected · {fmtRatioPct(ratio)}</span>
            <span>100%</span>
          </div>
        </div>
      )}

      <div className="sh-figrow">
        <div className="sh-figure">
          <span className="sh-figure__value">{result.actual_kwh.toFixed(1)}</span>
          <span className="sh-figure__label">Actual kWh</span>
        </div>
        <div className="sh-figure">
          <span className="sh-figure__value">{result.expected_ac_kwh.toFixed(1)}</span>
          <span className="sh-figure__label">Expected kWh</span>
        </div>
        <div className="sh-figure">
          <span className="sh-figure__value">
            {result.performance_ratio_iec === null
              ? "—"
              : `${Math.round(result.performance_ratio_iec * 100)}%`}
          </span>
          <span className="sh-figure__label">PR (IEC)</span>
        </div>
      </div>

      {result.likely_causes.length > 0 && (
        <div>
          <p className="sh-grouplabel">Likely causes</p>
          <div className="sh-causes">
            {result.likely_causes.map((cause) => (
              <div key={cause} className="sh-cause">
                <span className="sh-cause__bullet" aria-hidden />
                <span>{cause}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="sh-faint" style={{ fontSize: "var(--sh-fs-xs)" }}>
        Modelled from {fmtNumber(result.poa_insolation_kwh_m2, 2)} kWh/m² plane-of-array
        insolation over {result.sample_count} day(s). No sensors required.
      </p>
    </div>
  );
}
