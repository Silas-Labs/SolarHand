import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Search, Sun, TriangleAlert } from "lucide-react";
import { db, pendingKeys } from "@/lib/db";
import { useDexieQuery } from "@/hooks/useDexieQuery";
import { useSync } from "@/store/sync";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Spinner";
import { fmtKwp } from "@/lib/format";
import type { AssetStatus } from "@/lib/types";

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

export function AssetsPage() {
  const pending = useSync((s) => s.pending);
  const lastSyncedAt = useSync((s) => s.lastSyncedAt);
  const [q, setQ] = useState("");

  const { data, loading } = useDexieQuery(async () => {
    // Booleans aren't reliable IndexedDB keys, so filter unresolved in memory.
    const [assets, faults, keys] = await Promise.all([
      db.assets.toArray(),
      db.faults.toArray(),
      pendingKeys(),
    ]);
    const openFaults = new Map<string, number>();
    for (const f of faults) {
      if (f.resolved) continue;
      openFaults.set(f.asset_id, (openFaults.get(f.asset_id) ?? 0) + 1);
    }
    return { assets, openFaults, keys };
  }, [pending, lastSyncedAt]);

  const visible = useMemo(() => {
    const assets = Array.isArray(data?.assets) ? data.assets : [];
    const term = q.trim().toLowerCase();
    const filtered = term
      ? assets.filter((a) =>
          [a.customer_name, a.location_name, a.county ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(term),
        )
      : assets;
    return [...filtered].sort((a, b) =>
      a.customer_name.localeCompare(b.customer_name),
    );
  }, [data, q]);

  return (
    <>
      <div className="sh-pagehead">
        <div>
          <p className="sh-eyebrow">Installed systems</p>
          <h1>Assets</h1>
        </div>
      </div>

      <div className="sh-searchbar">
        <Search aria-hidden />
        <input
          className="sh-searchbar__input"
          type="search"
          placeholder="Search customer, site or county"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search assets"
        />
      </div>

      {loading ? (
        <Loading label="Loading assets…" />
      ) : visible.length === 0 ? (
        <EmptyState icon={<Sun aria-hidden />} title="No assets here">
          {q
            ? "Nothing matches that search."
            : "No systems on your device yet. Open Sync to pull your fleet."}
        </EmptyState>
      ) : (
        <div className="sh-list">
          {visible.map((asset) => {
            const faults = data?.openFaults.get(asset.id) ?? 0;
            const queued = data?.keys.has(`asset:${asset.id}`) ?? false;
            return (
              <Link key={asset.id} to={`/assets/${asset.id}`} className="sh-linkcard">
                <div className="sh-row sh-row--between">
                  <div style={{ minWidth: 0 }}>
                    <div className="sh-title-sm sh-truncate">{asset.customer_name}</div>
                    <div className="sh-jobcard__meta">
                      <MapPin aria-hidden />
                      <span className="sh-truncate">{asset.location_name}</span>
                    </div>
                  </div>
                  <Chip tone={STATUS_TONE[asset.status]} dot>
                    {STATUS_LABEL[asset.status]}
                  </Chip>
                </div>
                <div className="sh-jobcard__foot">
                  <span className="sh-mono sh-faint">{fmtKwp(asset.system_kwp)}</span>
                  <div className="sh-row" style={{ gap: "var(--sh-sp-2)" }}>
                    {faults > 0 && (
                      <Chip tone="alert">
                        <TriangleAlert aria-hidden />
                        {faults} fault{faults > 1 ? "s" : ""}
                      </Chip>
                    )}
                    {queued && <Chip tone="amber">Queued</Chip>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
