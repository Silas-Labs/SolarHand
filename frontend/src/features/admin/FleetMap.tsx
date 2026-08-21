/* FleetMap — a geographic view of every installed system.
   Vanilla Leaflet (no react-leaflet) with vector circleMarkers, which avoids
   the marker-image bundling problem entirely and lets us colour each point by
   health. Online-only: OSM tiles need the network, which is fine for the
   back-office console. Markers are coloured by open-fault severity first, then
   by asset status. */

import { useEffect, useMemo, useRef } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { TriangleAlert } from "lucide-react";
import { api } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { Loading } from "@/components/ui/Spinner";
import { fmtKwp } from "@/lib/format";
import type { AssetRead, AssetStatus } from "@/lib/types";

// Default view: western Kenya (Kisumu), where the pilot fleet lives.
const DEFAULT_CENTER: L.LatLngExpression = [-0.0917, 34.768];
const DEFAULT_ZOOM = 7;

interface OpenFault {
  count: number;
  critical: boolean;
}

const COLORS = {
  alert: "#d6323b",
  amber: "#f2a413",
  go: "#12894e",
  warn: "#e8912b",
  grey: "#8b91a6",
} as const;

function markerFill(status: AssetStatus, fault: OpenFault | undefined): string {
  if (fault?.critical) return COLORS.alert;
  if (fault) return COLORS.amber;
  if (status === "active") return COLORS.go;
  if (status === "maintenance") return COLORS.warn;
  return COLORS.grey;
}

function esc(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function popupHtml(asset: AssetRead, fault: OpenFault | undefined): string {
  const faultLine = fault
    ? `<div class="sh-mappop__fault${fault.critical ? " is-critical" : ""}">${fault.count} open fault${
        fault.count > 1 ? "s" : ""
      }${fault.critical ? " · critical" : ""}</div>`
    : `<div class="sh-mappop__ok">No open faults</div>`;
  return `
    <div class="sh-mappop">
      <div class="sh-mappop__name">${esc(asset.customer_name)}</div>
      <div class="sh-mappop__meta">${esc(asset.location_name)}${
        asset.county ? ` · ${esc(asset.county)}` : ""
      }</div>
      <div class="sh-mappop__stat"><span>${esc(fmtKwp(asset.system_kwp))}</span><span>${esc(
        asset.status,
      )}</span></div>
      ${faultLine}
    </div>`;
}

export function FleetMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  const { data, loading, error, reload } = useAsync(async () => {
    const [assets, faults] = await Promise.all([
      api.listAssets(),
      api.listFaults({ resolved: false }),
    ]);
    return { assets, faults };
  }, []);

  const openByAsset = useMemo(() => {
    const m = new Map<string, OpenFault>();
    for (const f of data?.faults ?? []) {
      const e = m.get(f.asset_id) ?? { count: 0, critical: false };
      e.count += 1;
      if (f.severity === "critical") e.critical = true;
      m.set(f.asset_id, e);
    }
    return m;
  }, [data]);

  // Initialise the map once; the container is always mounted (states overlay it).
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // The rail/drawer can change our width after mount; keep tiles sized right.
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // (Re)draw markers whenever the fleet data changes.
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer || !data) return;
    layer.clearLayers();

    const points: L.LatLngExpression[] = [];
    for (const asset of data.assets) {
      if (!Number.isFinite(asset.latitude) || !Number.isFinite(asset.longitude)) {
        continue;
      }
      const fault = openByAsset.get(asset.id);
      const fill = markerFill(asset.status, fault);
      L.circleMarker([asset.latitude, asset.longitude], {
        radius: fault?.critical ? 10 : 8,
        color: "#ffffff",
        weight: 2,
        fillColor: fill,
        fillOpacity: 0.9,
      })
        .bindPopup(popupHtml(asset, fault))
        .addTo(layer);
      points.push([asset.latitude, asset.longitude]);
    }

    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points).pad(0.25), { maxZoom: 13 });
    }
  }, [data, openByAsset]);

  const total = data?.assets.length ?? 0;
  const flagged = openByAsset.size;

  return (
    <>
      <div className="sh-pagehead">
        <div>
          <p className="sh-eyebrow">Where the fleet lives</p>
          <h1>Fleet map</h1>
        </div>
        {total > 0 ? (
          <p className="sh-muted">
            {total} system{total > 1 ? "s" : ""}
            {flagged > 0 ? ` · ${flagged} flagged` : ""}
          </p>
        ) : null}
      </div>

      <div className="sh-adm-map">
        <div ref={containerRef} className="sh-adm-map__canvas" aria-label="Fleet map" />

        {loading ? (
          <div className="sh-adm-map__overlay">
            <Loading label="Loading map…" />
          </div>
        ) : error ? (
          <div className="sh-adm-map__overlay">
            <div className="sh-adm-map__msg">
              <TriangleAlert aria-hidden />
              <p>{error}</p>
              <button className="sh-linklike" onClick={reload}>
                Retry
              </button>
            </div>
          </div>
        ) : total === 0 ? (
          <div className="sh-adm-map__overlay">
            <div className="sh-adm-map__msg">
              <p>No systems have coordinates yet.</p>
            </div>
          </div>
        ) : null}

        <div className="sh-adm-map__legend" aria-hidden>
          <span><i style={{ background: COLORS.go }} />Healthy</span>
          <span><i style={{ background: COLORS.warn }} />Maintenance</span>
          <span><i style={{ background: COLORS.grey }} />Inactive</span>
          <span><i style={{ background: COLORS.amber }} />Open fault</span>
          <span><i style={{ background: COLORS.alert }} />Critical</span>
        </div>
      </div>
    </>
  );
}
