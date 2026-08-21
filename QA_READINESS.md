# SolarHand — QA Readiness Report

**Status:** Ready for QA
**Date:** 2026-08-21
**Prepared for:** QA hand-off
**Scope:** Full-stack build verification — backend, analytics, PWA frontend, containerised deployment, and end-to-end wiring.

---

## 1. What SolarHand is

SolarHand is an offline-first field-service and EPRA-compliance application for Kenyan solar installers. It gives field technicians a mobile PWA to run inspection jobs, capture panel/inverter readings, and record faults while offline, and gives company admins a console for dispatch, team management, a fleet map, an EPRA compliance view, and a tamper-evident audit trail. Performance checks are done with a pure-Python "Digital Twin Lite" analytics engine (solar geometry, irradiance modelling, expected-vs-actual performance, and fault detection) — **no IoT telemetry, no external ML dependency, no pvlib/numpy/pandas** — so it runs anywhere and stays reproducible.

The system is two tiers: a FastAPI backend (SQLAlchemy 2.0, SQLite by default, hand-rolled stdlib JWT, direct bcrypt) and a React + Vite PWA served by nginx, which also reverse-proxies the API so the browser talks to a single origin.

---

## 2. Verification summary

Every item below was executed and observed during this build, not assumed.

| Area | Check | Result |
|---|---|---|
| Backend tests | Full pytest suite (12 files) | **120 passed**, 1 benign warning* |
| Container: API | Boots under production compose env | Healthy (was fixed — see §6) |
| Container: Web | nginx serves the PWA | Healthy |
| API direct `:8000` | `GET /health` | `200 {"status":"healthy"}` |
| API direct `:8000` | `GET /docs`, `GET /openapi.json` | `200` (Swagger UI + 48 KB spec) |
| PWA `:8080` | `GET /` shell, `manifest.webmanifest`, `sw.js` | `200` (SPA root + PWA artifacts present) |
| PWA `:8080` | Hashed asset `/static/index-*.js` | `200`, `application/javascript`, ~306 KB |
| **Wiring** | `POST /api/auth/login` **through nginx** | `200`, JWT issued — `/api` prefix strip works |
| **Wiring** | `GET /api/auth/me` with token, through nginx | `200`, returns admin identity |
| **Route collision** | `/jobs` (SPA route) vs `/api/jobs` (API path) | `/jobs`→SPA shell `200`; `/api/jobs`→`401` guarded |
| Data path | `/api/jobs`, `/api/assets` with token | `200`, counts **8** and **6** (match seed exactly) |
| Seed + integrity | `python -m app.seed` | 1 company, 5 users, 6 assets, 19 components, 8 jobs, 7 readings, 4 faults |
| Audit trail | Hash-chain verification on seed | **53 entries, intact** |

\* The single warning is Starlette/FastAPI's own internal `TestClient` httpx deprecation notice, not application code.

---

## 3. Branch topology (main is untouched)

The `main` branch was never modified, per the build directive.

| Branch | Head | State |
|---|---|---|
| `main` | `147ba62` (Add contributors section to README) | **Untouched** — verified identical before/after every merge |
| `develop` | `1217105` | Integration branch — **61 commits ahead of main** |
| `dev/1-backend-core` | `87071d8` | Fully merged into develop |
| `dev/2-analytics-engine` | `d02e91e` | Fully merged into develop |
| `dev/3-technician-pwa` | `4675dea` | Fully merged into develop |
| `dev/4-admin-compliance` | `a036872` | Fully merged into develop |
| `dev/5-design-devops` | `5879bb1` | Fully merged into develop |

All five developer branches show zero commits that are not already in `develop`. Work was committed incrementally on the feature branches and merged into `develop` with `--no-ff` (no squashing), so history is preserved for review. `main` is the branch to protect; QA and integration happen on `develop`.

---

## 4. How to run it

**Prerequisites:** Docker Desktop (tested with Engine 29.5.3).

From the repository root:

```bash
# Build images and start both tiers
docker compose up --build -d

# Load demo data (idempotent — safe to re-run)
docker compose exec api python -m app.seed
```

Then open:

- **PWA (main entry point):** http://localhost:8080
- **API Swagger UI:** http://localhost:8000/docs

Ports are configurable via environment variables — `WEB_PORT` (default 8080) and `API_PORT` (default 8000). During this build's smoke test, ports 8000/8080 were already occupied on the host, so the stack was verified on `API_PORT=18000 WEB_PORT=18080`; behaviour is identical.

**Demo credentials** (all seeded users share the same password):

- Email: `admin@lakesidesolar.co.ke`
- Password: `solarhand`

This account is a company admin (EPRA licence `EPRA/SPV/T1/2021/0088`), so it exercises both the admin console and, by role, the wider app. The seed also creates technician accounts under the same company for testing role-based access.

