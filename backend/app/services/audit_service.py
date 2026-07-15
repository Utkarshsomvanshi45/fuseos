"""Shared helper for writing to the audit log — used by any endpoint that
performs a meaningful config/system change (per the Settings > Audit Log tab)."""
from datetime import datetime
from sqlalchemy.orm import Session
from app.database import models


def log_action(db: Session, actor: str, action: str):
    entry = models.AuditLogEntry(actor=actor, action=action, timestamp=datetime.utcnow())
    db.add(entry)
    db.commit()
