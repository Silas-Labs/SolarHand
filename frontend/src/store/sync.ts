/* Sync store + engine (Zustand).
   Drains the offline outbox to POST /sync/push, then pulls deltas and refreshes
   the local mirror. Publishes live status (online, pending count, last result)
   that the sync indicator and Sync screen render. Auto-runs on reconnect. */

import { create } from "zustand";
import { api, ApiError } from "@/lib/api";
import {
  db,
  dequeue,
  getLastPull,
  hydrateFromPull,
  outboxCount,
  type EntityKind,
  type OutboxEntry,
} from "@/lib/db";
import type { SyncItemResult, SyncPushRequest } from "@/lib/types";

type SyncStatus = "idle" | "syncing" | "error";

interface SyncResultSummary {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}

interface SyncState {
  online: boolean;
  status: SyncStatus;
  pending: number;
  lastSyncedAt: string | null;
  lastError: string | null;
  lastResult: SyncResultSummary | null;
  itemErrors: SyncItemResult[];
  init: () => void;
  refreshPending: () => Promise<void>;
  syncNow: () => Promise<void>;
}

let initialised = false;

async function buildPushPayload(
  entries: OutboxEntry[],
): Promise<{ payload: SyncPushRequest; empty: boolean }> {
  const payload: SyncPushRequest = { assets: [], jobs: [], readings: [], faults: [] };
  for (const e of entries) {
    if (e.entity === "asset") {
      const a = await db.assets.get(e.recordId);
      if (a)
        payload.assets.push({
          id: a.id,
          customer_name: a.customer_name,
          customer_phone: a.customer_phone,
          location_name: a.location_name,
          county: a.county,
          latitude: a.latitude,
          longitude: a.longitude,
          tilt_deg: a.tilt_deg,
          azimuth_deg: a.azimuth_deg,
          system_kwp: a.system_kwp,
          inverter_kva: a.inverter_kva,
          battery_kwh: a.battery_kwh,
          module_type: a.module_type,
          install_date: a.install_date,
          status: a.status,
          notes: a.notes,
          client_updated_at: a.client_updated_at,
        });
    } else if (e.entity === "job") {
      const j = await db.jobs.get(e.recordId);
      if (j)
        payload.jobs.push({
          id: j.id,
          asset_id: j.asset_id,
          assigned_to: j.assigned_to,
          type: j.type,
          status: j.status,
          priority: j.priority,
          title: j.title,
          description: j.description,
          scheduled_date: j.scheduled_date,
          client_updated_at: j.client_updated_at,
        });
    } else if (e.entity === "reading") {
      const r = await db.readings.get(e.recordId);
      if (r)
        payload.readings.push({
          id: r.id,
          asset_id: r.asset_id,
          job_id: r.job_id,
          reading_date: r.reading_date,
          energy_kwh: r.energy_kwh,
          period_days: r.period_days,
          meter_value: r.meter_value,
          notes: r.notes,
          client_updated_at: r.client_updated_at,
        });
    } else if (e.entity === "fault") {
      const f = await db.faults.get(e.recordId);
      if (f)
        payload.faults.push({
          id: f.id,
          asset_id: f.asset_id,
          job_id: f.job_id,
          reading_id: f.reading_id,
          category: f.category,
          severity: f.severity,
          source: f.source,
          description: f.description,
        });
    }
  }
  const empty =
    !payload.assets.length &&
    !payload.jobs.length &&
    !payload.readings.length &&
    !payload.faults.length;
  return { payload, empty };
}

const ENTITY_OF: Record<string, EntityKind> = {
  asset: "asset",
  job: "job",
  reading: "reading",
  fault: "fault",
};

export const useSync = create<SyncState>((set, get) => ({
  online: typeof navigator === "undefined" ? true : navigator.onLine,
  status: "idle",
  pending: 0,
  lastSyncedAt: null,
  lastError: null,
  lastResult: null,
  itemErrors: [],

  init() {
    if (initialised) return;
    initialised = true;
    const setOnline = (online: boolean) => {
      set({ online });
      if (online) void get().syncNow();
    };
    window.addEventListener("online", () => setOnline(true));
    window.addEventListener("offline", () => setOnline(false));
    void get().refreshPending();
    if (get().online) void get().syncNow();
  },

  async refreshPending() {
    set({ pending: await outboxCount() });
  },

  async syncNow() {
    if (get().status === "syncing") return;
    if (!get().online) return;
    set({ status: "syncing", lastError: null });
    try {
      // 1) Push the outbox (per-item errors are isolated by the server).
      const entries = await db.outbox.toArray();
      const itemErrors: SyncItemResult[] = [];
      let summary: SyncResultSummary | null = null;
      if (entries.length) {
        const { payload, empty } = await buildPushPayload(entries);
        if (!empty) {
          const res = await api.syncPush(payload);
          summary = {
            created: res.created,
            updated: res.updated,
            skipped: res.skipped,
            errors: res.errors,
          };
          for (const r of res.results) {
            if (r.action === "error") {
              itemErrors.push(r);
            } else {
              const entity = ENTITY_OF[r.entity];
              if (entity) await dequeue(entity, r.id);
            }
          }
        }
      }

      // 2) Pull deltas since our last successful sync and refresh the mirror.
      const since = await getLastPull();
      const pull = await api.syncPull(since);
      await hydrateFromPull(pull);

      set({
        status: itemErrors.length ? "error" : "idle",
        lastSyncedAt: pull.server_time,
        lastResult: summary,
        itemErrors,
        lastError: itemErrors.length
          ? `${itemErrors.length} item(s) could not sync`
          : null,
      });
      await get().refreshPending();
    } catch (err) {
      const offline = err instanceof ApiError && err.isNetwork;
      set({
        status: offline ? "idle" : "error",
        online: offline ? false : get().online,
        lastError: offline
          ? null
          : err instanceof ApiError
            ? err.detail
            : "Sync failed",
      });
    }
  },
}));
