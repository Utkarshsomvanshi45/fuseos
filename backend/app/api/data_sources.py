from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database import models
from app.services.audit_service import log_action

router = APIRouter(prefix="/api/data-sources", tags=["data-sources"])


class ToggleIn(BaseModel):
    enabled: bool


@router.get("")
def list_data_sources(db: Session = Depends(get_db)):
    sources = db.query(models.DataSource).all()
    return [
        {"id": s.id, "name": s.name, "code": s.code, "type": s.type,
         "status": s.status, "last_sync_at": s.last_sync_at, "enabled": s.enabled}
        for s in sources
    ]


@router.patch("/{source_id}/toggle")
def toggle_source(source_id: int, payload: ToggleIn, db: Session = Depends(get_db)):
    src = db.query(models.DataSource).filter(models.DataSource.id == source_id).first()
    if not src:
        return {"error": "not found"}
    src.enabled = payload.enabled
    db.commit()
    log_action(db, "Admin", f"{'Enabled' if payload.enabled else 'Disabled'} data source {src.name}")
    return {"id": source_id, "enabled": payload.enabled}
