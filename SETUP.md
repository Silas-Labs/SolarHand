# SolarHand — Setup

The simplest path to a running SolarHand. There is **only one secret to generate** (a JWT signing key). No paid services, no API keys, no database account — the weather data source (Open-Meteo) is free and keyless, and the database is a self-contained file.

---

## Option A — Run the whole app with Docker (recommended, ~5 minutes)

**1. Install Docker Desktop** — https://www.docker.com/products/docker-desktop/ (includes Docker Compose). Start it and wait until it says "running".

**2. Get a copy of the project config file.** From the project folder:

```bash
cp .env.example .env
```

(On Windows PowerShell: `Copy-Item .env.example .env`)

**3. Generate your JWT secret** and paste it into `.env`. Run:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Copy the line it prints, open `.env`, and replace the placeholder so it reads:

```
SOLARHAND_JWT_SECRET_KEY=<the-long-random-string-you-just-generated>
```

That is the only value you *must* change. The rest of `.env` has working defaults.

**4. Start everything:**

```bash
docker compose up --build
```

**5. Load the demo data** (in a second terminal, once it's running):

```bash
docker compose exec api python -m app.seed
```

**6. Open the app:** http://localhost:8080
Sign in with **`admin@lakesidesolar.co.ke`** / **`solarhand`**.

That's it. To stop: press `Ctrl+C`, or `docker compose down`.

---

## What each `.env` value is for

| Value | What it does | Do you need to change it? |
|---|---|---|
| `SOLARHAND_JWT_SECRET_KEY` | Signs login tokens | **Yes — generate your own (step 3).** |
| `SOLARHAND_GATEWAY_KEY` | Shared secret connected devices (and the demo simulator) present to post telemetry | No — a working default is set; change only if you expose telemetry ingestion publicly |
| `SOLARHAND_CORS_ORIGINS` | Which web origins may call the API | Only if you host the frontend on a *different* domain than the API |
| `WEB_PORT` | Port the app opens on (default 8080) | Only if 8080 is already in use |
| `API_PORT` | Port the API is exposed on (default 8000) | Only if 8000 is already in use |

Advanced (optional) backend variables, all with safe defaults: `SOLARHAND_DATABASE_URL` (swap SQLite for Postgres), `SOLARHAND_ACCESS_TOKEN_EXPIRE_MINUTES`, `SOLARHAND_JWT_ALGORITHM`, `SOLARHAND_ENVIRONMENT`.

---

## Optional — the connected-device telemetry demo

Some sites in SolarHand are **connected**: a gateway on the roof streams inverter
telemetry, so the app can show live device readings and diagnose *why* a system
is underperforming — not just that it is. The demo seed already includes two
connected sites, so after step 5 you'll see a **Live telemetry** panel on their
asset pages and telemetry-sourced faults on the dashboard. Nothing extra needed
to view it.

To generate *fresh* telemetry — or to trigger a diagnosis on demand — run the
bundled **device simulator**. It's a labeled stand-in for a rooftop gateway: it
synthesises physically plausible samples and POSTs them to the *same* ingestion
endpoint (`POST /telemetry`, authenticated with `SOLARHAND_GATEWAY_KEY`) that a
real device would use. It is a simulator over the real pipeline, not a live
fleet — but it exercises every step end to end (adapter → validate → store →
diagnose → roll up → forecast).

With Docker running (Option A), in a second terminal:

```bash
# 6 days of history, so the rollup and trend forecast have something to score:
docker compose exec api python -m app.telemetry.simulator --backfill 6

# a live window with an injected string outage — shows the cause + parts to bring:
docker compose exec api python -m app.telemetry.simulator --live --inject string_outage
```

Without Docker (Option B), run the same commands from `backend/` with your venv
active, dropping the `docker compose exec api` prefix (e.g.
`python -m app.telemetry.simulator --live --inject string_outage`).

Then sign in as the admin and click **Refresh telemetry** on the dashboard to
roll the backfilled days up into scored readings (or POST to `/telemetry/rollup`).

A few useful flags:

| Flag | Effect |
|---|---|
| `--backfill N` | Post `N` completed past days of history |
| `--live` | Post the recent window up to now (add `--loop` to keep ticking) |
| `--inject {string_outage,inverter_fault,thermal,soiling}` | Bake a fault signature into the samples so the diagnosis fires |
| `--dry-run` | Print the batch JSON instead of sending — no server needed |
| `--device ID` | Target gateway (defaults to `GW-CLINIC-01`, a seeded connected site) |

The simulator reads `SOLARHAND_API_URL` (default `http://localhost:8000`) and
`SOLARHAND_GATEWAY_KEY` from the environment, or takes `--url` / `--key`
directly. The key must match the API's `SOLARHAND_GATEWAY_KEY`, or ingestion
returns `401`.

---

## Option B — Run without Docker (for development)

You need **Python 3.11+** and **Node 18+**.

**Backend** (from `backend/`):

```bash
python -m venv .venv
. .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
$env:SOLARHAND_JWT_SECRET_KEY = python -c "import secrets; print(secrets.token_urlsafe(48))"   # optional; a dev default exists
uvicorn app.main:app --reload   # API on http://localhost:8000
python -m app.seed              # load demo data
```

**Frontend** (from `frontend/`, in a second terminal):

```bash
npm install
echo "VITE_API_BASE=http://localhost:8000" > .env
npm run dev                     # app on http://localhost:5173
```

Open http://localhost:5173 and sign in with the demo credentials above.

---

## Option C — Deploy to the cloud (optional)

The frontend is a static PWA and deploys cleanly to **Vercel** (a `vercel.json` is already included). The backend is any host that runs a container or a Python process.

1. **Deploy the API** (Render, Railway, Fly.io, a VM — anywhere that runs the `backend/` Dockerfile). Set these environment variables on the host:
   - `SOLARHAND_JWT_SECRET_KEY` — a fresh generated secret (step 3 command).
   - `SOLARHAND_CORS_ORIGINS` — your Vercel URL, e.g. `https://your-app.vercel.app`.
   - `SOLARHAND_DATABASE_URL` — a Postgres URL if you want data to persist across restarts (SQLite works too but resets if the container's disk is ephemeral).
2. **Deploy the frontend to Vercel:** import the repo, set the project root to `frontend/`, and add one environment variable:
   - `VITE_API_BASE` — the public URL of your deployed API (e.g. `https://your-api.onrender.com`).
3. Redeploy the frontend so the new `VITE_API_BASE` is baked into the build, then load `/` and sign in.

---

## Troubleshooting

- **Port already in use** — change `WEB_PORT` / `API_PORT` in `.env` and restart.
- **Login fails from a cloud frontend** — the API's `SOLARHAND_CORS_ORIGINS` must list your exact frontend origin (scheme + host, no trailing slash).
- **`python` not found on Windows** — use `py` instead (e.g. `py -c "import secrets; print(secrets.token_urlsafe(48))"`).
- **Simulator returns `401`** — its `--key` (or `SOLARHAND_GATEWAY_KEY`) must match the API's `SOLARHAND_GATEWAY_KEY`. **`404`** means the `--device` doesn't match a connected asset — use `GW-CLINIC-01` (seeded) or a device you've registered.
- **Reset the demo data** — the seed is idempotent; re-run it. To wipe entirely with Docker: `docker compose down -v` then `up` and seed again.
