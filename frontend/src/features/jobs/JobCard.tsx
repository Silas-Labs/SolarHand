import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { JOB_STATUS_TONE } from "./jobMaps";
import { JOB_STATUS_LABEL, JOB_TYPE_LABEL, fmtDate } from "@/lib/format";
import { cx } from "@/lib/util";
import type { AssetRead, JobRead } from "@/lib/types";

interface JobCardProps {
  job: JobRead;
  asset?: AssetRead;
  pending?: boolean;
}

export function JobCard({ job, asset, pending = false }: JobCardProps) {
  return (
    <Link to={`/jobs/${job.id}`} className="sh-linkcard">
      <div className="sh-jobcard">
        <span className={cx("sh-accent", `sh-accent--${job.priority}`)} aria-hidden />
        <div className="sh-jobcard__body">
          <div className="sh-row sh-row--between">
            <span className="sh-eyebrow">{JOB_TYPE_LABEL[job.type]}</span>
            <Chip tone={JOB_STATUS_TONE[job.status]} dot>
              {JOB_STATUS_LABEL[job.status]}
            </Chip>
          </div>
          <h3 className="sh-title-sm sh-truncate" style={{ marginTop: 4 }}>
            {job.title}
          </h3>
          {asset && (
            <div className="sh-jobcard__meta">
              <MapPin aria-hidden />
              <span className="sh-truncate">
                {asset.customer_name} · {asset.location_name}
              </span>
            </div>
          )}
          <div className="sh-jobcard__foot">
            {job.scheduled_date && (
              <span className="sh-faint" style={{ fontSize: "var(--sh-fs-xs)" }}>
                Scheduled {fmtDate(job.scheduled_date)}
              </span>
            )}
            {pending && <Chip tone="amber">Queued</Chip>}
          </div>
        </div>
      </div>
    </Link>
  );
}
