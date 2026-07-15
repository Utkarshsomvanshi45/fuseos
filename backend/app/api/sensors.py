"""
Read-only aggregation endpoint over GasReading rows. Not part of the original
backend spec — added so the frontend can show a live sensor snapshot (Dashboard,
Zone Risk Map, Live Risk Monitor) without pulling the full 1.5M-row raw table.
Groups by sensor_id, returns the latest reading plus a short trend (last 9
readings) for sparklines, and a naive "offline" flag if the sensor hasn't
reported in the last 30 minutes (relative to the most recent timestamp in the
dataset, same "now_ref" pattern used in api/dashboard.py).
"""
from datetime import timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database import models

router = APIRouter(prefix="/api/sensors", tags=["sensors"])


@router.get("")
def list_sensors(zone_id: str | None = None, db: Session = Depends(get_db)):
    latest_ts_row = db.query(models.GasReading.timestamp).order_by(
        models.GasReading.timestamp.desc()
    ).first()
    now_ref = latest_ts_row[0] if latest_ts_row else None
    offline_cutoff = (now_ref - timedelta(minutes=30)) if now_ref else None

    q = db.query(models.GasReading)
    if zone_id:
        q = q.filter(models.GasReading.zone_id == zone_id)
    readings = q.order_by(models.GasReading.timestamp.asc()).all()

    by_sensor: dict[str, list[models.GasReading]] = {}
    for r in readings:
        by_sensor.setdefault(r.sensor_id, []).append(r)

    out = []
    for sensor_id, rows in by_sensor.items():
        latest = rows[-1]
        trend = [round(r.reading, 2) for r in rows[-9:]]
        offline = bool(offline_cutoff and latest.timestamp < offline_cutoff)
        out.append({
            "id": sensor_id,
            "zone_id": latest.zone_id,
            "param": latest.gas_type,
            "reading": latest.reading,
            "unit": latest.unit,
            "threshold": latest.threshold,
            "timestamp": latest.timestamp,
            "trend": trend,
            "offline": offline,
        })
    out.sort(key=lambda s: s["id"])
    return out
