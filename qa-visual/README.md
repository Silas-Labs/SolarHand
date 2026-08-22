# Visual QA — headless walkthrough

A deterministic way to *see* the running SolarHand app without driving a
desktop browser by hand (or by screen-overlay). It uses headless Chromium via
Playwright, logs in through the real login form, and captures full-page
screenshots of the key screens into `./shots/`.

This exists because pixel-coordinate overlay automation proved unreliable;
this approach uses DOM selectors and real navigation, so it's repeatable.

## One-time setup

From the backend virtualenv (so Playwright is on the same interpreter):

```powershell
# in backend/.venv
pip install playwright
python -m playwright install chromium
```

## Run

Start both servers first:

- API on `http://127.0.0.1:8099`
- frontend dev server on `http://localhost:5173`

Then:

```powershell
& backend\.venv\Scripts\python.exe qa-visual\walkthrough.py
```

Screenshots land in `qa-visual/shots/`:

| file | screen | what to check |
| --- | --- | --- |
| `01_landing.png` | public landing | "Modelled" chip; "never streams data off your inverters" |
| `02_assets_list.png` | technician asset list | connected sites listed |
| `03_XX_<site>.png` | asset detail (one per connected site) | Live-telemetry "Simulated feed" panel, Diagnosis "why + parts" card, Performance-forecast "Trend projection" reading |
| `04_admin_dashboard.png` | admin console | "N connected" KPI, source-provenance chips, "Refresh telemetry" |

The connected-site asset IDs are resolved live from the API (by
`telemetry_enabled`), so this keeps working after a reseed — asset UUIDs change
on every `python -m app.seed` run.

## Config

Override defaults via environment variables:

`SH_WEB`, `SH_API`, `SH_ADMIN`, `SH_ADMIN_PW`, `SH_TECH`, `SH_TECH_PW`.

## Notes

- Two demo roles are used: a **technician** (default `brian@lakesidesolar.co.ke`)
  for `/assets/:id` pages and an **admin** (`admin@lakesidesolar.co.ke`) for
  `/admin`. Role gating means admins can't reach asset-detail pages and vice
  versa, so the script logs in as each in a separate browser context.
- A single `401` on `/auth/me` per fresh context is expected and benign — it's
  the app probing for a cached session before falling back to the public view.
- `shots/` is throwaway output; safe to gitignore or delete.
