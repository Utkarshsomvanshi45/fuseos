# FUSE.OS: Risk Fusion Engine

**AI-powered industrial safety intelligence that finds the dangerous combinations no single system catches**

Built for the ET AI Hackathon 2026 (Problem Statement 1) by team Dark Orbit.

> Isolated readings are normal. Combinations are what get missed.

[![Live Demo](https://img.shields.io/badge/Live_Demo-FUSE.OS-F59E0B?style=for-the-badge)](https://utkarshsomvanshi45-fuseos-frontend.utkarshsomvanshi.workers.dev)

![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=flat-square&logo=postgresql&logoColor=white)
![XGBoost](https://img.shields.io/badge/XGBoost-EC6B23?style=flat-square)
![WebSocket](https://img.shields.io/badge/WebSocket-Live-0EA5E9?style=flat-square)

FUSE.OS fuses gas sensor readings, SCADA data, work permits, shift logs, and PPE/camera signals into one live, per-zone risk picture. It detects dangerous *combinations* of signals in real time. Single-purpose plant systems (permit software, SCADA, gas monitoring) each watch only their own feed, so they are not built to catch these combinations.

---

## Live Demo

| | |
|---|---|
| **App** | https://utkarshsomvanshi45-fuseos-frontend.utkarshsomvanshi.workers.dev |
| **Demo login** | `ananya.rao@ris.gov.in` / `password123` |
| **API base** | https://fuseos-backend.onrender.com |

The demo runs on seeded, simulated plant data. The backend is on a free hosting tier that sleeps after 15 minutes of inactivity, so the first request after idle time can take 30 to 60 seconds. That delay is expected.

<!-- Add screenshots, then uncomment this block:
## Screenshots
| Dashboard | Zone Risk Map |
|---|---|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Zone map](docs/screenshots/zone-map.png) |
| Alert Center | Reports |
| ![Alerts](docs/screenshots/alerts.png) | ![Reports](docs/screenshots/reports.png) |
-->

---

## The Problem

In industrial accidents, the warning signs are often already in the data: a rising gas reading here, an active hot-work permit there, a shift handover in between. Each system sees only its own part, and nothing connects them into one decision in time.

FUSE.OS targets that gap. The problem is rarely a lack of sensors. It is a lack of correlation between the sensors a plant already has.

---

## What It Does

Everything below is implemented and works against the seeded demo data.

**Detect**
- Live compound-risk scoring per zone, computed from open risk events
- A plant-floor Zone Risk Map, color-coded by real-time risk score
- A Live Risk Monitor with the full signal stack per zone (sensors, permits, events)

**Understand**
- AI Fusion Insights: risk events with confidence and lead time
- Permit Intelligence: every permit re-scored against current zone conditions, with a plain-language conflict reason
- Compliance: gaps cited against standards (OISD, Factory Act, DGMS, IS 5571) and a computed compliance health score

**Act**
- Alert Center with an evidence chain per alert (which sensor, permit, and shift-log entry contributed)
- Real-time push over WebSocket, with no polling or manual refresh
- Email alerts on new critical and high severity events (Gmail SMTP)

**Prove it worked**
- Six generated PDF report types: daily risk summary, weekly compound risk, permit audit, compliance gap, data source health, monthly executive summary
- A full audit log of every mutating action
- Analytics for signal-type breakdown, zone comparison, and prediction lead time and confidence

**Administration**
- JWT authentication with role-based access control enforced at the API level (Admin, Operator, Viewer)
- Only Admins can invite or remove users, and the system refuses to remove its last remaining Admin
- Settings for cameras (including a browser webcam feed via `getUserMedia`), data sources, risk rules, notification recipients, and plant configuration

---

## Architecture

```
+-------------+      WebSocket + REST       +-------------+       +--------------+
|   Browser   | --------------------------> |   FastAPI   | ----> |  PostgreSQL  |
|  (TanStack  | <-------------------------- |   Backend   | <---- |   (Render)   |
|  Start SPA) |                             |  (Render)   |       +--------------+
+-------------+                             +-------------+
      ^
      | getUserMedia (webcam)
  device camera
```

Every page maps to one stage of a four-stage product loop:

| Stage | Pages |
|---|---|
| Detect | Dashboard, Live Risk Monitor, Zone Risk Map |
| Understand | AI Fusion Insights, Permit Intelligence, Compliance |
| Act | Alert Center, Notifications |
| Prove it worked | Analytics, Reports, Audit Log |

---

## Tech Stack

**Backend**
- FastAPI and SQLAlchemy
- PostgreSQL in production (Render), SQLite for local development
- JWT authentication (`python-jose`, `passlib[bcrypt]`)
- WebSocket live updates
- `reportlab` for PDF reports
- Gmail SMTP for email delivery

**Frontend**
- TanStack Start, React 19, TypeScript
- Tailwind CSS v4 and shadcn/ui
- React Query for data fetching and caching
- Deployed to Cloudflare Workers (Nitro `cloudflare_module` preset, Wrangler CLI)

**Machine learning**
- A two-stage weak-supervision pipeline: a hand-coded rules engine labels simulated data, and an XGBoost classifier trains on those labels using engineered features

---

## Project Structure

```
fuseos/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI entrypoint, router registration
│   │   ├── seed.py          # Demo data seeding
│   │   ├── api/             # Route handlers, one file per resource
│   │   ├── auth/            # JWT login, dependencies, role gating
│   │   ├── core/            # Config (env var loading)
│   │   ├── database/        # SQLAlchemy models, engine, session
│   │   ├── services/        # Risk scoring, permit conflicts, audit log, email
│   │   └── websocket/       # Live update broadcaster
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── routes/          # One file per page (TanStack Router)
│   │   ├── components/      # Layout, AI copilot, UI primitives
│   │   └── lib/             # API client, query hooks, auth and webcam context
│   └── package.json
└── render.yaml              # Render Blueprint: backend + Postgres
```

---

## API Reference

Endpoints are prefixed `/api` unless noted. The backend also serves interactive Swagger docs at `/docs`.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/login`, `POST /auth/change-password` |
| Dashboard | `GET /dashboard/summary` |
| Zones | `GET /zones`, `GET /zones/{id}` |
| Permits | `GET /permits` |
| Risk events | `GET /risk-events`, `PATCH /risk-events/{id}/status` |
| Sensors | `GET /sensors` |
| Analytics | `GET /analytics/summary` |
| Compliance | `GET /compliance/gaps`, `GET /compliance/health` |
| Reports | `POST /reports/generate` (returns a PDF) |
| Ingestion | `POST /ingest/risk-events`, `/ingest/permits`, `/ingest/gas-readings` |
| Settings | `/cameras`, `/data-sources`, `/risk-rules`, `/users`, `/notifications/recipients`, `/audit-log`, `/plant-config` |
| Real time | `WS /ws/live` |

---

## Data Model

The field-naming contract shared by the backend and the ML pipeline:

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

1. **Rules engine.** Hand-coded compound-risk rules generate labels over simulated data: hot work with rising combustible gas, a confined space with an abnormal process reading, a shift changeover during an active high-hazard permit, a coverage gap in a permitted zone, and a line break with a rising VOC reading nearby.
2. **Trained classifier.** An XGBoost model trains on those labels using engineered features (gas reading trend, percent of threshold, permit-zone overlap, SCADA anomaly flags, shift changeover flags, sensor coverage gaps), so it can generalize beyond the explicit rules.

On the simulated evaluation data used during development, the model reached about 99.4% accuracy, a 100% catch rate, and a mean lead time near 45 minutes before a threshold breach.

**Read these numbers carefully.** The classifier is trained on labels produced by the rules engine, so high accuracy partly shows how well it reproduces those rules. That is expected with weak supervision, but it does not by itself show that the model generalizes to compound patterns the rules never anticipated, and the data is simulated. A properly held-out validation was not independently reconfirmed before submission.

---

## Known Limitations

- **Simulated data.** The demo and all reported metrics use simulated plant data, not real plant readings.
- **PPE/camera inference is not deployed live.** The frontend is fully wired for this signal (a dedicated tag, zone-level evidence, compliance entries, a live camera status page), but running the trained detection model (100MB+) alongside a person-detection model on a memory-limited free tier risked crashing the whole backend, so it was deliberately deferred. It can be demonstrated locally.
- **Email delivery** depends on the host and provider allowing outbound SMTP.
- **ML validation caveat.** See the Machine Learning Pipeline section.
- **Cold starts.** The free-tier backend sleeps after 15 minutes idle and needs 30 to 60 seconds to wake.

---

## Roadmap

- Live PPE/camera inference on infrastructure sized for it
- Deeper use of shift-log signals, currently the least-developed of the five fused signals
- Multi-plant deployment, testing the shared data contract against a second facility

---

## Team and License

Built by team **Dark Orbit** for the ET AI Hackathon 2026, Problem Statement 1: AI-Powered Industrial Safety Intelligence for Zero-Harm Operations.

MIT License.

[Utkarsh Somvanshi](https://github.com/Utkarshsomvanshi45) · [Portfolio](https://utkarshsomvanshi.vercel.app) · [LinkedIn](https://www.linkedin.com/in/utkarsh-somvanshi-b4837132b)
