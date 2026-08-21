import type { JobType } from "@/lib/types";

/* Field checklists per job type — grounded in a Kenyan solar install/O&M flow
   and EPRA good practice. Completion is stored per-job on the device. */
export const CHECKLISTS: Record<JobType, string[]> = {
  install: [
    "Confirm site & customer details",
    "Verify mounting structure & torque",
    "Check string polarity and Voc",
    "Inverter mounting & ventilation clearance",
    "Earthing / bonding continuity",
    "Label DC & AC isolators",
    "Baseline generation meter reading",
    "Customer handover & sign-off",
  ],
  inspection: [
    "Visual: soiling, cracks, discolouration",
    "Check for new shading obstructions",
    "Inspect DC & AC isolators",
    "Review inverter fault log",
    "Torque-check key connections",
    "Record generation meter reading",
  ],
  repair: [
    "Confirm the reported fault",
    "Isolate affected string / device",
    "Diagnose root cause",
    "Replace or repair component",
    "Re-test and confirm output",
    "Record post-repair reading",
  ],
  cleaning: [
    "Dry-brush loose soiling",
    "Wash modules (deionised if available)",
    "Inspect for hotspots after cleaning",
    "Record post-clean reading",
  ],
  commissioning: [
    "Verify system config against design",
    "String Voc / Isc checks",
    "Set inverter grid-code parameters",
    "Earth-fault & insulation resistance test",
    "Baseline generation meter reading",
    "Compile customer documentation pack",
  ],
};

const KEY = (jobId: string) => `solarhand.checklist.${jobId}`;

export function loadChecklist(jobId: string): boolean[] {
  try {
    const raw = localStorage.getItem(KEY(jobId));
    return raw ? (JSON.parse(raw) as boolean[]) : [];
  } catch {
    return [];
  }
}

export function saveChecklist(jobId: string, done: boolean[]): void {
  try {
    localStorage.setItem(KEY(jobId), JSON.stringify(done));
  } catch {
    /* storage full / unavailable — non-fatal for the field flow */
  }
}
