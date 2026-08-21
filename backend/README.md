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
    deps.py          # auth / RBAC dependencies
    routers/         # auth, users, companies, assets, jobs, readings,
                     # faults, sync, audit_log
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
