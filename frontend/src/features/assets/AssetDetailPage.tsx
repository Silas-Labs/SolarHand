import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Gauge, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { useDexieQuery } from "@/hooks/useDexieQuery";
import { useSync } from "@/store/sync";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Spinner";
import { FaultBadge } from "@/components/ui/SeverityBadge";
import {
  FAULT_CATEGORY_LABEL,
  fmtCoords,
  fmtDate,
  fmtEnergy,
  fmtKwp,
} from "@/lib/format";
import type { AssetStatus } from "@/lib/types";
import type { ChipTone } from "@/components/ui/Chip";

const STATUS_TONE: Record<AssetStatus, ChipTone> = {
  active: "go",
  maintenance: "warn",
  inactive: "neutral",
};

const STATUS_LABEL: Record<AssetStatus, string> = {
  active: "Active",
  maintenance: "Maintenance",
  inactive: "Inactive",
};

export function AssetDetailPage() {
  const { id = "" } = useParams();
  const pending = useSync((s) => s.pending);
  const lastSyncedAt = useSync((s) => s.lastSyncedAt);

  const { data, loading } = useDexieQuery(async () => {
    const asset = await db.assets.get(id);
    if (!asset) return { asset: undefined, readings: [], faults: [] };
    const [readings, faults] = await Promise.all([
      db.readings.where("asset_id").equals(id).toArray(),
      db.faults.where("asset_id").equals(id).toArray(),
    ]);
    readings.sort((a, b) =>
      b.reading_date.localeCompare(a.reading_date) ||
      b.created_at.localeCompare(a.created_at),
    );
    const openFaults = faults
      .filter((f) => !f.resolved)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return { asset, readings: readings.slice(0, 8), faults: openFaults };
  }, [id, pending, lastSyncedAt]);

  if (loading) return <Loading label="Loading asset…" />;

  const asset = data?.asset;
  if (!asset) {
    return (
      <>
        <Link to="/assets" className="sh-back">
          <ArrowLeft aria-hidden /> Assets
        </Link>
        <EmptyState title="Asset not found">
          This system isn't on your device yet. Open Sync to pull your fleet.
        </EmptyState>
      </>
    );
  }

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${asset.latitude},${asset.longitude}`;

  return (
    <>
      <Link to="/assets" className="sh-back">
        <ArrowLeft aria-hidden /> Assets
      </Link>

      <div className="sh-stack">
        <div>
          <div className="sh-row sh-row--between">
            <span className="sh-eyebrow">Solar system</span>
            <Chip tone={STATUS_TONE[asset.status]} dot>
              {STATUS_LABEL[asset.status]}
            </Chip>
          </div>
          <h1 style={{ marginTop: 6, fontSize: "var(--sh-fs-xl)" }}>
            {asset.customer_name}
          </h1>
          <div className="sh-jobcard__meta">
            <MapPin aria-hidden />
            <span className="sh-truncate">
              {asset.location_name}
              {asset.county ? `, ${asset.county}` : ""}
            </span>
          </div>
        </div>

        <Card>
          <div className="sh-kv">
            <div>
              <div className="sh-kv__k">System size</div>
              <div className="sh-kv__v">{fmtKwp(asset.system_kwp)}</div>
            </div>
            <div>
              <div className="sh-kv__k">Inverter</div>
              <div className="sh-kv__v">
                {asset.inverter_kva === null ? "—" : `${asset.inverter_kva} kVA`}
              </div>
            </div>
            <div>
              <div className="sh-kv__k">Battery</div>
              <div className="sh-kv__v">
                {asset.battery_kwh === null ? "—" : `${asset.battery_kwh} kWh`}
              </div>
            </div>
            <div>
              <div className="sh-kv__k">Tilt / Azimuth</div>
              <div className="sh-kv__v">
                {asset.tilt_deg}° / {asset.azimuth_deg}°
              </div>
            </div>
            <div>
              <div className="sh-kv__k">Module type</div>
              <div className="sh-kv__v sh-truncate">{asset.module_type ?? "—"}</div>
            </div>
            <div>
              <div className="sh-kv__k">Installed</div>
              <div className="sh-kv__v">{fmtDate(asset.install_date)}</div>
            </div>
          </div>
          <a
            className="sh-inlinelink"
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink aria-hidden />
            {fmtCoords(asset.latitude, asset.longitude)} · Open in Maps
          </a>
        </Card>

        <Link
          to={`/assets/${asset.id}/reading`}
          className="sh-btn sh-btn--primary sh-btn--block"
        >
          <Gauge aria-hidden />
          Capture meter reading
        </Link>

        {data && data.faults.length > 0 && (
          <div>
            <p className="sh-grouplabel">Open faults</p>
            <div className="sh-list">
              {data.faults.map((f) => (
                <Card key={f.id}>
                  <div className="sh-row sh-row--between">
                    <span className="sh-title-sm">
                      {FAULT_CATEGORY_LABEL[f.category]}
                    </span>
                    <FaultBadge severity={f.severity} />
                  </div>
                  {f.description && (
                    <p className="sh-muted" style={{ marginTop: 4 }}>
                      {f.description}
                    </p>
                  )}
                  <p className="sh-faint" style={{ fontSize: "var(--sh-fs-xs)", marginTop: 4 }}>
                    Raised {fmtDate(f.created_at)}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="sh-grouplabel">Recent readings</p>
          {data && data.readings.length > 0 ? (
            <Card flush>
              <ul className="sh-datalist">
                {data.readings.map((r) => (
                  <li key={r.id} className="sh-datalist__row">
                    <div>
                      <div className="sh-title-sm">{fmtEnergy(r.energy_kwh)}</div>
                      <div className="sh-faint" style={{ fontSize: "var(--sh-fs-xs)" }}>
                        {r.period_days} day{r.period_days > 1 ? "s" : ""} to {fmtDate(r.reading_date)}
                      </div>
                    </div>
                    <span className="sh-mono sh-faint">
                      {(r.energy_kwh / Math.max(1, r.period_days)).toFixed(1)}/d
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            <Card>
              <p className="sh-muted">
                No readings captured yet. Take a meter reading to run a
                performance check.
              </p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
