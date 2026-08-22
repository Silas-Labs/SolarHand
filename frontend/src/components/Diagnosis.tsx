/* Diagnosis — renders the structured `detail` carried on a telemetry/forecast
   fault (probable cause, the device channels that triggered it, and the parts a
   technician should bring). Faults sync into Dexie with their detail intact, so
   this reads offline as well as online. Renders nothing when a fault has no
   detail (e.g. a plain technician-reported fault). */

import { Chip } from "@/components/ui/Chip";
import { CHANNEL_LABEL, fmtChannelValue, humanize } from "@/lib/format";
import type { FaultDetail } from "@/lib/types";

export function Diagnosis({ detail }: { detail: FaultDetail | null | undefined }) {
  if (!detail) return null;

  const cause = detail.probable_cause?.trim();
  const parts = detail.recommended_parts ?? [];
  const channels = detail.channels ?? {};
  const channelKeys = Object.keys(channels);

  if (!cause && parts.length === 0 && channelKeys.length === 0) return null;

  return (
    <div className="sh-dx">
      {cause && (
        <div className="sh-cause">
          <span className="sh-cause__bullet" aria-hidden />
          <span>
            <span className="sh-dx__lead">Likely cause</span> {cause}
          </span>
        </div>
      )}

      {channelKeys.length > 0 && (
        <div>
          <p className="sh-grouplabel">Device readings at fault</p>
          <dl className="sh-dx__channels">
            {channelKeys.map((k) => (
              <div key={k} className="sh-dx__chan">
                <dt>{CHANNEL_LABEL[k] ?? humanize(k)}</dt>
                <dd className="sh-mono">{fmtChannelValue(k, channels[k])}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {parts.length > 0 && (
        <div>
          <p className="sh-grouplabel">Bring these parts</p>
          <div className="sh-dx__parts">
            {parts.map((p, i) => (
              <Chip key={`${p}-${i}`} tone="amber">
                {p}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {detail.confidence && (
        <p className="sh-dx__conf sh-mono sh-faint">
          {humanize(detail.confidence)} confidence · from device telemetry
        </p>
      )}
    </div>
  );
}
