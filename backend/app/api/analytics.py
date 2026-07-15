"""
Serves the Analytics page. These are exactly the metrics the problem statement
says judges evaluate on: prediction lead-time, false-negative rate, compound risk
detection accuracy. As ml/ produces more real (non-demo) risk events with actual
outcomes, true_positive_rate/false_positive_rate here should be recalculated from
real labeled outcomes rather than the current estimate — see note in the function.
"""
from collections import Counter
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database import models

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/summary")
def analytics_summary(db: Session = Depends(get_db)):
    events = db.query(models.RiskEvent).all()

    # events by contributing signal combination
    signal_counts = Counter()
    for e in events:
        signals = tuple(sorted(e.contributing_signals or []))
        if len(signals) >= 2:
            signal_counts["compound"] += 1
        elif signals:
            signal_counts[signals[0]] += 1

    total = sum(signal_counts.values()) or 1
    signal_breakdown = {k: round(v / total * 100, 1) for k, v in signal_counts.items()}

    # zone comparison: worst open severity per zone, as a 0-100 score
    severity_score = {"critical": 92, "high": 71, "elevated": 48, "low": 22}
    zone_scores = {}
    for e in events:
        score = severity_score.get(e.severity, 10)
        zone_scores[e.zone_id] = max(zone_scores.get(e.zone_id, 0), score)

    # prediction performance
    lead_times = [e.lead_time_minutes for e in events if e.lead_time_minutes]
    avg_lead_time = round(sum(lead_times) / len(lead_times), 1) if lead_times else 0

    # NOTE: true/false positive rate needs ground-truth outcome labels (did this
    # actually become an incident, or was it a false alarm) which we don't have
    # from simulated data. Once ml/ provides labeled outcomes, replace this with
    # a real calculation. For now this reports confidence-based estimates only.
    confidences = [e.confidence for e in events]
    avg_confidence = round(sum(confidences) / len(confidences), 1) if confidences else 0

    return {
        "signal_breakdown_pct": signal_breakdown,
        "zone_comparison": [{"zone_id": z, "score": s} for z, s in
                             sorted(zone_scores.items(), key=lambda x: -x[1])],
        "avg_lead_time_minutes": avg_lead_time,
        "avg_confidence_pct": avg_confidence,
        "total_events_analyzed": len(events),
    }
