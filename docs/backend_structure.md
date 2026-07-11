# FUSE.OS Backend — File Structure

## Complete Layout

```
backend/
├── app/
│   ├── main.py                  ← FastAPI app, routers, CORS, WebSocket endpoint
│   ├── schemas.py                ← Pydantic request/response schemas
│   ├── seed.py                   ← Populates DB with demo data (stand-in for ml/ output)
│   │
│   ├── api/                      ← Route handlers (thin — logic lives in services/)
│   │   ├── dashboard.py            ← GET /api/dashboard/summary
│   │   ├── zones.py                ← GET /api/zones, /api/zones/{id}
│   │   ├── permits.py              ← GET /api/permits
│   │   └── risk_events.py          ← GET/PATCH /api/risk-events
│   │
│   ├── auth/
│   │   ├── routes.py               ← POST /api/auth/login
│   │   ├── jwt_handler.py          ← token creation/verification, password hashing
│   │   └── dependencies.py         ← get_current_user() — protects routes
│   │
│   ├── core/
│   │   └── config.py               ← loads .env settings (DB URL, secret key, CORS)
│   │
│   ├── database/
│   │   ├── database.py             ← SQLAlchemy engine + SessionLocal
│   │   └── models.py                ← All ORM table definitions
│   │
│   ├── services/                  ← Business logic layer, kept out of route handlers
│   │   ├── risk_service.py         ← computes a zone's current risk score/level
│   │   └── permit_service.py       ← detects if a permit is in live conflict
│   │
│   └── websocket/
│       └── manager.py              ← ConnectionManager singleton for live push updates
│
├── requirements.txt
└── .env.example                   ← copy to .env and fill in before running
```

## Why It's Organized This Way

- **`api/` stays thin** — route handlers just parse the request, call a service function, return
  the response. This is what makes `risk_service.py` reusable later (e.g. the WebSocket
  broadcaster can call `compute_zone_risk()` directly without going through an HTTP route).
- **`auth/` is fully separate** from `api/` because it has its own concerns (tokens, hashing) —
  other routers depend on it (via `dependencies.py`), not the other way around.
- **`core/config.py`** is the single place environment variables get read — nothing else in the
  codebase should call `os.getenv()` directly.
- **`database/`** holds both the connection setup and the table definitions together, since
  they change together.
- **`services/`** is where PS-1's actual "intelligence" logic lives on the backend side — as the
  `ml/` risk model matures, its output plugs in here, not into `api/`.

## Running It

```bash
cd backend
cp .env.example .env
pip install -r requirements.txt
python -m app.seed        # populates demo data
uvicorn app.main:app --reload --port 8000
```

Demo login: `ananya.rao@ris.gov.in` / `password123`

API docs (auto-generated): `http://localhost:8000/docs`
