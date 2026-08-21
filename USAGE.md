# SolarHand — Run & Usage Guide

SolarHand is a solar fleet monitoring platform with three frontends (Operations Dashboard, Technician Mobile App, Client App) powered by a Go backend that simulates live telemetry from solar stations.

---

## Prerequisites

| Tool | Version | Used for |
|------|---------|----------|
| [Node.js](https://nodejs.org/) | 18+ | Frontend (React + Vite) |
| npm | 9+ | Frontend package manager |
| [Go](https://go.dev/dl/) | 1.22+ | Backend (telemetry simulator & API) |

Check your installation:

```bash
node --version
npm --version
go version
```

---

## Running the App

You need **two terminals**: one for the backend, one for the frontend.

### 1. Start the Backend (Terminal 1)

> ⚠️ The backend must be run **from inside the `backend/` directory** — it loads station data from a relative path (`data/stations.json`).

```bash
cd backend
go run main.go
```

You should see:

```
Loaded 100 solar stations from data/stations.json
==================================================
🚀 SolarHand Backend Server listening on http://localhost:8000
==================================================
```

The backend does two things automatically:
- Serves the REST API on **http://localhost:8000**
- Runs a telemetry simulator that updates one station per second (NORMAL / WARNING / FAULT states)

Optional — build a binary instead of using `go run`:

```bash
cd backend
go build -o server .
./server
```

### 2. Start the Frontend (Terminal 2)

From the project root:

```bash
npm install    # first time only
npm run dev
```

Open the app in your browser at **http://localhost:5173**

### Production Build

```bash
npm run build     # outputs to dist/
npm run preview   # serve the production build locally
```

### Configuration (optional)

The frontend connects to the backend at `http://localhost:8000` by default. To point it elsewhere, set `VITE_API_URL` before starting the dev server:

```bash
VITE_API_URL=http://192.168.1.50:8000 npm run dev
```

> The frontend also works without the backend running — it falls back to built-in demo data. Start the backend to see **live** telemetry.

---

## Using the App

A launcher bar is fixed at the top of the page with three buttons to switch between apps:

| Button | App | Audience |
|--------|-----|----------|
| **Dashboard** | Operations manager console | Fleet monitoring & dispatch |
| **Mobile App** | Technician field app | Repairs & job checklists |
| **Client App** | Site owner portal | System health & service requests |

### 🖥️ Dashboard (Operations Manager)

Use the left sidebar to switch between sections:

- **Dashboard** — Fleet overview: uptime %, total power, active alerts, offline systems, plus live charts.
- **Fleet** — Browse all stations; search by name and filter by status (NORMAL / WARNING / FAULT).
- **Alerts** — Active problems sorted by severity (Critical / High). Filter with *All / Action needed / Scheduled-resolved*.
- **Work Orders** — View existing repair jobs and click **New Work Order** to dispatch a technician (fill in site, title, urgency).
- **Technicians / Sites / Analytics** — Supporting views for staff, locations, and trends.
- **Settings** — Configure the API URL the dashboard polls.

Clicking the summary metric cards jumps you to the related section.

### 📱 Mobile App (Technician)

Bottom navigation tabs:

- **Jobs** — List of assigned repairs (generated from stations currently in WARNING/FAULT). Tap a job to open its detail screen with cause, required tools, safety notes, site contact (tap to call), and a step-by-step checklist you can tick off.
- **Sync** — Offline-first sync status; simulates queued updates syncing when back in range.
- **Updates** — Notifications about job changes.
- **Profile** — Technician account info.

If the backend is offline, the Jobs tab shows sample demo jobs instead.

### 👤 Client App (Site Owner)

Bottom navigation tabs:

- **Home** — Your system's health score ring, live snapshot stats, and a **Request Service** button. Choose an urgency level: *Can wait* (3–5 days), *Soon* (24 hours), or *Urgent* (4 hours), describe the issue, and submit → confirmation screen with a tracking ID.
- **Alerts** — Issues affecting your system.
- **Support** — Contact support channels.
- **Profile** — Account details.

---

## API Reference (Backend :8000)

All endpoints return JSON and support CORS.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/Stationmetrics` | Latest telemetry for all stations |
| `POST` | `/Stationmetrics` | Ingest a telemetry record |
| `GET` | `/api/stations` | Same as GET `/Stationmetrics` |
| `GET` | `/api/metrics/summary` | Fleet summary (uptime, power, alert counts) |
| `GET` | `/api/alerts` | Active alerts derived from WARNING/FAULT stations |
| `GET` | `/api/work-orders` | List all work orders |
| `POST` | `/api/work-orders` | Create a work order |

Quick test with curl:

```bash
curl http://localhost:8000/api/metrics/summary
curl http://localhost:8000/api/alerts
```

Example telemetry payload (`POST /Stationmetrics`):

```json
{
  "timestamp": "2026-01-01T10:00:00Z",
  "station_name": "Kisumu Solar Station 001",
  "latitude": -0.0917,
  "longitude": 34.768,
  "voltage": 18.4,
  "current": 8.2,
  "temperature": 32.1,
  "power": 150,
  "status": "NORMAL"
}
```

Example work order payload (`POST /api/work-orders`):

```json
{
  "station": "Kisumu Solar Station 002",
  "title": "Inverter Array B Fault",
  "description": "String voltage dropped 40% over 20 minutes.",
  "urgency": "urgent"
}
```

Missing fields are auto-filled (ID like `WO-5001`, status `Pending`, default checklist, etc.).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Error loading stations JSON` on backend start | Run `go run main.go` from inside `backend/`, not the repo root |
| Port 8000 already in use | Stop the other process, or change the port in `backend/main.go` (both `ListenAndServe` and the simulator's POST URL) |
| Frontend shows demo data only | Backend isn't reachable — check Terminal 1 and confirm http://localhost:8000/api/metrics/summary responds |
| Backend on another machine | Set `VITE_API_URL` (see Configuration above) |
