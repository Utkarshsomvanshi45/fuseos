# FUSE.OS: Risk Fusion Engine

**AI-Powered Industrial Safety Intelligence for Zero-Harm Operations**

Built for the ET AI Hackathon 2026, Problem Statement 1, by Dark Orbit.

> Isolated readings are normal. Combinations are what get missed.

FUSE.OS fuses gas sensor readings, SCADA data, work permits, shift logs, and PPE/camera signals into one live, per-zone risk picture. It detects dangerous *combinations* of signals in real time, something no single-purpose plant system (permit software, SCADA, gas monitoring) is built to catch on its own, since each one only watches its own feed.

---

## Live Demo

| | |
|---|---|
| **App** | https://utkarshsomvanshi45-fuseos-frontend.utkarshsomvanshi.workers.dev |
| **Login** | `ananya.rao@ris.gov.in` / `password123` |
| **API base** | https://fuseos-backend.onrender.com |

The backend runs on a free hosting tier that sleeps after 15 minutes of inactivity. The first request after idle time can take 30 to 60 seconds to respond while it wakes up. That delay is expected, not a fault.

---

## Screenshots

*(Add real screenshots here before publishing: Dashboard, Zone Risk Map, Alert Center, Reports. A short GIF of the live WebSocket update firing is worth more than any of the text below.)*

---

## The Problem

Indian heavy industry recorded over 6,500 fatal workplace accidents in FY2023 (DGFASLI). The anchor incident behind this problem statement: in January 2025, eight workers died at Visakhapatnam Steel Plant when trapped gases caused a coke oven battery explosion. The plant had working gas detectors, active permit-to-work controls, and functioning SCADA. The investigation found every warning signal was present in the data. Nothing connected them to an operational decision in time.

That is the gap FUSE.OS is built to close: not a lack of sensors, but a lack of correlation between the sensors already installed.

---

## What It Actually Does

Every feature below is live and tested against real data, not a mockup.

**Detect**
- Live compound-risk scoring per zone, computed from open risk events
- A plant-floor Zone Risk Map, color-coded by real-time risk score
- A Live Risk Monitor with full per-zone signal stacks (sensors, permits, events)

**Understand**
- AI Fusion Insights: real risk events with confidence and lead-time, not filler
- Permit Intelligence: every permit re-scored live against current zone conditions, with a plain-language conflict reason
- Compliance: regulatory gaps cited against real standards (OISD, Factory Act, DGMS, IS 5571), plus a computed compliance health score

**Act**
- Alert Center with a full evidence chain per alert (which sensor, which permit, which shift log entry contributed)
- Real-time push over a WebSocket connection, no polling, no manual refresh
- Email alerts on new critical/high severity events (real Gmail SMTP)

**Prove it worked**
- Six real, generated PDF report types: daily risk summary, weekly compound risk, permit audit, compliance gap, data source health, monthly executive summary
- A full audit log, auto-populated by every mutating action in Settings
- Analytics covering signal-type breakdown, zone comparison, and prediction lead-time/confidence, the exact metrics the problem statement asks for

**Administration**
- JWT-based auth with real role-based access control enforced at the API level (Admin/Operator/Viewer)
- Only Admins can invite or remove users; the system refuses to remove its own last remaining Admin
- Full settings coverage: cameras (including a real browser-webcam feed via `getUserMedia`), data sources, risk rules, notification recipients, plant configuration

---

## Architecture

```
┌─────────────┐        WebSocket + REST        ┌──────────────┐        ┌────────────────┐
│   Browser    │ ─────────────────────────────► │   FastAPI     │ ─────► │  PostgreSQL     │
│  (TanStack   │ ◄───────────────────────────── │   Backend     │ ◄───── │  (Render)       │
│   Start SPA) │                                 │   (Render)    │        └────────────────┘
└─────────────┘                                 └──────────────┘
     ▲
     │ getUserMedia (webcam)
     │
 device camera
```

Four-stage product loop, every page maps to one stage:

