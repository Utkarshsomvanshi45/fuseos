from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database import models
from app.services.audit_service import log_action

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


class RecipientIn(BaseModel):
    name: str
    role: str | None = None
    email: EmailStr
    channel_email: bool = True
    channel_sms: bool = False
    channel_whatsapp: bool = False


class RecipientUpdateIn(BaseModel):
    channel_email: bool | None = None
    channel_sms: bool | None = None
    channel_whatsapp: bool | None = None
    enabled: bool | None = None


@router.get("/recipients")
def list_recipients(db: Session = Depends(get_db)):
    recipients = db.query(models.NotificationRecipient).all()
    return [
        {"id": r.id, "name": r.name, "role": r.role, "email": r.email,
         "channel_email": r.channel_email, "channel_sms": r.channel_sms,
         "channel_whatsapp": r.channel_whatsapp, "enabled": r.enabled}
        for r in recipients
    ]


@router.post("/recipients")
def add_recipient(payload: RecipientIn, db: Session = Depends(get_db)):
    new_recipient = models.NotificationRecipient(**payload.model_dump(), enabled=True)
    db.add(new_recipient)
    db.commit()
    db.refresh(new_recipient)
    log_action(db, "Admin", f"Added notification recipient {payload.email}")
    return {"id": new_recipient.id}


@router.patch("/recipients/{recipient_id}")
def update_recipient(recipient_id: int, payload: RecipientUpdateIn, db: Session = Depends(get_db)):
    r = db.query(models.NotificationRecipient).filter(models.NotificationRecipient.id == recipient_id).first()
    if not r:
        return {"error": "not found"}
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(r, field, value)
    db.commit()
    return {"id": recipient_id, "updated": True}


@router.delete("/recipients/{recipient_id}")
def remove_recipient(recipient_id: int, db: Session = Depends(get_db)):
    r = db.query(models.NotificationRecipient).filter(models.NotificationRecipient.id == recipient_id).first()
    if not r:
        return {"error": "not found"}
    email = r.email
    db.delete(r)
    db.commit()
    log_action(db, "Admin", f"Removed notification recipient {email}")
    return {"deleted": recipient_id}
