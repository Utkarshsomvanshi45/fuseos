from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database import models
from app import schemas
from app.services.risk_service import compute_zone_risk

router = APIRouter(prefix="/api/zones", tags=["zones"])


@router.get("", response_model=list[schemas.ZoneOut])
def list_zones(db: Session = Depends(get_db)):
    zones = db.query(models.Zone).all()
    out = []
    for z in zones:
        score, level = compute_zone_risk(db, z.id)
        out.append(schemas.ZoneOut(id=z.id, name=z.name, sector=z.sector,
                                    risk_score=score, risk_level=level))
    return out


@router.get("/{zone_id}")
def get_zone_detail(zone_id: str, db: Session = Depends(get_db)):
    zone = db.query(models.Zone).filter(models.Zone.id == zone_id).first()
    if not zone:
        return {"error": "not found"}
    score, level = compute_zone_risk(db, zone_id)
    permits = db.query(models.Permit).filter(models.Permit.zone_id == zone_id).all()
    gas = (db.query(models.GasReading).filter(models.GasReading.zone_id == zone_id)
           .order_by(models.GasReading.timestamp.desc()).limit(5).all())
    events = (db.query(models.RiskEvent).filter(models.RiskEvent.zone_id == zone_id)
              .order_by(models.RiskEvent.timestamp.desc()).limit(10).all())
    return {
        "id": zone.id, "name": zone.name, "sector": zone.sector,
        "risk_score": score, "risk_level": level,
        "permits": [schemas.PermitOut.model_validate(p) for p in permits],
        "recent_gas_readings": [schemas.GasReadingOut.model_validate(g) for g in gas],
        "recent_events": [schemas.RiskEventOut.model_validate(e) for e in events],
    }
