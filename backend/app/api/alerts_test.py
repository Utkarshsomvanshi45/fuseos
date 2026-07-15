from fastapi import APIRouter
from fastapi.responses import HTMLResponse
from app.services.email_service import render_alert_email, send_alert_email
from app.core.config import settings

router = APIRouter(prefix="/api/alerts", tags=["alerts"])

SAMPLE_EVENT = {
    "id": "RX-8841",
    "zone_id": "Z-B1",
    "risk_type": "Permit x Gas Threshold Convergence",
    "severity": "critical",
    "confidence": 94,
    "contributing_signals": ["permit", "sensor"],
    "lead_time_minutes": 27,
    "description": "Line-break permit PTW-226 opened while benzene sensor GS-2301 reads 96% of 5 ppm threshold.",
}


@router.get("/preview", response_class=HTMLResponse)
def preview_alert_email():
    """Open this in a browser to see exactly what the alert email looks like,
    without needing to actually send one."""
    return render_alert_email(SAMPLE_EVENT)


@router.post("/test-send")
def test_send_alert():
    """Sends the sample alert to whatever's in ALERT_RECIPIENTS — use this to
    confirm SMTP is configured correctly."""
    if not settings.ALERT_RECIPIENTS:
        return {"error": "No ALERT_RECIPIENTS configured in .env"}
    ok = send_alert_email(settings.ALERT_RECIPIENTS, SAMPLE_EVENT)
    return {"sent": ok, "recipients": settings.ALERT_RECIPIENTS}
