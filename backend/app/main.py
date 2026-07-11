from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database.database import Base, engine
from app.api import zones, permits, risk_events, dashboard
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
