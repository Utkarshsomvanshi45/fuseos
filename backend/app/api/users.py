import secrets
from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database import models
from app.auth.jwt_handler import hash_password
from app.services.audit_service import log_action

router = APIRouter(prefix="/api/users", tags=["users"])


class InviteIn(BaseModel):
    name: str
    email: EmailStr
    role: str = "viewer"          # admin / operator / viewer
    department: str | None = None


@router.get("")
def list_users(db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    return [
        {"id": u.id, "name": u.name, "email": u.email, "role": u.role, "department": u.department}
        for u in users
    ]


@router.post("/invite")
def invite_user(payload: InviteIn, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        return {"error": "A user with this email already exists"}

    # Generates a temporary password. In a real deployment this would be
    # emailed to the invitee (reuse email_service.py's SMTP setup) rather
    # than returned in the API response.
    temp_password = secrets.token_urlsafe(9)
    new_user = models.User(
        name=payload.name, email=payload.email, role=payload.role,
        department=payload.department, hashed_password=hash_password(temp_password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    log_action(db, "Admin", f"Invited user {payload.email} ({payload.role})")
    return {
        "id": new_user.id, "name": new_user.name, "email": new_user.email,
        "role": new_user.role, "temp_password": temp_password,
    }


@router.delete("/{user_id}")
def remove_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return {"error": "not found"}
    email = user.email
    db.delete(user)
    db.commit()
    log_action(db, "Admin", f"Removed user {email}")
    return {"deleted": user_id}
