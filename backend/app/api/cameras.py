from datetime import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database import models
from app.services.audit_service import log_action

router = APIRouter(prefix="/api/cameras", tags=["cameras"])


class CameraIn(BaseModel):
    name: str
    zone_id: str
    stream_source: str | None = None  # None or "webcam"


class CameraToggle(BaseModel):
    active: bool


@router.get("")
def list_cameras(db: Session = Depends(get_db)):
    cameras = db.query(models.Camera).all()
    return [
        {"id": c.id, "name": c.name, "zone_id": c.zone_id, "status": c.status,
         "last_frame_at": c.last_frame_at, "active": c.active, "stream_source": c.stream_source}
        for c in cameras
    ]


@router.post("")
def add_camera(camera: CameraIn, db: Session = Depends(get_db)):
    new_cam = models.Camera(
        name=camera.name, zone_id=camera.zone_id, stream_source=camera.stream_source,
        status="online", last_frame_at=datetime.utcnow(), active=True,
    )
    db.add(new_cam)
    db.commit()
    db.refresh(new_cam)
    log_action(db, "Admin", f"Added camera {camera.name} ({camera.zone_id})")
    return {"id": new_cam.id, "name": new_cam.name}


@router.patch("/{camera_id}/toggle")
def toggle_camera(camera_id: int, payload: CameraToggle, db: Session = Depends(get_db)):
    cam = db.query(models.Camera).filter(models.Camera.id == camera_id).first()
    if not cam:
        return {"error": "not found"}
    cam.active = payload.active
    db.commit()
    log_action(db, "Admin", f"{'Enabled' if payload.active else 'Disabled'} camera {cam.name}")
    return {"id": camera_id, "active": payload.active}


@router.delete("/{camera_id}")
def remove_camera(camera_id: int, db: Session = Depends(get_db)):
    cam = db.query(models.Camera).filter(models.Camera.id == camera_id).first()
    if not cam:
        return {"error": "not found"}
    db.delete(cam)
    db.commit()
    log_action(db, "Admin", f"Removed camera {cam.name}")
    return {"deleted": camera_id}
