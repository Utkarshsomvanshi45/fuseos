"""Business logic for detecting whether a permit is currently in conflict
with plant conditions, based on open risk events in its zone."""
from sqlalchemy.orm import Session
from app.database import models


def check_permit_conflict(db: Session, permit: models.Permit) -> tuple[bool, str | None]:
    conflict_event = (
        db.query(models.RiskEvent)
        .filter(
            models.RiskEvent.zone_id == permit.zone_id,
            models.RiskEvent.status != "resolved",
        )
        .first()
    )
    if conflict_event and "permit" in (conflict_event.contributing_signals or []):
        return True, conflict_event.description
    return False, None
