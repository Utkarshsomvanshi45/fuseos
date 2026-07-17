from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database.database import Base, engine
from app.api import (
    zones, permits, risk_events, dashboard, ingest, analytics, compliance, alerts_test,
    cameras, data_sources, risk_rules, users, notifications, audit_log, plant_config, sensors, reports,
)
from app.auth import routes as auth_routes
from app.websocket.manager import manager

Base.metadata.create_all(bind=engine)

app = FastAPI(title="FUSE.OS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(zones.router)
app.include_router(permits.router)
app.include_router(risk_events.router)
app.include_router(dashboard.router)
app.include_router(ingest.router)
app.include_router(analytics.router)
app.include_router(compliance.router)
app.include_router(alerts_test.router)
app.include_router(cameras.router)
app.include_router(data_sources.router)
app.include_router(risk_rules.router)
app.include_router(users.router)
app.include_router(notifications.router)
app.include_router(audit_log.router)
app.include_router(plant_config.router)
app.include_router(sensors.router)
app.include_router(reports.router)


@app.get("/")
def root():
    return {"status": "FUSE.OS API running"}


@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
