# SolarHand

**An offline-first field-service and EPRA-compliance platform for Kenya's solar installers.**
SolarHand helps a solar company keep already-installed systems running. It reads each system two ways — from meter readings a technician captures on a visit, and from telemetry streamed by connected site gateways — and runs both through the same physics-based "Digital Twin Lite" that compares *expected* output against *actual*. When a connected system reports its internal channels, SolarHand goes a step further and names the **probable cause** and the **parts likely needed**, so a technician arrives prepared. Every action is written to a tamper-evident audit trail for EPRA compliance.

> **How SolarHand sees a system.** A reading reaches the platform one of two ways:
> **(1) Manual** — a technician records a meter reading during a visit; this always works, on any brand, fully offline, and is the universal fallback for every site.
> **(2) Telemetry** — a connected site gateway streams periodic samples (energy plus diagnostic channels: per-string voltages, inverter status/fault codes, temperature) to the server.
> Both paths converge on the **same** Digital Twin Lite: SolarHand models what the system *should* have produced from its rating, location, tilt and the day's weather, and compares. Telemetry adds one thing a single energy number cannot give — the **why** — and lets SolarHand forecast a decline before it becomes an outage.
>
> **What is simulated in this build:** the telemetry *feed*. The ingestion API, storage, adapter, physics, diagnosis, forecasting and audit are all real, tested code. In place of a physical gateway on a roof, a labeled **device simulator** posts realistic telemetry to the real ingestion endpoint over the exact path a real gateway would use. See **[What's real vs. simulated](#whats-real-vs-simulated-in-this-build)**.

---

## The problem

Solar adoption across Kenya is outpacing the capacity to keep systems running well. Once a system is installed, providers and technicians rarely have a shared, reliable way to know whether it is still performing, *why* it isn't when it fails, who should fix it, or whether a repair actually worked. Four gaps make this expensive.

The first is silent underperformance: a system can lose output for weeks before anyone notices, and by the time a customer complains the lost generation is gone for good. The second is dispatching blind: even once a fault is known, a single "it's underperforming" signal doesn't say *why* — so a technician drives hours to a rural site, discovers the real cause on arrival, and leaves again for the right part. First-time-fix rate is the dominant cost lever in field service, and guessing destroys it. The third is connectivity: rural and semi-urban sites have the weakest signal, so cloud-only tools stop working exactly where the technician is standing. The fourth is proof: EPRA-licensed contractors must be able to show who did what and when, and prove the record hasn't been edited after the fact.

The result is degraded systems running inefficiently for weeks, repair effort spent on the wrong priorities and repeated on wasted trips, and eroding long-term return on the solar investment.

---

## How it works

SolarHand closes the loop from a reading to a *verified* repair, and — for connected sites — moves the loop earlier, from "it failed" to "it's about to."

```
  Manual reading (a visit)          Telemetry (connected gateway → simulator in this build)
  online or fully offline           energy + string V, inverter codes, temperature
            │                                     │
            │                                     ▼
            │                        Adapter normalizes any device → canonical sample
            │                                     │
            │                                     ▼
            │                        Daily rollup → a Reading (source = "telemetry")
            │                                     │
            └──────────────┬──────────────────────┘
                           ▼
        Digital Twin Lite  ──►  expected vs. actual performance ratio (IEC 61724)
                           │
        ┌──────────────────┼───────────────────────────────┐
        ▼                  ▼                                 ▼
  Underperformance     Diagnosis (connected only):      Trend forecast:
  / fault flag         channels → probable cause         PR slope → projected
        │              + recommended parts               threshold crossing
        │                  │                                 │
        └──────────────────┴─────────────┬───────────────────┘
                                          ▼
                    Work order — carrying the cause and the parts
                                          │
                                          ▼
             Technician fix in the field (checklist + photos + notes, fully offline)
                                          │
                                          ▼
             Verified closure  ──►  next reading confirms recovery, or an admin approves
                                          │
                                          ▼
             Tamper-evident audit trail (hash-chained) records every step
```

Four things make this approach distinctive.

**Two input paths, one brain.** Manual readings and telemetry both resolve to the same unit — a reading over a window — and run through the same physics engine, so a mixed fleet of connected and unconnected sites is managed in one console with one mental model. No site is left out because it lacks a gateway.

**Model-based checks, no hardware lock-in.** Because performance is computed from physics rather than trusted from a specific inverter's self-report, the check works across any brand and needs no extra sensors. Telemetry *enriches* the check; it is never *required* for it.

**Move with facts, not guesses.** For connected sites, the diagnostic channels let SolarHand name a probable cause — a dropped string, an inverter fault code, thermal derating, a soiling-shaped decline — and attach the parts likely needed to the work order, so the first trip is the fix.

**Verified closure, not just logged closure.** A job is "done" when a follow-up reading confirms recovery or an admin reviews and approves it — not merely because a technician marked it complete.

---

## Two layers of intelligence

### 1. Model-based performance — on every site, any source

The Digital Twin Lite is the universal floor. Given a reading (from either path) it reconstructs the expected yield for that window from solar geometry, irradiance and temperature, computes the IEC 61724 performance ratio, and classifies any shortfall into an actionable band. It is deterministic and explainable — no black box — and it works on a manual reading typed in with the network off, so **coverage never depends on connectivity**. This is what keeps unconnected and rural sites first-class citizens of the platform.

### 2. Telemetry & predictive maintenance — on connected sites

Connected sites add two capabilities on top of the physics floor:

- **Diagnosis (the "why").** A rule-based classifier reads the device's diagnostic channels and maps them to a probable cause and a recommended-parts list — for example, one string voltage collapsed while the others hold → *string outage, check the combiner fuse/connector on that string*; an inverter fault code with zero AC output → *inverter trip, bring the replacement fan/board for that model*; rising module temperature with a gentle output sag → *thermal derating / ventilation*. The cause and parts ride along on the work order.
- **Trend forecasting (early warning).** A pure-Python least-squares fit over a site's performance-ratio history projects the slope forward and estimates when it will cross the "needs attention" threshold. A slow soiling or degradation trend surfaces as an early-warning flag *before* it becomes lost generation — explainable arithmetic, with the projected date shown, not an opaque prediction.

> **Honest framing of "predictive."** This is explainable diagnosis plus statistical trend extrapolation — not machine learning. It closes the "predictive maintenance" gap with methods a technician can inspect and trust. Trained-model forecasting is noted as optional future work, not claimed here.

---

## The adapter layer (brand-agnostic, honestly)

Every device speaks its own dialect, so SolarHand normalizes **at the edge**: an adapter converts a device's raw payload into one canonical telemetry sample, and nothing downstream ever sees a brand difference. That is what "brand-agnostic telemetry" means here — an architectural property (normalize-once, at ingestion), not a claim that we already speak every vendor's protocol.

This build ships:

- **A canonical-gateway adapter** — the live path. It accepts the normalized JSON that our gateway/simulator emits and is fully wired end-to-end.
- **A labeled device simulator** — generates realistic diurnal telemetry and can inject faults on demand (string dropout, inverter trip, soiling ramp, thermal derate), posting to the real ingestion endpoint exactly as a field gateway would.
- **A documented real-protocol stub** — a clearly-marked extension point (e.g. Modbus/SunSpec or a PAYG provider API) showing where a production driver plugs in, without pretending one is finished.

**Why a bundled gateway is realistic here.** Kenya's off-grid market runs largely on **PAYG** solar (M-KOPA, Sun King, d.light, Bboxx, Fenix), where devices already carry embedded GSM and report state to the provider's servers to manage payments and lockouts. Connected devices over cellular are the *dominant, proven model* in exactly the rural settings SolarHand targets — so an installation-bundled gateway feeding this platform follows an established pattern. We cite PAYG as proof of the **approach**, not as a claim that SolarHand ingests any provider's live stream today.

---

## Features

**Admin console (operations manager)**

- Fleet dashboard — portfolio health, open faults, jobs by status, underperforming sites, and early-warning sites the forecaster is watching.
- Fleet map — every installation plotted with its current health (Leaflet), connected sites marked.
- Live telemetry panel — for a connected asset, the recent generation curve and latest diagnostic channels, clearly labeled as a simulated feed.
- Dispatch board — assign and track jobs across the team; work orders carry the diagnosis and recommended parts.
- Team — manage technicians within the company.
- EPRA compliance — licence and documentation status for the contractor and its sites.
- Audit trail — the full hash-chained event log, with one-click integrity verification.

**Technician field app (offline-first PWA)**

- My jobs — the day's assigned work, available offline, each showing the diagnosed cause and parts to bring.
- Job detail + checklist — structured inspection steps completed on-site.
- Reading capture — record meter readings; get an instant expected-vs-actual verdict.
- Sync — see what's pending and push it when back in range.
- Profile — account and session.

---

## Emerging technology

SolarHand is built around the hackathon's **Cloud & Edge Computing → offline-first** theme, and adds two supporting pillars:

- **Cloud & Edge / offline-first (primary):** service worker + IndexedDB (Dexie) outbox + delta sync let the entire technician workflow run with no connection and reconcile later. The site gateway (on cellular) and the technician app (offline) are independent actors on independent paths — telemetry does not compromise offline-first; it complements it.
- **Data intelligence:** physics-based performance and risk modelling (solar geometry, irradiance, IEC 61724 performance ratio), plus rule-based diagnosis and statistical trend forecasting — all deterministic and explainable, not a black-box model.
- **Cybersecurity for climate infrastructure:** JWT auth, bcrypt password hashing, role-based access, company-scoped multi-tenancy, a hash-chained audit log that makes tampering detectable, and a separate gateway key for device ingestion so telemetry writes are authenticated without a human session.

---

## Tech stack

- **Backend:** FastAPI, SQLAlchemy 2.0, Pydantic v2, SQLite (Postgres-ready via `SOLARHAND_DATABASE_URL`). Pure-Python analytics, diagnosis and forecasting — no NumPy/Pandas/pvlib — so it runs anywhere and is fully reproducible.
- **Telemetry:** a `/telemetry` ingestion API (gateway-key auth), a separate `TelemetrySample` store, an adapter/normalization layer, a daily rollup into the shared reading pipeline, and a standalone device simulator.
- **Frontend:** React + Vite + TypeScript PWA, React Router, Zustand, Dexie (IndexedDB), Leaflet, `vite-plugin-pwa`.
- **API surface:** `/auth`, `/users`, `/companies`, `/assets`, `/jobs`, `/readings`, `/faults`, `/analytics`, `/telemetry`, `/sync`, `/audit`, `/health`, and interactive docs at `/docs`.

---

## Run it

Requires Docker with the Compose plugin. First-time configuration (generating a JWT secret, the device gateway key, environment values, optional cloud deploy) is covered in **[SETUP.md](SETUP.md)**.

```bash
cp .env.example .env
docker compose up --build
```

Open the app at **http://localhost:8080** (API docs at **http://localhost:8000/docs**). Load the demo dataset:

```bash
docker compose exec api python -m app.seed
```

**Demo login:** `admin@lakesidesolar.co.ke` / `solarhand` (all seeded users share this password). The seed creates a licensed Kisumu contractor, one admin and four technicians, six PV systems — two of them marked **connected** with a streaming gateway — jobs across every status, meter readings including one clearly underperforming site, a mix of technician-reported and Digital-Twin-detected faults, and a short telemetry history so the forecaster has a trend to project — all recorded through the audit chain.

**Stream live telemetry (simulated gateway):**

```bash
# Backfill a few days of history, then stream live and inject a fault mid-run:
docker compose exec api python -m app.telemetry.simulator --live --inject string_outage
```

The simulator posts to the real `/telemetry` endpoint using the gateway key from your environment; watch the connected asset's live panel update, a diagnosis appear, and — after a rollup — an early-warning forecast.

---

## How to use the platform

A guided walkthrough for testing SolarHand. Replace each image below with your own screenshot as you go.

### 1. Sign in

Open the app and sign in with the demo admin (`admin@lakesidesolar.co.ke` / `solarhand`). The role on the account decides which experience loads — admins get the console, technicians get the field app.

![Sign-in screen](docs/screenshots/01-login.png)

### 2. Admin — read the fleet at a glance

The dashboard opens on portfolio health: how many systems are healthy, how many faults are open, which sites are underperforming, and which connected sites the forecaster is watching for an early warning.

![Admin dashboard](docs/screenshots/02-admin-dashboard.png)

### 3. Admin — watch a connected site live

Open a connected asset to see its recent generation curve and latest diagnostic channels. This panel is fed by the labeled device simulator over the real ingestion path.

![Live telemetry panel](docs/screenshots/03-telemetry-panel.png)

### 4. Admin — dispatch with the cause and the parts

When a connected site faults, the work order carries the **diagnosed cause** and **recommended parts**. Assign it to a technician who now drives out prepared, not guessing.

![Dispatch with diagnosis](docs/screenshots/04-dispatch-diagnosis.png)

### 5. Admin — check compliance and audit integrity

The compliance view shows licence and documentation status. The audit trail lists every recorded action — including device-originated ones; use **Verify** to re-derive the hash chain and confirm nothing has been altered.

![EPRA compliance](docs/screenshots/05-compliance.png)
![Audit trail with integrity check](docs/screenshots/06-audit.png)

### 6. Technician — work a job offline

Sign in as a technician to load the field app. Open a job to see its checklist and the parts to bring; complete steps, add photos and notes with the network switched off.

![Technician job list](docs/screenshots/07-tech-jobs.png)
![Job checklist](docs/screenshots/08-job-checklist.png)

### 7. Technician — capture a reading and see the verdict

Record a meter reading for a system. SolarHand immediately shows the expected-vs-actual verdict so the technician knows on-site whether the system is performing.

![Reading capture and verdict](docs/screenshots/09-reading-verdict.png)

### 8. Technician — sync when signal returns

The sync screen shows everything captured offline. Reconnect and push it; the audit trail on the admin side updates to reflect the field work.

![Offline sync](docs/screenshots/10-sync.png)

> Tip: to feel the offline-first behaviour, open the technician app, turn off your network (or use the browser devtools "Offline" toggle), complete a job and capture a reading, then reconnect and open the Sync screen.

### 9. Owner portal — the customer's view

Site owners have their own space at `/portal`, separate from the installer app. They sign in to see each system's current performance and plain-language verdict, download performance, savings and EPRA-compliance reports, and raise or track support tickets. Performance is modelled from verified readings — the portal never streams data off the inverters. It runs on a self-contained demo session with sample data, so it works even without the backend running.

![Owner portal landing](docs/screenshots/11-portal-landing.png)
![Owner portal overview](docs/screenshots/12-portal-overview.png)

---

## What's real vs. simulated in this build

Being precise about this is part of the point — SolarHand's earlier drafts overclaimed, and this rewrite fixes that.

**Real, running, tested code:** the `/telemetry` ingestion API and its gateway-key authentication; the `TelemetrySample` store; the adapter/normalization layer; the daily rollup that turns telemetry into a `Reading(source="telemetry")`; the Digital Twin Lite physics; the rule-based diagnosis and its recommended-parts output; the statistical trend forecaster; the fault → work-order → verified-closure loop; the hash-chained audit; and the offline-first PWA.

**Simulated:** the device *feed*. Instead of a physical gateway on a roof, a labeled simulator generates realistic telemetry (and injects faults on demand) and posts it to the real ingestion endpoint over the same path a real gateway would use. Replacing the simulator with a real gateway changes nothing downstream.

**Not included (roadmap):** production vendor-protocol drivers (Modbus/SunSpec, specific PAYG provider APIs) — represented here by a documented adapter stub — and trained-model forecasting as an optional successor to the statistical forecaster.

---

## Project structure

```
backend/
  app/
    analytics/     Digital Twin Lite: physics, fault classifier, trend forecaster
    telemetry/     adapters, ingestion rollup, diagnosis, device simulator
    routers/       API endpoints (incl. /telemetry)
  tests/           pure-Python + API tests
frontend/          React + Vite PWA (admin console + technician field app)
docs/              screenshots and supporting material
```

---

## Contributors

- [Andrew Okutu](https://github.com/aokutu)
- [Dixon Osure](https://github.com/Dixon-O)
- [Joel Samoita](https://github.com/joe-samoita)
- [Peter Iregi](https://github.com/PeterIregi)
- [Silas Lelei](https://github.com/Silas-Labs)
