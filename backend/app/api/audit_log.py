from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database import models

router = APIRouter(prefix="/api/audit-log", tags=["audit-log"])


@router.get("")
def list_audit_log(limit: int = 50, db: Session = Depends(get_db)):
    entries = (
        db.query(models.AuditLogEntry)
        .order_by(models.AuditLogEntry.timestamp.desc())
        .limit(limit)
        .all()
    )
    return [
        {"id": e.id, "actor": e.actor, "action": e.action, "timestamp": e.timestamp}
        for e in entries
    ]
