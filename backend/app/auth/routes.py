from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database import models
from app.auth.jwt_handler import verify_password, create_access_token, hash_password
from app.auth.dependencies import get_current_user
from app.services.audit_service import log_action

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Trim whitespace — a very common artifact when a password is copy-pasted
    # out of an HTML email table cell (trailing space/newline gets selected
    # along with it). Email is also case-normalized since addresses are
    # effectively case-insensitive and admins/users may type either case.
    email = form.username.strip().lower()
    password = form.password.strip()
    user = db.query(models.User).filter(models.User.email.ilike(email)).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    token = create_access_token({"sub": user.email, "role": user.role, "name": user.name})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"name": user.name, "email": user.email, "role": user.role},
    }


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
def change_password(payload: ChangePasswordIn, db: Session = Depends(get_db), current=Depends(get_current_user)):
    user = db.query(models.User).filter(models.User.email == current.get("sub")).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not verify_password(payload.current_password.strip(), user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")

    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    log_action(db, user.email, "Changed own password")
    return {"updated": True}
