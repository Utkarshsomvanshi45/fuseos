from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database import models
from app import schemas

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=schemas.DashboardSummary)
def summary(db: Session = Depends(get_db)):
    open_events = db.query(models.RiskEvent).filter(models.RiskEvent.status != "resolved").all()
    active_compound = [e for e in open_events if len(e.contributing_signals or []) >= 2]
    permit_conflicts = [e for e in open_events if "permit" in (e.contributing_signals or [])]

    zones = db.query(models.Zone).all()
    elevated_zone_ids = set()
    for e in open_events:
        if e.severity in ("critical", "high", "elevated"):
            elevated_zone_ids.add(e.zone_id)

    lead_times = [e.lead_time_minutes for e in open_events if e.lead_time_minutes]
    avg_lead = sum(lead_times) / len(lead_times) if lead_times else 0.0

    total_sensors = db.query(models.GasReading.sensor_id).distinct().count()
    # "online" = reported a reading in the last hour (using the max timestamp in the dataset
    # as "now", since this is simulated/historical data, not live wall-clock data)
    latest_ts = db.query(models.GasReading.timestamp).order_by(
        models.GasReading.timestamp.desc()
    ).first()
    now_ref = latest_ts[0] if latest_ts else datetime.utcnow()
    cutoff = now_ref - timedelta(hours=1)
    online_sensors = (
        db.query(models.GasReading.sensor_id)
        .filter(models.GasReading.timestamp >= cutoff)
        .distinct()
        .count()
    )

    permits_active = db.query(models.Permit).filter(models.Permit.status == "Active").count()

    return schemas.DashboardSummary(
        active_compound_risks=len(active_compound),
        open_permit_conflicts=len(permit_conflicts),
        zones_at_elevated_risk=len(elevated_zone_ids),
        avg_lead_time_minutes=round(avg_lead, 1),
        sensors_online=online_sensors,
        sensors_total=total_sensors,
        permits_active_today=permits_active,
    )
