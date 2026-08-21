# SolarHand — Backend (FastAPI)

The API and analytics core for **SolarHand**: an offline-first field-service,
EPRA-compliance, and *no-telemetry* performance-check platform for Kenya's
solar installers and technicians.

## Stack

- **FastAPI** + **Uvicorn** — REST API
- **SQLAlchemy 2.0** — ORM (SQLite by default, Postgres-ready)
- **Pydantic v2** — request/response schemas & settings
- **JWT** (python-jose) + **bcrypt** — auth
- **pvlib** + **Open-Meteo** — expected-yield & Performance Ratio (analytics phase)

## Quick start

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env            # optional; sensible defaults work out of the box
uvicorn app.main:app --reload
```

Open http://127.0.0.1:8000/docs for interactive API docs.

## Tests

```bash
pytest -q                       # from the backend/ directory
```

## Layout

```
backend/
├── app/
│   ├── config.py        # env-driven settings
│   ├── database.py      # engine, session, Base
│   ├── main.py          # app factory + router registration
│   ├── models.py        # SQLAlchemy models
│   ├── schemas.py       # Pydantic schemas
│   ├── security.py      # password hashing + JWT
│   ├── deps.py          # shared dependencies (auth, db, roles)
│   ├── audit.py         # tamper-evident hash-chained audit log
│   ├── routers/         # feature routers
│   └── services/        # solar analytics, EPRA docs
└── tests/               # pytest suite
```

## Configuration

All settings use the `SOLARHAND_` env prefix — see `.env.example`.
The default SQLite DB and dev JWT secret let a fresh clone run immediately;
override `SOLARHAND_DATABASE_URL` and `SOLARHAND_JWT_SECRET_KEY` for anything real.
