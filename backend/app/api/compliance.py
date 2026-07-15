from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database import models

router = APIRouter(prefix="/api/compliance", tags=["compliance"])


@router.get("/gaps")
def list_gaps(db: Session = Depends(get_db)):
    gaps = (
        db.query(models.ComplianceGap)
        .order_by(models.ComplianceGap.detected_at.desc())
        .all()
    )
    return [
        {
            "id": g.id, "zone_id": g.zone_id, "regulation_ref": g.regulation_ref,
            "source": g.source, "description": g.description,
            "detected_at": g.detected_at, "status": g.status,
        }
        for g in gaps
    ]


@router.get("/health")
def compliance_health(db: Session = Depends(get_db)):
    total = db.query(models.ComplianceGap).count()
    open_gaps = db.query(models.ComplianceGap).filter(models.ComplianceGap.status == "open").count()
    standards = len(set(
        g.regulation_ref.split(" ")[0].split("-")[0]
        for g in db.query(models.ComplianceGap).all()
    )) or 1
    coverage_pct = round(max(0, 100 - open_gaps * 2), 1)  # simple heuristic, refine later
    return {
        "coverage_pct": coverage_pct,
        "open_gaps": open_gaps,
        "total_gaps_tracked": total,
        "standards_referenced": standards,
    }
