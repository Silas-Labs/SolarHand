import type { ChipTone } from "@/components/ui/Chip";
import type { JobPriority, JobStatus } from "@/lib/types";

export const JOB_STATUS_TONE: Record<JobStatus, ChipTone> = {
  pending: "neutral",
  in_progress: "info",
  done: "go",
  cancelled: "neutral",
};

export const PRIORITY_LABEL: Record<JobPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

/** Sort key so the most pressing work floats up a list. */
export const PRIORITY_RANK: Record<JobPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export const STATUS_RANK: Record<JobStatus, number> = {
  in_progress: 0,
  pending: 1,
  done: 2,
  cancelled: 3,
};
