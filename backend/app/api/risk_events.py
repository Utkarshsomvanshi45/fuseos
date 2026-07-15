from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database import models
from app import schemas

router = APIRouter(prefix="/api/risk-events", tags=["risk-events"])


@router.get("", response_model=list[schemas.RiskEventOut])
def list_risk_events(
    severity: str | None = None,
    zone_id: str | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    q = db.query(models.RiskEvent)
    if severity:
        q = q.filter(models.RiskEvent.severity == severity)
    if zone_id:
        q = q.filter(models.RiskEvent.zone_id == zone_id)
    events = q.order_by(models.RiskEvent.timestamp.desc()).limit(limit).all()
    return events


@router.patch("/{event_id}/status")
async def update_status(event_id: str, new_status: str, db: Session = Depends(get_db)):
    from app.websocket.manager import manager

    event = db.query(models.RiskEvent).filter(models.RiskEvent.id == event_id).first()
    if not event:
        return {"error": "not found"}
    event.status = new_status
    db.commit()
    await manager.broadcast({"type": "status_update", "id": event_id, "status": new_status})
    return {"id": event_id, "status": new_status}
