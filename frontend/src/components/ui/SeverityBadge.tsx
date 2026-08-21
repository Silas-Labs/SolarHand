import { Chip, type ChipTone } from "./Chip";
import { SEVERITY_LABEL } from "@/lib/format";
import type { AnalyticsSeverity, FaultSeverity } from "@/lib/types";

const ANALYTICS_TONE: Record<AnalyticsSeverity, ChipTone> = {
  healthy: "go",
  minor: "warn",
  moderate: "warn",
  severe: "alert",
  anomalous: "alert",
  unknown: "neutral",
};

export function SeverityBadge({ severity }: { severity: AnalyticsSeverity }) {
  return (
    <Chip tone={ANALYTICS_TONE[severity]} dot>
      {SEVERITY_LABEL[severity]}
    </Chip>
  );
}

const FAULT_TONE: Record<FaultSeverity, ChipTone> = {
  info: "info",
  warning: "warn",
  critical: "alert",
};

const FAULT_LABEL: Record<FaultSeverity, string> = {
  info: "Info",
  warning: "Warning",
  critical: "Critical",
};

export function FaultBadge({ severity }: { severity: FaultSeverity }) {
  return (
    <Chip tone={FAULT_TONE[severity]} dot>
      {FAULT_LABEL[severity]}
    </Chip>
  );
}
