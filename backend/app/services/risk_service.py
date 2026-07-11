"""Business logic for deriving zone risk from open risk events.
Kept separate from api/zones.py so the logic is testable and reusable
(e.g. the websocket broadcaster can call this too)."""
from sqlalchemy.orm import Session
from app.database import models

SEVERITY_SCORE = {"critical": 90, "high": 70, "elevated": 45, "low": 15}
SEVERITY_ORDER = ["critical", "high", "elevated", "low", "normal"]


def compute_zone_risk(db: Session, zone_id: str) -> tuple[int, str]:
    events = (
        db.query(models.RiskEvent)
        .filter(models.RiskEvent.zone_id == zone_id, models.RiskEvent.status != "resolved")
        .all()
    )
    if not events:
        return 10, "normal"
    worst = min(events, key=lambda e: SEVERITY_ORDER.index(e.severity))
    return SEVERITY_SCORE.get(worst.severity, 10), worst.severity
