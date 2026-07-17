import secrets
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database import models
from app.auth.jwt_handler import hash_password
from app.auth.dependencies import get_current_user, require_admin
from app.services.audit_service import log_action
from app.services.email_service import send_invite_email

router = APIRouter(prefix="/api/users", tags=["users"])

VALID_ROLES = {"admin", "operator", "viewer"}

# Excludes visually-ambiguous characters (0/O, 1/l/I) and separators (-/_)
# that are easy to mis-transcribe or accidentally omit/duplicate when a
# temp password is read off a screen or copy-pasted out of an email.
TEMP_PASSWORD_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"


def generate_temp_password(length: int = 12) -> str:
    return "".join(secrets.choice(TEMP_PASSWORD_ALPHABET) for _ in range(length))


class InviteIn(BaseModel):
    name: str
    email: EmailStr
    role: str = "viewer"          # admin / operator / viewer
    department: str | None = None


@router.get("")
def list_users(db: Session = Depends(get_db), current=Depends(get_current_user)):
    # Any signed-in user can view the roster — only Admins can invite/remove.
    users = db.query(models.User).all()
    return [
        {"id": u.id, "name": u.name, "email": u.email, "role": u.role, "department": u.department}
        for u in users
    ]


@router.post("/invite")
def invite_user(payload: InviteIn, db: Session = Depends(get_db), current=Depends(require_admin)):
    role = payload.role.lower().strip()
    if role not in VALID_ROLES:
        return {"error": f"Invalid role '{payload.role}'. Must be one of: admin, operator, viewer."}

    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        return {"error": "A user with this email already exists"}

    temp_password = generate_temp_password()
    new_user = models.User(
        name=payload.name, email=payload.email, role=role,
        department=payload.department, hashed_password=hash_password(temp_password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    email_sent = send_invite_email(new_user.name, new_user.email, temp_password, role)

    log_action(db, current.get("sub", "Admin"),
               f"Invited user {payload.email} ({role})" + ("" if email_sent else " — email delivery failed"))

    return {
        "id": new_user.id, "name": new_user.name, "email": new_user.email,
        "role": new_user.role, "temp_password": temp_password, "email_sent": email_sent,
    }


@router.delete("/{user_id}")
def remove_user(user_id: int, db: Session = Depends(get_db), current=Depends(require_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return {"error": "not found"}

    if user.email == current.get("sub"):
        raise HTTPException(status_code=400, detail="You can't remove your own account while signed in.")

    if user.role == "admin":
        remaining_admins = db.query(models.User).filter(models.User.role == "admin").count()
        if remaining_admins <= 1:
            raise HTTPException(status_code=400, detail="Can't remove the last remaining Admin account.")

    email = user.email
    db.delete(user)
    db.commit()
    log_action(db, current.get("sub", "Admin"), f"Removed user {email}")
    return {"deleted": user_id}
