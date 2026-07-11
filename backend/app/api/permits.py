from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database import models
from app import schemas
from app.services.permit_service import check_permit_conflict

router = APIRouter(prefix="/api/permits", tags=["permits"])


@router.get("", response_model=list[schemas.PermitOut])
def list_permits(status: str | None = None, db: Session = Depends(get_db)):
    q = db.query(models.Permit)
    if status:
        q = q.filter(models.Permit.status == status)
    permits = q.all()
    out = []
    for p in permits:
        conflict, reason = check_permit_conflict(db, p)
        out.append(schemas.PermitOut(
            id=p.id, type=p.type, zone_id=p.zone_id, hazard_class=p.hazard_class,
            issuer=p.issuer, start_time=p.start_time, end_time=p.end_time,
            status=p.status, conflict=conflict, conflict_reason=reason,
        ))
    return out
