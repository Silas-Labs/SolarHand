/* Offline store (IndexedDB via Dexie).
   - Mirrors the company's assets/jobs/readings/faults locally so the field app
     reads instantly and works with no signal.
   - `outbox` holds records created/edited offline; the sync engine drains it on
     reconnect via POST /sync/push. Outbox is keyed by entity+id so re-editing a
     record before it syncs coalesces into a single pending item. */

import Dexie, { type Table } from "dexie";
import type {
  AssetRead,
  FaultReportRead,
  JobRead,
  ReadingRead,
} from "./types";
import { nowIso } from "./util";

export type EntityKind = "asset" | "job" | "reading" | "fault";

export interface OutboxEntry {
  key: string; // `${entity}:${recordId}`
  entity: EntityKind;
  recordId: string;
  queuedAt: string;
}

export interface MetaRow {
  key: string;
  value: string;
}

class SolarDB extends Dexie {
  assets!: Table<AssetRead, string>;
  jobs!: Table<JobRead, string>;
  readings!: Table<ReadingRead, string>;
  faults!: Table<FaultReportRead, string>;
  outbox!: Table<OutboxEntry, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super("solarhand");
    this.version(1).stores({
      assets: "id, company_id, status, county, updated_at",
      jobs: "id, asset_id, assigned_to, status, updated_at",
      readings: "id, asset_id, reading_date, created_at",
      faults: "id, asset_id, resolved, created_at",
      outbox: "key, entity, recordId, queuedAt",
      meta: "key",
    });
  }
}

export const db = new SolarDB();

const LAST_PULL = "lastPull";

/** Replace the local mirror with a pulled snapshot (bulk upsert). */
export async function hydrateFromPull(data: {
  assets: AssetRead[];
  jobs: JobRead[];
  readings: ReadingRead[];
  faults: FaultReportRead[];
  server_time: string;
}): Promise<void> {
  await db.transaction(
    "rw",
    db.assets,
    db.jobs,
    db.readings,
    db.faults,
    db.meta,
    async () => {
      if (data.assets.length) await db.assets.bulkPut(data.assets);
      if (data.jobs.length) await db.jobs.bulkPut(data.jobs);
      if (data.readings.length) await db.readings.bulkPut(data.readings);
      if (data.faults.length) await db.faults.bulkPut(data.faults);
      await db.meta.put({ key: LAST_PULL, value: data.server_time });
    },
  );
}

export async function getLastPull(): Promise<string | undefined> {
  return (await db.meta.get(LAST_PULL))?.value;
}

export async function clearAll(): Promise<void> {
  await db.transaction(
    "rw",
    [db.assets, db.jobs, db.readings, db.faults, db.outbox, db.meta],
    async () => {
      await Promise.all([
        db.assets.clear(),
        db.jobs.clear(),
        db.readings.clear(),
        db.faults.clear(),
        db.outbox.clear(),
        db.meta.clear(),
      ]);
    },
  );
}

/* -- Outbox ------------------------------------------------------------ */
export async function enqueue(entity: EntityKind, recordId: string): Promise<void> {
  await db.outbox.put({
    key: `${entity}:${recordId}`,
    entity,
    recordId,
    queuedAt: nowIso(),
  });
}

export async function dequeue(entity: EntityKind, recordId: string): Promise<void> {
  await db.outbox.delete(`${entity}:${recordId}`);
}

export async function outboxCount(): Promise<number> {
  return db.outbox.count();
}

/** Set of `${entity}:${id}` keys still awaiting sync — used to badge UI. */
export async function pendingKeys(): Promise<Set<string>> {
  const rows = await db.outbox.toArray();
  return new Set(rows.map((r) => r.key));
}

/* -- Field mutations (write locally + queue for sync) ------------------ */

/** Persist a reading captured in the field and queue it for upload. */
export async function saveReadingLocal(reading: ReadingRead): Promise<void> {
  await db.readings.put(reading);
  await enqueue("reading", reading.id);
}

/** Persist a fault raised in the field and queue it for upload. */
export async function saveFaultLocal(fault: FaultReportRead): Promise<void> {
  await db.faults.put(fault);
  await enqueue("fault", fault.id);
}

/** Apply a job status change locally (stamping client_updated_at) and queue it. */
export async function updateJobStatusLocal(
  job: JobRead,
  status: JobRead["status"],
): Promise<JobRead> {
  const now = nowIso();
  const next: JobRead = {
    ...job,
    status,
    client_updated_at: now,
    updated_at: now,
    completed_at:
      status === "done" && !job.completed_at ? now : job.completed_at,
  };
  await db.jobs.put(next);
  await enqueue("job", next.id);
  return next;
}