| Stage | Pages |
|---|---|
| Detect | Dashboard, Live Risk Monitor, Zone Risk Map |
| Understand | AI Fusion Insights, Permit Intelligence, Compliance |
| Act | Alert Center, Notifications |
| Prove it worked | Analytics, Reports, Audit Log |

---

## Tech Stack

**Backend**
- FastAPI + SQLAlchemy
- PostgreSQL in production (Render-managed), SQLite for local development, swappable via a single `DATABASE_URL` environment variable
- JWT authentication (`python-jose`, `passlib[bcrypt]`)
- WebSocket support for live updates
- `reportlab` for real PDF report generation
- Gmail SMTP for email delivery

**Frontend**
- TanStack Start + React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui
- React Query for data fetching and caching
- Deployed to Cloudflare Workers via the Nitro `cloudflare_module` preset and the Wrangler CLI

**Machine Learning**
- A two-stage weak-supervision pipeline: a hand-coded rules engine generates labels over simulated data, and an XGBoost classifier trains on those labels using engineered features, generalizing past the explicit rules

---

## Project Structure

```
fuseos/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app entrypoint, router registration
│   │   ├── seed.py                 # Demo data seeding script
│   │   ├── api/                    # Route handlers (one file per resource)
│   │   ├── auth/                   # JWT login, dependencies, role gating
│   │   ├── core/                   # Config (env var loading)
│   │   ├── database/               # SQLAlchemy models + engine/session
│   │   ├── services/               # Business logic: risk scoring, permit
│   │   │                           # conflict detection, audit logging, email
│   │   └── websocket/              # Live update broadcaster
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── routes/                 # One file per page (TanStack Router)
│   │   ├── components/             # Shared UI (layout, AI copilot, primitives)
│   │   └── lib/                    # API client, React Query hooks, auth
│   │                                # context, webcam context, toast bus
│   └── package.json
│
└── render.yaml                     # Render Blueprint: backend + Postgres together
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+ (or Bun)
- PostgreSQL, if you want to run against Postgres locally (optional, defaults to SQLite otherwise)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env              # fill in your own values, see table below
python -m app.seed                # seeds demo data
uvicorn app.main:app --reload --port 8000
```

Backend runs at `http://localhost:8000`. Confirm it's up:

```bash
curl http://localhost:8000/
# {"status":"FUSE.OS API running"}
```

### Frontend

```bash
cd frontend
bun install                       # or: npm install
bun run dev                       # or: npm run dev
```

Frontend runs at `http://localhost:5173` and talks to `http://localhost:8000` by default.

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | No | Defaults to `sqlite:///./fuseos.db`. Set to a Postgres connection string for production. |
| `SECRET_KEY` | Yes (production) | JWT signing key. Generate a real random value, don't reuse the local dev default. |
| `CORS_ORIGINS` | No | Defaults to `*`. Restrict to your deployed frontend origin in production if desired. |
| `SMTP_HOST` / `SMTP_PORT` | No | Defaults to `smtp.gmail.com` / `587`. |
| `SMTP_USER` / `SMTP_PASSWORD` | No | Gmail address and App Password (not your regular password). Without these, email sending is silently skipped and the app still works. |
| `ALERT_RECIPIENTS` | No | Comma-separated emails for critical/high severity alert notifications. |
| `APP_BASE_URL` | No | Your deployed frontend URL, used to build links inside outgoing emails. |
| `VITE_API_BASE_URL` (frontend, build-time) | No | Defaults to `http://localhost:8000`. Must be set before building for production, since Vite bakes it in at build time. |

