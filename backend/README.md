# SolarHand — Backend API

FastAPI service for SolarHand: offline-first field service, EPRA compliance, and
no-telemetry performance checks for Kenya's solar installers.

## Stack

- **FastAPI** + **Uvicorn** (ASGI)
- **SQLAlchemy 2.0** ORM — **SQLite** by default (zero-config), Postgres-ready
- **Pydantic v2** for request/response validation
- Auth: stdlib **HS256 JWT** + **bcrypt** password hashing
- Tamper-evident **hash-chained audit log** (SHA-256) — the blockchain-free
  compliance trail
- Offline **sync** (batch push with last-write-wins + delta pull)
- **Digital Twin Lite** — a pure-Python solar model that flags underperformance
  with no on-site sensor (physics + free weather, not telemetry)

## Layout

```
backend/
  app/
    config.py        # pydantic-settings (env prefix SOLARHAND_)
    database.py      # engine, session, SQLite SAVEPOINT support
    models.py        # ORM models
    schemas.py       # Pydantic v2 schemas
    security.py      # config-bound auth facade
    jwt_utils.py     # pure stdlib HS256 JWT (unit-tested)
    passwords.py     # pure bcrypt hashing (unit-tested)
    audit.py         # hash-chain compute + verify (unit-tested)
    sync_logic.py    # pure last-write-wins decision (unit-tested)
    deps.py          # auth / RBAC dependencies + weather provider
    analytics/       # Digital Twin Lite (pure-Python, unit-tested)
      solar_geometry.py  # sun position & surface angles (NOAA/Duffie-Beckman)
      irradiance.py      # Erbs decomposition + isotropic-sky transposition
      performance.py     # NOCT cell temp, expected energy, IEC 61724 PR
      faults.py          # rule-based severity classifier
      weather.py         # Open-Meteo adapter behind a provider protocol
      engine.py          # orchestrator (analyse / analyse_from_samples)
    routers/         # auth, users, companies, assets, jobs, readings,
                     # faults, analytics, sync, audit_log
    main.py          # app factory
  tests/             # pytest API suite + stdlib unit tests
  requirements.txt   # runtime deps
  requirements-dev.txt
  run_tests.sh       # two-tier test runner
```

## Quickstart

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env            # optional; sensible defaults otherwise
uvicorn app.main:app --reload
```

Interactive docs at http://127.0.0.1:8000/docs. Tables are created on startup;
no migration step is needed for the SQLite default.

### First request

```bash
# Onboard a company + its first admin, receive a bearer token
curl -s localhost:8000/auth/register -H 'content-type: application/json' -d '{
  "company": {"name": "Kisumu Solar Co", "county": "Kisumu"},
  "admin": {"email": "admin@kisumusolar.co", "full_name": "Ada Admin",
            "password": "password123"}
}'
```

## Configuration

All settings use the `SOLARHAND_` env prefix (see `.env.example`). Key ones:

| Variable                          | Default                     | Notes                                  |
| --------------------------------- | --------------------------- | -------------------------------------- |
| `SOLARHAND_DATABASE_URL`          | `sqlite:///./solarhand.db`  | Any SQLAlchemy URL (e.g. Postgres)     |
| `SOLARHAND_JWT_SECRET_KEY`        | dev-only insecure value     | **Set a strong secret in production**  |
| `SOLARHAND_ACCESS_TOKEN_EXPIRE_MINUTES` | `720`                 | Long-lived for field/offline use       |
| `SOLARHAND_CORS_ORIGINS`          | localhost dev origins       | Comma-separated list                   |

## Analytics — Digital Twin Lite

The differentiator: verify a system is underperforming **without any on-site
sensor**. For the window a meter reading covers, the engine models what a
healthy system *should* have produced and compares it to the metered energy.

Per hour it places the sun (NOAA/Spencer), splits the weather's global
horizontal irradiance into direct + diffuse (Erbs), projects onto the tilted
array (isotropic sky + ground), applies the NOCT cell-temperature derate, and
integrates expected energy. The actual-vs-expected ratio yields the IEC 61724
Performance Ratio and a severity verdict (healthy → severe) with likely causes.

The model is deliberately **pure Python** (no pvlib/numpy): every number is
auditable — a better fit for the EPRA compliance story — and it runs anywhere.
Weather comes from **Open-Meteo** (free, no key) behind an injectable adapter,
so the engine is deterministic under test.

Endpoints (bearer token, company-scoped):

| Method + path                       | Purpose                                        |
| ----------------------------------- | ---------------------------------------------- |
| `POST /analytics/assets/{id}`       | Analyse an ad-hoc reading (energy + date)      |
| `POST /analytics/readings/{id}`     | Analyse a stored reading by id                 |

Pass `persist_fault: true` to record a system-sourced `FaultReport` (with an
audit entry) when a fault is detected.

## Testing

```bash
./run_tests.sh          # full pytest suite if the stack is installed,
                        # otherwise the stdlib-only unit tests
./run_tests.sh --pure   # stdlib unit tests only (no third-party deps)
./run_tests.sh --cov    # pytest with coverage (needs pytest-cov)
```

Two tiers:

1. **Pure-logic unit tests** — JWT, password hashing, audit hash-chain, and
   sync conflict resolution. Depend only on the stdlib (+ system bcrypt), so
   they run anywhere, including offline build sandboxes.
2. **API/integration tests** — spin up the app against an in-memory SQLite DB
   via `TestClient`; cover auth, RBAC, company isolation, validation, the job
   lifecycle, offline sync (last-write-wins, per-item error isolation,
   idempotency), and audit-chain verification incl. tamper detection.
