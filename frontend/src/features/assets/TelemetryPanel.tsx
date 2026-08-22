/* TelemetryPanel — the connected-device surface on an asset's detail page.
   Two cards: a live snapshot of the most recent device samples, and a
   statistical trend forecast. Both are online-first (they read the API, not the
   offline mirror) and degrade to a friendly note when offline — the technician's
   saved readings and synced diagnoses remain available without them.

   Honesty: the feed is a labelled simulator running over the real ingestion
   pipeline, and the forecast is a plain least-squares trend — neither is dressed
   up as more than it is. */

import { Activity, RefreshCw, Thermometer, TrendingDown, WifiOff, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { useSync } from "@/store/sync";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { Spinner } from "@/components/ui/Spinner";
import {
  fmtDate,
  fmtPower,
  fmtRatioPct,
  fmtTemp,
  fmtTime,
  fmtVolts,
  humanize,
} from "@/lib/format";
import type { ForecastResponse, TelemetrySampleRead } from "@/lib/types";

const SAMPLE_LIMIT = 8;

/** Tone an inverter status string by its severity keywords. */
function statusTone(status: string | null): ChipTone {
  if (!status) return "neutral";
  const s = status.toLowerCase();
  if (/(fault|error|err|alarm|trip|fail)/.test(s)) return "alert";
  if (/(warn|derate|limit|curtail)/.test(s)) return "warn";
  if (/(ok|run|mppt|grid|normal|online|export)/.test(s)) return "go";
  return "neutral";
}

export function TelemetryPanel({ assetId }: { assetId: string }) {
  const online = useSync((s) => s.online);

  const { data, loading, error, reload } = useAsync(async () => {
    const [samples, forecast] = await Promise.all([
      api.listTelemetrySamples(assetId, SAMPLE_LIMIT),
      // Forecast needs a few days of history; treat "not enough yet" as absent.
      api.getForecast(assetId).catch(() => null),
    ]);
    return { samples, forecast };
  }, [assetId, online]);

  return (
    <div>
      <p className="sh-grouplabel">Connected device</p>

      {!online ? (
        <div className="sh-note sh-note--amber">
          <WifiOff aria-hidden />
          <span>
            Live device readings appear here when you&apos;re online. Saved
            readings and synced diagnoses stay available offline.
          </span>
        </div>
      ) : loading ? (
        <Card>
          <div className="sh-row" style={{ gap: "var(--sh-sp-3)", alignItems: "center" }}>
            <Spinner />
            <span className="sh-muted">Fetching live telemetry…</span>
          </div>
        </Card>
      ) : error ? (
        <Card>
          <p className="sh-muted">
            Couldn&apos;t reach the device feed.{" "}
            <button className="sh-linklike" onClick={reload}>
              Retry
            </button>
          </p>
        </Card>
      ) : (
        <div className="sh-stack">
          <LiveCard samples={data?.samples ?? []} onReload={reload} />
          {data?.forecast ? <ForecastCard forecast={data.forecast} /> : null}
        </div>
      )}
    </div>
  );
}

/* -- Live snapshot --------------------------------------------------------- */

function LiveCard({
  samples,
  onReload,
}: {
  samples: TelemetrySampleRead[];
  onReload: () => void;
}) {
  const latest = samples[0];

  return (
    <Card>
      <div className="sh-tele__head">
        <span className="sh-tele__title">
          <span className="sh-tele__pulse" aria-hidden />
          <span className="sh-title-sm">Live telemetry</span>
          <Chip tone="info">Simulated feed</Chip>
        </span>
        <Button size="sm" variant="ghost" icon={<RefreshCw aria-hidden />} onClick={onReload}>
          Refresh
        </Button>
      </div>

      {!latest ? (
        <p className="sh-muted" style={{ marginTop: "var(--sh-sp-3)" }}>
          No samples received yet. Run the device simulator to stream readings
          into this asset.
        </p>
      ) : (
        <>
          <div className="sh-figrow" style={{ marginTop: "var(--sh-sp-4)" }}>
            <div className="sh-figure">
              <span className="sh-figure__value">{fmtPower(latest.ac_power_w)}</span>
              <span className="sh-figure__label">
                <Zap aria-hidden style={{ width: 11, height: 11, verticalAlign: "-1px" }} /> AC power
              </span>
            </div>
            <div className="sh-figure">
              <span className="sh-figure__value">{fmtTemp(latest.module_temp_c)}</span>
              <span className="sh-figure__label">
                <Thermometer aria-hidden style={{ width: 11, height: 11, verticalAlign: "-1px" }} /> Module
              </span>
            </div>
            <div className="sh-figure">
              <span className="sh-figure__value">{fmtVolts(latest.grid_voltage_v)}</span>
              <span className="sh-figure__label">
                <Activity aria-hidden style={{ width: 11, height: 11, verticalAlign: "-1px" }} /> Grid
              </span>
            </div>
          </div>

          <div className="sh-tele__statusrow">
            <span className="sh-faint">Inverter</span>
            <Chip tone={statusTone(latest.inverter_status)}>
              {latest.inverter_status ? humanize(latest.inverter_status) : "Unknown"}
              {latest.inverter_code ? ` · ${latest.inverter_code}` : ""}
            </Chip>
          </div>

          {samples.length > 1 && (
            <div className="sh-tele__list">
              {samples.slice(0, 6).map((s) => (
                <div key={s.id} className="sh-tele__row">
                  <span className="sh-tele__time">{fmtTime(s.ts)}</span>
                  <span className="sh-tele__pwr">{fmtPower(s.ac_power_w)}</span>
                </div>
              ))}
            </div>
          )}

          <p className="sh-dx__conf sh-mono sh-faint" style={{ marginTop: "var(--sh-sp-3)" }}>
            Last sample {fmtTime(latest.ts)} · normalised at the edge to a canonical schema
          </p>
        </>
      )}
    </Card>
  );
}

/* -- Trend forecast -------------------------------------------------------- */

function ForecastCard({ forecast }: { forecast: ForecastResponse }) {
  const health = forecast.current_health_ratio;
  const pct = health === null ? 0 : Math.max(0, Math.min(100, Math.round(health * 100)));
  const tone = forecast.early_warning ? "warn" : "go";
  const thin = forecast.slope_per_day === null || forecast.points < 2;

  return (
    <Card>
      <div className="sh-tele__head">
        <span className="sh-tele__title">
          <TrendingDown aria-hidden className="sh-tele__ficon" />
          <span className="sh-title-sm">Performance forecast</span>
        </span>
        <Chip tone="neutral">Trend projection</Chip>
      </div>

      {thin ? (
        <p className="sh-muted" style={{ marginTop: "var(--sh-sp-3)" }}>
          {forecast.summary ||
            "Not enough performance history yet to project a trend. It builds as daily telemetry rolls up."}
        </p>
      ) : (
        <>
          <div className="sh-meter">
            <div className="sh-meter__track">
              <div
                className={"sh-meter__fill" + (tone === "warn" ? " sh-meter__fill--warn" : "")}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="sh-meter__scale">
              <span>Current {fmtRatioPct(health)}</span>
              <span>Threshold {fmtRatioPct(forecast.threshold)}</span>
            </div>
          </div>

          <p className="sh-muted" style={{ marginTop: "var(--sh-sp-3)" }}>
            {forecast.summary}
          </p>

          {forecast.early_warning && forecast.projected_cross_date && (
            <div className="sh-note sh-note--amber" style={{ marginTop: "var(--sh-sp-3)" }}>
              <TrendingDown aria-hidden />
              <span>
                Projected to fall below {fmtRatioPct(forecast.threshold)} around{" "}
                {fmtDate(forecast.projected_cross_date)}
                {forecast.days_to_threshold !== null
                  ? ` (~${forecast.days_to_threshold} days)`
                  : ""}
                . Worth scheduling a visit before then.
              </span>
            </div>
          )}

          <p className="sh-dx__conf sh-mono sh-faint" style={{ marginTop: "var(--sh-sp-3)" }}>
            Least-squares trend over {forecast.points} readings · a statistical
            projection, not a prediction model
          </p>
        </>
      )}
    </Card>
  );
}