A known limitation worth knowing before you deploy: some free hosting tiers (including Render's free web services) block or time out outbound SMTP connections. If `SMTP_USER`/`SMTP_PASSWORD` are set but email delivery fails, the app still creates the account or logs the event and surfaces the relevant data directly in the UI rather than losing the action.

---

## API Reference

All endpoints are prefixed `/api` unless noted. Full interactive docs are available at `/docs` (FastAPI's built-in Swagger UI) once the backend is running.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/login`, `POST /auth/change-password` |
| Dashboard | `GET /dashboard/summary` |
| Zones | `GET /zones`, `GET /zones/{id}` |
| Permits | `GET /permits` |
| Risk Events | `GET /risk-events`, `PATCH /risk-events/{id}/status` |
| Sensors | `GET /sensors` |
| Analytics | `GET /analytics/summary` |
| Compliance | `GET /compliance/gaps`, `GET /compliance/health` |
| Reports | `POST /reports/generate` (returns a real PDF) |
| Ingestion | `POST /ingest/risk-events`, `POST /ingest/permits`, `POST /ingest/gas-readings` |
| Settings | `/cameras`, `/data-sources`, `/risk-rules`, `/users`, `/notifications/recipients`, `/audit-log`, `/plant-config` (full CRUD where applicable) |
| Real-time | `WS /ws/live` |

---

## Data Model

Shared field-naming contract between the backend and the machine learning pipeline:

| Entity | Key fields |
|---|---|
| `zones` | id, name, sector |
| `permits` | id, type, zone_id, hazard_class, issuer, start_time, end_time, status |
| `gas_readings` | sensor_id, zone_id, gas_type, reading, unit, threshold, timestamp |
| `scada_readings` | equipment_id, zone_id, parameter, value, unit, timestamp |
| `shift_logs` | worker_id, role, zone_id, shift, shift_start, shift_end |
| `risk_events` | id, zone_id, risk_type, severity, confidence, contributing_signals, lead_time_minutes, description, status, timestamp |

---

## Machine Learning Pipeline

A two-stage weak-supervision approach:

1. **Rules engine**: hand-coded compound-risk rules (hot work + rising combustible gas, confined space + abnormal process reading, shift changeover + active high-hazard permit, coverage gap in a permitted zone, line break + rising VOC reading nearby) generate labels over simulated data.
2. **Trained classifier**: an XGBoost model trains on those labels using engineered features (gas reading trend, percentage of threshold, permit-zone overlap, SCADA anomaly flags, shift changeover flags, sensor coverage gaps), learning to generalize past the explicit rules.

Reported metrics: approximately 99.4% accuracy, a 100% catch rate, and a mean lead-time near 45 minutes before threshold breach on the evaluation/trial data used during development.

**Stated plainly**: because the classifier trains on labels the rules engine generated, high accuracy partly reflects how well it reproduces those rules. This is expected for weak supervision, but doesn't by itself prove generalization to compound patterns the rules never anticipated. Validation against a properly held-out test set was not independently reconfirmed before submission.

---

## Known Limitations

- **PPE/camera inference is not deployed live.** The frontend is fully wired for this signal (a dedicated tag, zone-level evidence, compliance entries, a live camera status page), but running the trained detection model (100MB+, alongside a second person-detection model) on a memory-constrained free hosting tier risked crashing the entire backend. This was deliberately deferred rather than risking a working, deployed system. It can be demonstrated running locally on request.
- **Email delivery depends on host and provider cooperation.** Some free-tier hosts block outbound SMTP. The app degrades gracefully if this happens (see Environment Variables above).
- **ML validation caveat.** See the Machine Learning Pipeline section above.
- **Cold starts.** The deployed backend sleeps after 15 minutes of inactivity on its free tier and takes 30 to 60 seconds to wake on the next request.

---

## Roadmap

- Live PPE/camera inference, once deployed on infrastructure sized for it
- Deeper shift-log signal usage, currently the least-developed of the five fused signals
- Multi-plant deployment, testing the shared data contract against a second, distinct facility

---

## License

[Add your chosen license here, MIT is a common default for hackathon submissions if you don't have a specific preference.]

---

## Acknowledgments

Built for the ET AI Hackathon 2026, Problem Statement 1 (AI-Powered Industrial Safety Intelligence for Zero-Harm Operations), by Dark Orbit.
