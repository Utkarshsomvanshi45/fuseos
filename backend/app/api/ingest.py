"""
This is the join point between backend/ and ml/. Once your teammate's rules+model
pipeline produces risk events (see docs/data_schema.md for the exact shape), they
get POSTed here and loaded into the DB — replacing/supplementing the hand-seeded
demo data. The websocket broadcast means the frontend updates live, no refresh needed.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database import models
from app import schemas

router = APIRouter(prefix="/api/ingest", tags=["ingest"])


@router.post("/risk-events")
async def ingest_risk_events(events: list[schemas.RiskEventOut], db: Session = Depends(get_db)):
    """Accepts a batch of risk events (rules-engine or trained-model output) and
    upserts them into the DB. Broadcasts each new one over the websocket, and
    emails alert recipients for anything critical/high severity."""
    from app.websocket.manager import manager
    from app.services.email_service import send_alert_email
    from app.core.config import settings

    created = []
    for e in events:
        existing = db.query(models.RiskEvent).filter(models.RiskEvent.id == e.id).first()
        if existing:
            for field, value in e.model_dump().items():
                setattr(existing, field, value)
        else:
            db.add(models.RiskEvent(**e.model_dump()))
            created.append(e.id)
    db.commit()

    for e in events:
        await manager.broadcast({"type": "risk_event", "data": e.model_dump(mode="json")})
        if e.id in created and e.severity in settings.ALERT_MIN_SEVERITY and settings.ALERT_RECIPIENTS:
            send_alert_email(settings.ALERT_RECIPIENTS, e.model_dump(mode="json"))

    return {"ingested": len(events), "new": len(created)}


@router.post("/permits")
def ingest_permits(permits: list[schemas.PermitOut], db: Session = Depends(get_db)):
    for p in permits:
        existing = db.query(models.Permit).filter(models.Permit.id == p.id).first()
        data = {k: v for k, v in p.model_dump().items() if k in
                {"id", "type", "zone_id", "hazard_class", "issuer", "start_time", "end_time", "status"}}
        if existing:
            for field, value in data.items():
                setattr(existing, field, value)
        else:
            db.add(models.Permit(**data))
    db.commit()
    return {"ingested": len(permits)}


@router.post("/gas-readings")
def ingest_gas_readings(readings: list[schemas.GasReadingOut], db: Session = Depends(get_db)):
    for r in readings:
        db.add(models.GasReading(**r.model_dump()))
    db.commit()
    return {"ingested": len(readings)}
