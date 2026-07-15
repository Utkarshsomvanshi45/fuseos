from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database import models
from app.services.audit_service import log_action

router = APIRouter(prefix="/api/plant-config", tags=["plant-config"])


class PlantConfigIn(BaseModel):
    plant_name: str | None = None
    plant_code: str | None = None
    timezone: str | None = None
    language: str | None = None
    shift_a_start: str | None = None
    shift_a_end: str | None = None
    shift_b_start: str | None = None
    shift_b_end: str | None = None
    shift_c_start: str | None = None
    shift_c_end: str | None = None


def _get_or_create(db: Session) -> models.PlantConfig:
    config = db.query(models.PlantConfig).first()
    if not config:
        config = models.PlantConfig()
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


@router.get("")
def get_config(db: Session = Depends(get_db)):
    c = _get_or_create(db)
    return {
        "plant_name": c.plant_name, "plant_code": c.plant_code,
        "timezone": c.timezone, "language": c.language,
        "shift_a_start": c.shift_a_start, "shift_a_end": c.shift_a_end,
        "shift_b_start": c.shift_b_start, "shift_b_end": c.shift_b_end,
        "shift_c_start": c.shift_c_start, "shift_c_end": c.shift_c_end,
    }


@router.patch("")
def update_config(payload: PlantConfigIn, db: Session = Depends(get_db)):
    c = _get_or_create(db)
    changes = payload.model_dump(exclude_none=True)
    for field, value in changes.items():
        setattr(c, field, value)
    db.commit()
    if changes:
        log_action(db, "Admin", f"Updated plant config: {', '.join(changes.keys())}")
    return {"updated": list(changes.keys())}
