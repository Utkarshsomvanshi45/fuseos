from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database import models
from app.services.audit_service import log_action

router = APIRouter(prefix="/api/risk-rules", tags=["risk-rules"])


class RuleUpdateIn(BaseModel):
    enabled: bool | None = None
    sensitivity: int | None = None


@router.get("")
def list_rules(db: Session = Depends(get_db)):
    rules = db.query(models.RiskRule).all()
    return [
        {"id": r.id, "code": r.code, "name": r.name, "enabled": r.enabled, "sensitivity": r.sensitivity}
        for r in rules
    ]


@router.patch("/{rule_id}")
def update_rule(rule_id: int, payload: RuleUpdateIn, db: Session = Depends(get_db)):
    rule = db.query(models.RiskRule).filter(models.RiskRule.id == rule_id).first()
    if not rule:
        return {"error": "not found"}

    if payload.enabled is not None and payload.enabled != rule.enabled:
        rule.enabled = payload.enabled
        log_action(db, "Admin", f"{'Enabled' if payload.enabled else 'Disabled'} rule {rule.code}")

    if payload.sensitivity is not None and payload.sensitivity != rule.sensitivity:
        old = rule.sensitivity
        rule.sensitivity = payload.sensitivity
        log_action(db, "Admin", f"Updated risk rule {rule.code} sensitivity {old}->{payload.sensitivity}")

    db.commit()
    return {"id": rule_id, "enabled": rule.enabled, "sensitivity": rule.sensitivity}