Tear down with `docker compose down` (add `-v` to also drop the SQLite volume and start fresh).

---

## 5. Architecture & wiring notes for QA

**Single origin in production.** The browser only ever talks to the nginx (web) tier. nginx serves the static PWA and reverse-proxies `/api/*` to the API container over the internal Docker network. The `location /api/ { proxy_pass http://api:8000/; }` rule **strips the `/api` prefix** (note the trailing slash), so `/api/auth/login` reaches the API as `/auth/login`. The frontend bundle is built with `VITE_API_BASE=/api` baked in.

**Deliberate route design (important for QA).** Several client-side SPA routes share names with API paths (`/jobs`, `/assets`, `/sync`). This is why a bare same-origin without a prefix is impossible and the `/api` prefix exists. It is verified that visiting `/jobs` in the browser serves the SPA shell (nginx `try_files … /index.html` fallback), while `/api/jobs` reaches the guarded API. Build assets are emitted under `/static/` (not Vite's default `/assets/`) specifically so a real asset directory cannot collide with the `/assets` SPA route.

**Offline-first PWA.** A service worker (`sw.js`, Workbox via `vite-plugin-pwa`, `registerType: autoUpdate`) is registered on load. GET reads for core endpoints use a NetworkFirst strategy with a 4-second timeout, so the app keeps working on flaky field connections; write actions queue on-device and sync when back online. QA should test airplane-mode behaviour: load while online, go offline, confirm cached reads and queued writes, then reconnect and confirm sync.

**Security posture.** JWTs are HS256, signed with `SOLARHAND_JWT_SECRET_KEY`. The compose file ships a **demo-insecure default secret** — this must be overridden for any real deployment. Passwords are hashed with bcrypt. The API container runs as a non-root user (uid 10001) and persists SQLite to a named volume at `/data`.

---

## 6. Bug found and fixed during smoke testing

The end-to-end smoke test did its job and surfaced one real defect:

**Symptom:** under `docker compose`, the API container crash-looped (exit 1) with no application log; the web tier then refused to start because its `depends_on` health gate never went green.

**Root cause:** `pydantic-settings` JSON-decodes complex-typed settings fields (here `cors_origins: list[str]`) directly in the environment source, *before* field validators run. The compose file passes `SOLARHAND_CORS_ORIGINS=http://localhost:8080` — a bare string, not JSON — so the decode raised `SettingsError` at import time and uvicorn exited before emitting a log. It never showed up in standalone `docker run` because that path doesn't set the variable.

**Fix (commit `87071d8`, on `dev/1-backend-core`, merged to `develop`):** annotate the field as `Annotated[list[str], NoDecode]` so the raw string is handed to the existing comma-splitting validator. A new `backend/tests/test_config.py` locks in the behaviour with four cases — the bare-URL crash case, comma-separated lists, whitespace cleanup, and the default fallback. After the fix the exact previously-failing container boots healthy, and the full stack passed every check in §2.

---

## 7. Known limitations

These are intentional scoping decisions for the hackathon, flagged so QA doesn't file them as defects:

- **Database is SQLite.** Fine for demo and single-node use; the code is Postgres-ready via a `SOLARHAND_DATABASE_URL` override, but Postgres was not part of this build.
- **Schema is created on startup, not migrated.** `init_db()` runs in the app lifespan hook; there is no Alembic migration history. A fresh volume is one `seed` command away from a working dataset.
- **Demo JWT secret** ships in `docker-compose.yml` and must be overridden in production.
- **Analytics is model-based, not telemetry-based** by design ("Digital Twin Lite"): expected performance is computed from solar geometry and modelled irradiance, then compared against manually captured readings. There is no live inverter integration.
- **Weather/irradiance** can use Open-Meteo endpoints; offline and test runs rely on the deterministic model rather than live calls.

---

## 8. Suggested QA focus areas

Prioritised by risk and by what this build could not fully exercise itself:

1. **Offline lifecycle** on a real device/browser — cached reads, queued writes, reconnect-and-sync, and conflict handling.
2. **Role-based access** — confirm technicians cannot reach admin-only routes or other companies' data (backend enforces 403/404; verify the UI matches).
3. **Cross-browser PWA install** — Android Chrome and iOS Safari "Add to Home Screen", manifest icons, standalone display.
4. **Audit trail integrity** — mutate data through the app and confirm the hash chain stays intact and tamper-evident.
5. **EPRA compliance view** — validate the compliance calculations and any licence/expiry logic against expected EPRA rules.
6. **Fault detection thresholds** — feed edge-case readings and confirm severity classification behaves sensibly.

---

*Build verified end-to-end on 2026-08-21: 120 backend tests passing, containerised stack healthy, PWA and API wired through a single nginx origin, `main` untouched at `147ba62`.*
