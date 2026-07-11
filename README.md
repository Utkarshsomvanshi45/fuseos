# FUSE.OS — Compound Risk Intelligence Platform

ET AI Hackathon 2026 — Problem Statement 1: AI-Powered Industrial Safety Intelligence for Zero-Harm Operations

## What This Is

A platform that fuses gas sensor readings, SCADA data, work permits, and shift logs into a single
live risk picture — detecting dangerous *combinations* that no single data source would catch alone.

## Repo Structure

```
fuseos/
├── backend/        # FastAPI + PostgreSQL — APIs, DB models, WebSocket live updates
│   └── app/
│       ├── models/     # DB table definitions
│       ├── routers/    # API endpoints
│       └── services/   # business logic (risk model integration, alerting)
├── ml/              # Data simulation + compound risk detection + model training
│   ├── simulators/     # generates fake permits/sensors/SCADA/shift data
│   ├── notebooks/      # feature engineering + model training notebooks
│   └── models/         # saved trained model artifacts
├── frontend/        # React app (Lovable export, wired to real backend)
└── docs/            # architecture diagrams, data schema reference, deck assets
```

## Team Split

| Owner | Area |
|---|---|
| Utkarsh | `backend/`, `frontend/`, integration |
| Teammate | `ml/` |

## Data Contract

The exact shape of data passed between `ml/` and `backend/` is defined in `docs/data_schema.md`.
Both halves of the team build against this contract — read it before writing code that touches
zones, sensors, permits, shift logs, or risk events.

## Status

🚧 Build in progress — ET AI Hackathon Phase 2, submission deadline July 20, 2026.
