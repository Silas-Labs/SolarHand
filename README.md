# SolarHand
SolarHand is a monitoring, predictive-maintenance, and field-service platform built for Kenya's fastest-growing and most underserved solar segment.It ingests telemetry from solar assets, flags faults before they cause downtime, and routes the right technician with GPS-verified dispatch through an offline-first mobile workflow.

---

## Problem Statement

Solar adoption across Kenya (and Africa broadly) is outpacing the operational capacity to keep systems running. Once a solar system is installed, providers, technicians, and site owners have no shared, reliable way to know when something is failing, who should fix it, or whether a fix actually worked.

This gap is worse than it looks because:

- Monitoring is siloed by hardware brand — each inverter/panel vendor has its own app or portal, so operations teams managing mixed-brand fleets have no unified view.
Connectivity is unreliable in the rural and semi-urban areas where a lot of solar deployment happens, so cloud-only tools fail exactly where they're needed most.
- There's no closed loop — an alert firing doesn't guarantee a technician is dispatched, a technician being dispatched doesn't guarantee the right skills/parts, and a "fix" being logged doesn't guarantee the system is actually healthy again.

The result: degraded systems run inefficiently for weeks before anyone notices, repair capacity is wasted on the wrong priorities, and the long-term ROI of solar investment erodes — undermining trust in solar as a reliable energy source.

---

## Solution

A cross-brand, offline-first operations platform that turns solar telemetry into verified repairs — not just alerts.

We're not building another vendor-specific monitoring dashboard. We're building the operations layer that sits above any hardware brand and closes the loop from fault to fix:

Telemetry → Rules Engine → Prioritized Alert → Work Order → Offline Technician Fix → Verified Closure

Three things make this different from existing solar monitoring tools:

- Brand-agnostic ingestion — an adapter layer normalizes telemetry from any inverter/panel brand into one common data model, so operations managers get one fleet view instead of five vendor apps.
- Offline-first field operations — technicians in low-connectivity areas can download work orders in advance, complete fixes (with photos/notes) fully offline, and sync automatically once back in range. Field service doesn't stop because signal does.
- Verified closure, not just logged closure — a work order isn't "done" because a technician says so; it's done when telemetry confirms the system recovered, or an ops manager reviews and approves it. This is what makes the loop trustworthy for owners and providers.

---

### Who it's for
Kenyan solar SMEs — the operations managers coordinating maintenance across a fleet, and the technicians doing the physical repair work in the field.

### Why now
Solar deployment in the region is growing faster than repair capacity and remote-service infrastructure can keep up. The bottleneck isn't installing more solar — it's keeping what's already installed running well.

------

## Architecture

SolarHand ships as a single installable PWA backed by one API:

- **Backend** — FastAPI (Python 3.11+), SQLAlchemy 2.0 and Pydantic v2. SQLite by
  default (Postgres-ready via `SOLARHAND_DATABASE_URL`). Endpoints are served at
  the root: `/auth`, `/users`, `/companies`, `/assets`, `/jobs`, `/readings`,
  `/faults`, `/analytics`, `/sync`, `/audit`, plus `/health` and interactive docs
  at `/docs`.
- **Digital Twin Lite** — a physics-based yield model (no on-site IoT hardware)
  estimates each system's expected generation from its rating, location and
  weather, then flags underperformance against metered readings.
- **Tamper-evident audit trail** — every write is appended to a hash-chained log
  (blockchain-free); `GET /audit/verify` re-derives the chain to prove it hasn't
  been altered.
- **Frontend** — a React + Vite PWA with role-based routing. Technicians get an
  offline-first workflow (IndexedDB via Dexie, background sync); admins get an
  online fleet console, dispatch board, EPRA compliance view and audit trail.

## Running with Docker (recommended)

Requires Docker with the Compose plugin.

```bash
cp .env.example .env          # optional: set a real SOLARHAND_JWT_SECRET_KEY
docker compose up --build     # builds both images and starts the stack
```

Then open the PWA at **http://localhost:8080**. The API is also published for
inspection at **http://localhost:8000/docs**. nginx serves the PWA and
reverse-proxies `/api/*` to the API, so the browser talks to a single origin.

Load the demo dataset (idempotent — safe to re-run):

```bash
docker compose exec api python -m app.seed
```

**Demo login:** `admin@lakesidesolar.co.ke` / `solarhand`
(all seeded users share that password). The seed creates a licensed Kisumu
contractor, an admin and four technicians, six PV systems, jobs across every
status, metered readings including one clearly under-performing site, and a mix
of technician-reported and Digital-Twin-detected faults — all recorded through
the audit chain.

## Local development

**Backend** (from `backend/`):

```bash
python -m venv .venv && . .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload                  # http://localhost:8000
python -m app.seed                             # optional demo data
```

**Frontend** (from `frontend/`):

```bash
npm install
echo "VITE_API_BASE=http://localhost:8000" > .env      # point at the dev API
npm run dev                                             # http://localhost:5173
```

## Tests

```bash
cd backend
pip install -r requirements-dev.txt
pytest                # or ./run_tests.sh
```

------

## Contributors
- [Andrew Okutu](https://github.com/aokutu)
- [Dixon Osure](https://github.com/Dixon-O)
- [Joel Samoita](https://github.com/joe-samoita)
- [Peter Iregi](https://github.com/PeterIregi)
