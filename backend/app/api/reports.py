"""
Generates real PDF reports from live data for the Reports page. Six report
types, each backed by actual queries against the same tables every other
endpoint in this app uses — nothing here is synthesized text pretending to be
data. The one deliberately-labeled exception is the "System-Generated
Recommendations" section on the Daily Risk Summary, which is a template
applied to real risk events (not an LLM call), and is labeled as such rather
than implied to be live AI analysis.
"""
from datetime import datetime, timedelta, date
from io import BytesIO

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether,
)

from app.database.database import get_db
from app.database import models
from app.services.permit_service import check_permit_conflict
from app.services.risk_service import SEVERITY_ORDER

router = APIRouter(prefix="/api/reports", tags=["reports"])

BRAND = colors.HexColor("#0e7490")       # cyan-700, close to the app's primary accent
BRAND_LIGHT = colors.HexColor("#ecfeff")  # cyan-50
INK = colors.HexColor("#111827")
MUTED = colors.HexColor("#6b7280")
LINE = colors.HexColor("#e5e7eb")
CRITICAL = colors.HexColor("#dc2626")
HIGH = colors.HexColor("#ea580c")
ELEVATED = colors.HexColor("#ca8a04")
LOW = colors.HexColor("#16a34a")

SEV_HEX = {"critical": "#dc2626", "high": "#ea580c", "elevated": "#ca8a04", "low": "#16a34a", "normal": "#6b7280"}
SEV_COLOR = {k: colors.HexColor(v) for k, v in SEV_HEX.items()}
FLOOR_RANK = {"all": 5, "low": 3, "medium": 2, "high": 1, "critical": 0}


class ReportRequest(BaseModel):
    report_type: str          # daily_risk | weekly_compound | permit_audit | compliance_gap | data_source_health | monthly_executive
    date_from: str | None = None   # "YYYY-MM-DD"
    date_to: str | None = None
    zone_id: str | None = None     # None/"all" = every zone
    shift: str | None = None       # None/"all", "Shift A", "Shift B", "Shift C"
    severity_floor: str | None = None  # None/"all", "low", "medium", "high", "critical"


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------
def now_ref(db: Session) -> datetime:
    """Same pattern used elsewhere in this app: the seeded/simulated data has its
    own internal clock, so "now" is the latest timestamp actually in the data,
    not wall-clock time."""
    latest = db.query(models.GasReading.timestamp).order_by(models.GasReading.timestamp.desc()).first()
    return latest[0] if latest else datetime.utcnow()


def resolve_range(req: ReportRequest, ref: datetime) -> tuple[datetime, datetime, str]:
    if req.date_from and req.date_to:
        start = datetime.combine(date.fromisoformat(req.date_from), datetime.min.time())
        end = datetime.combine(date.fromisoformat(req.date_to), datetime.max.time())
        label = f"{req.date_from} to {req.date_to}"
        return start, end, label

    defaults = {
        "daily_risk": timedelta(days=1),
        "weekly_compound": timedelta(days=7),
        "permit_audit": timedelta(days=7),
        "compliance_gap": timedelta(days=30),
        "data_source_health": timedelta(days=7),
        "monthly_executive": timedelta(days=30),
    }
    span = defaults.get(req.report_type, timedelta(days=7))
    start = ref - span
    return start, ref, f"Last {span.days} day{'s' if span.days != 1 else ''} (to {ref.strftime('%Y-%m-%d')})"


def severity_ok(sev: str, floor: str | None) -> bool:
    floor = floor or "all"
    if floor == "all":
        return True
    try:
        rank = SEVERITY_ORDER.index(sev)
    except ValueError:
        rank = 99
    return rank <= FLOOR_RANK.get(floor, 5)


def zone_ok(zone_id: str, filt: str | None) -> bool:
    return not filt or filt == "all" or zone_id == filt


def minute_of_day(dt: datetime) -> int:
    return dt.hour * 60 + dt.minute


def shift_window(label: str, config: models.PlantConfig | None) -> tuple[int, int] | None:
    if not config:
        return None
    mapping = {
        "Shift A": (config.shift_a_start, config.shift_a_end),
        "Shift B": (config.shift_b_start, config.shift_b_end),
        "Shift C": (config.shift_c_start, config.shift_c_end),
    }
    pair = mapping.get(label)
    if not pair or not pair[0] or not pair[1]:
        return None
    try:
        sh, sm = [int(x) for x in pair[0].split(":")]
        eh, em = [int(x) for x in pair[1].split(":")]
        return sh * 60 + sm, eh * 60 + em
    except Exception:
        return None


def in_shift(dt: datetime, label: str, config: models.PlantConfig | None) -> bool:
    win = shift_window(label, config)
    if not win:
        return True  # can't determine — don't exclude
    start, end = win
    m = minute_of_day(dt)
    return (m >= start and m < end) if start < end else (m >= start or m < end)


def shift_ok(dt: datetime, filt: str | None, config: models.PlantConfig | None) -> bool:
    if not filt or filt == "all":
        return True
    return in_shift(dt, filt, config)


def zone_name_map(db: Session) -> dict[str, str]:
    return {z.id: z.name for z in db.query(models.Zone).all()}


def recommend_for_event(e: models.RiskEvent) -> str:
    """Builds a recommendation sentence from this specific event's actual
    contributing signals and severity, so recommendations vary by what
    actually triggered — not one boilerplate line repeated for every alert."""
    signals = set(e.contributing_signals or [])
    actions = []
    if "permit" in signals:
        actions.append("suspend or re-verify the active permit in this zone before any work continues")
    if "sensor" in signals or "scada" in signals:
        actions.append("dispatch a technician to confirm the reading at source rather than relying on the sensor alone")
    if "shift" in signals:
        actions.append("brief the incoming shift lead directly during handover, not just via the log")
    if "camera" in signals or "ppe" in signals:
        actions.append("confirm PPE compliance via the vision layer before allowing re-entry")
    if not actions:
        actions.append("re-verify current zone conditions before any further action")

    urgency = {
        "critical": "Immediate action required.",
        "high": "Action required this shift.",
        "elevated": "Review before next handover.",
        "low": "Log and monitor.",
    }.get(e.severity, "Review as appropriate.")

    return f"{urgency} {'; '.join(actions).capitalize()}."


# ---------------------------------------------------------------------------
# Styles
# ---------------------------------------------------------------------------
def build_styles():
    ss = getSampleStyleSheet()
    ss.add(ParagraphStyle("FTitle", parent=ss["Title"], textColor=INK, fontSize=20, spaceAfter=2))
    ss.add(ParagraphStyle("FSubtitle", parent=ss["Normal"], textColor=MUTED, fontSize=9.5, spaceAfter=10))
    ss.add(ParagraphStyle("FSection", parent=ss["Heading2"], textColor=BRAND, fontSize=13, spaceBefore=14, spaceAfter=6))
    ss.add(ParagraphStyle("FBody", parent=ss["Normal"], fontSize=9.5, leading=13.5, textColor=INK))
    ss.add(ParagraphStyle("FMuted", parent=ss["Normal"], fontSize=8.5, leading=12, textColor=MUTED))
    ss.add(ParagraphStyle("FCell", parent=ss["Normal"], fontSize=8.5, leading=11, textColor=INK))
    ss.add(ParagraphStyle("FCellRight", parent=ss["FCell"], alignment=TA_RIGHT))
    return ss


def header_block(ss, plant, title, subtitle, filters_line):
    return [
        Paragraph(title, ss["FTitle"]),
        Paragraph(subtitle, ss["FSubtitle"]),
        Table(
            [[Paragraph(f"<b>{plant.plant_name or 'FUSE.OS'}</b> · {plant.plant_code or ''}", ss["FCell"]),
              Paragraph(filters_line, ss["FCellRight"])]],
            colWidths=[95 * mm, 85 * mm],
            style=TableStyle([
                ("LINEBELOW", (0, 0), (-1, 0), 1, BRAND),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
                ("TOPPADDING", (0, 0), (-1, 0), 4),
            ]),
        ),
        Spacer(1, 10),
    ]


def kpi_row(ss, items: list[tuple[str, str]]):
    cells = []
    for label, value in items:
        cells.append(Table(
            [[Paragraph(value, ParagraphStyle("v", parent=ss["FBody"], fontSize=16, textColor=BRAND, alignment=1))],
             [Paragraph(label.upper(), ParagraphStyle("l", parent=ss["FMuted"], fontSize=7, alignment=1))]],
            colWidths=[(180 * mm) / max(len(items), 1)],
            style=TableStyle([
                ("BOX", (0, 0), (-1, -1), 0.5, LINE),
                ("BACKGROUND", (0, 0), (-1, -1), BRAND_LIGHT),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]),
        ))
    row = Table([cells], colWidths=None, style=TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 2), ("RIGHTPADDING", (0, 0), (-1, -1), 2)]))
    return row


def data_table(ss, header: list[str], rows: list[list], col_widths=None):
    data = [[Paragraph(f"<b>{h}</b>", ParagraphStyle("h", parent=ss["FCell"], textColor=colors.white)) for h in header]]
    for r in rows:
        data.append([c if isinstance(c, Paragraph) else Paragraph(str(c), ss["FCell"]) for c in r])
    t = Table(data, colWidths=col_widths, repeatRows=1)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), BRAND),
        ("LINEBELOW", (0, 0), (-1, 0), 1, BRAND),
        ("GRID", (0, 1), (-1, -1), 0.4, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            style.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#f9fafb")))
    t.setStyle(TableStyle(style))
    return t


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.line(20 * mm, 15 * mm, 190 * mm, 15 * mm)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(20 * mm, 10 * mm, "FUSE.OS — Risk Fusion Engine · Generated report, not a substitute for on-site verification")
    canvas.drawRightString(190 * mm, 10 * mm, f"Page {doc.page}")
    canvas.restoreState()


# ---------------------------------------------------------------------------
# Report builders — each returns a list of flowables
# ---------------------------------------------------------------------------
def build_daily_risk(db: Session, req: ReportRequest, ss, plant, start, end, zmap):
    story = []
    events_q = db.query(models.RiskEvent).filter(
        models.RiskEvent.timestamp >= start, models.RiskEvent.timestamp <= end
    )
    events = [e for e in events_q.all() if zone_ok(e.zone_id, req.zone_id)
              and severity_ok(e.severity, req.severity_floor)
              and shift_ok(e.timestamp, req.shift, plant)]
    events.sort(key=lambda e: SEVERITY_ORDER.index(e.severity))

    permits = db.query(models.Permit).all()
    conflicted = []
    for p in permits:
        if not zone_ok(p.zone_id, req.zone_id):
            continue
        conflict, reason = check_permit_conflict(db, p)
        if conflict:
            conflicted.append((p, reason))

    readings = db.query(models.GasReading).filter(
        models.GasReading.timestamp >= start, models.GasReading.timestamp <= end
    ).all()
    breaches = [r for r in readings if r.reading >= r.threshold and zone_ok(r.zone_id, req.zone_id)]

    shift_logs = db.query(models.ShiftLog).filter(
        models.ShiftLog.shift_start <= end, models.ShiftLog.shift_end >= start
    ).all()
    if req.zone_id and req.zone_id != "all":
        shift_logs = [s for s in shift_logs if s.zone_id == req.zone_id]
    if req.shift and req.shift != "all":
        shift_logs = [s for s in shift_logs if s.shift == req.shift]

    story.append(kpi_row(ss, [
        ("Compound alerts", str(len([e for e in events if len(e.contributing_signals or []) >= 2]))),
        ("Total alerts", str(len(events))),
        ("Permit conflicts", str(len(conflicted))),
        ("Sensor breaches", str(len(breaches))),
    ]))

    story.append(Paragraph("Compound-Risk Alerts", ss["FSection"]))
    if events:
        rows = [[e.id, zmap.get(e.zone_id, e.zone_id), e.risk_type,
                  Paragraph(f'<font color="{SEV_HEX.get(e.severity, "#6b7280")}"><b>{e.severity.upper()}</b></font>', ss["FCell"]),
                  f"{e.confidence}%", e.timestamp.strftime("%d %b %H:%M")]
                 for e in events[:40]]
        story.append(data_table(ss, ["ID", "Zone", "Risk type", "Severity", "Conf.", "Time"], rows,
                                 col_widths=[22*mm, 24*mm, 46*mm, 22*mm, 16*mm, 24*mm]))
    else:
        story.append(Paragraph("No alerts matched these filters in this period.", ss["FMuted"]))

    story.append(Paragraph("Permit Conflicts Flagged", ss["FSection"]))
    if conflicted:
        rows = [[p.id, zmap.get(p.zone_id, p.zone_id), p.type, Paragraph(reason or "", ss["FCell"])] for p, reason in conflicted[:20]]
        story.append(data_table(ss, ["Permit", "Zone", "Type", "Conflict reason"], rows,
                                 col_widths=[22*mm, 24*mm, 32*mm, 76*mm]))
    else:
        story.append(Paragraph("No permit conflicts detected.", ss["FMuted"]))

    story.append(Paragraph("Sensor Threshold Breaches", ss["FSection"]))
    if breaches:
        rows = [[r.sensor_id, zmap.get(r.zone_id, r.zone_id), r.gas_type, f"{r.reading} {r.unit}",
                  f"{r.threshold} {r.unit}", r.timestamp.strftime("%d %b %H:%M")] for r in breaches[:30]]
        story.append(data_table(ss, ["Sensor", "Zone", "Gas", "Reading", "Threshold", "Time"], rows,
                                 col_widths=[22*mm, 22*mm, 20*mm, 26*mm, 26*mm, 24*mm]))
    else:
        story.append(Paragraph("No threshold breaches in this period.", ss["FMuted"]))

    story.append(Paragraph("Shift Handover Observations", ss["FSection"]))
    if shift_logs:
        rows = [[s.worker_id, s.role or "—", zmap.get(s.zone_id, s.zone_id), s.shift,
                  s.shift_start.strftime("%H:%M"), s.shift_end.strftime("%H:%M")] for s in shift_logs[:25]]
        story.append(data_table(ss, ["Worker", "Role", "Zone", "Shift", "Start", "End"], rows,
                                 col_widths=[24*mm, 30*mm, 24*mm, 24*mm, 18*mm, 18*mm]))
    else:
        story.append(Paragraph("No shift log entries in this period.", ss["FMuted"]))

    story.append(Paragraph("System-Generated Recommendations", ss["FSection"]))
    story.append(Paragraph(
        "Template-derived from the alerts above, not a live AI analysis — included as a starting checklist for the shift handover.",
        ss["FMuted"]))
    story.append(Spacer(1, 4))
    if events:
        for e in events[:6]:
            story.append(Paragraph(
                f"• <b>{e.zone_id} — {e.risk_type}</b>: {recommend_for_event(e)} "
                f"({e.confidence}% confidence, {len(e.contributing_signals or [])} contributing signal(s))",
                ss["FBody"]))
    else:
        story.append(Paragraph("No recommendations — no alerts in this period.", ss["FMuted"]))

    return story


def build_weekly_compound(db: Session, req: ReportRequest, ss, plant, start, end, zmap):
    story = []
    events = [e for e in db.query(models.RiskEvent).filter(
        models.RiskEvent.timestamp >= start, models.RiskEvent.timestamp <= end).all()
        if zone_ok(e.zone_id, req.zone_id) and severity_ok(e.severity, req.severity_floor)
        and shift_ok(e.timestamp, req.shift, plant)]
    compound = [e for e in events if len(e.contributing_signals or []) >= 2]

    by_type: dict[str, int] = {}
    by_zone: dict[str, int] = {}
    for e in compound:
        by_type[e.risk_type] = by_type.get(e.risk_type, 0) + 1
        by_zone[e.zone_id] = by_zone.get(e.zone_id, 0) + 1

    lead_times = [e.lead_time_minutes for e in compound if e.lead_time_minutes]
    avg_lead = round(sum(lead_times) / len(lead_times), 1) if lead_times else 0
    confidences = [e.confidence for e in compound]
    avg_conf = round(sum(confidences) / len(confidences), 1) if confidences else 0

    story.append(kpi_row(ss, [
        ("Compound events", str(len(compound))),
        ("Zones affected", str(len(by_zone))),
        ("Avg lead-time", f"{avg_lead} min"),
        ("Avg confidence", f"{avg_conf}%"),
    ]))

    story.append(Paragraph("Trend by Risk Type", ss["FSection"]))
    if by_type:
        rows = [[t, str(c)] for t, c in sorted(by_type.items(), key=lambda x: -x[1])]
        story.append(data_table(ss, ["Risk type", "Occurrences"], rows, col_widths=[140*mm, 40*mm]))
    else:
        story.append(Paragraph("No compound-risk events in this period.", ss["FMuted"]))

    story.append(Paragraph("Trend by Zone", ss["FSection"]))
    if by_zone:
        rows = [[zmap.get(z, z), str(c)] for z, c in sorted(by_zone.items(), key=lambda x: -x[1])]
        story.append(data_table(ss, ["Zone", "Occurrences"], rows, col_widths=[140*mm, 40*mm]))
    else:
        story.append(Paragraph("No zone data for this period.", ss["FMuted"]))

    story.append(Paragraph("Detected Events — Detail", ss["FSection"]))
    if compound:
        rows = [[e.id, zmap.get(e.zone_id, e.zone_id), e.risk_type, e.severity.upper(),
                  ", ".join(e.contributing_signals or []), e.timestamp.strftime("%d %b")] for e in compound[:40]]
        story.append(data_table(ss, ["ID", "Zone", "Type", "Sev.", "Signals", "Date"], rows,
                                 col_widths=[20*mm, 20*mm, 36*mm, 18*mm, 46*mm, 20*mm]))

    story.append(Paragraph("Active Rule Context", ss["FSection"]))
    rules = db.query(models.RiskRule).all()
    story.append(Paragraph(
        "Risk events above are grouped by observed risk-type and signal combination. Individual events don't "
        "carry a stored rule-ID, so this section lists the rules currently enabled as context for the trend above, "
        "rather than claiming a direct per-event attribution the data doesn't support.", ss["FMuted"]))
    story.append(Spacer(1, 4))
    rows = [[r.code, r.name, "Enabled" if r.enabled else "Disabled", f"{r.sensitivity}%"] for r in rules]
    story.append(data_table(ss, ["Code", "Rule", "Status", "Sensitivity"], rows, col_widths=[24*mm, 100*mm, 30*mm, 26*mm]))
    return story


def build_permit_audit(db: Session, req: ReportRequest, ss, plant, start, end, zmap):
    story = []
    permits = [p for p in db.query(models.Permit).filter(
        models.Permit.start_time <= end, models.Permit.end_time >= start).all()
        if zone_ok(p.zone_id, req.zone_id) and shift_ok(p.start_time, req.shift, plant)]

    rows_full = []
    conflicts = 0
    for p in permits:
        conflict, reason = check_permit_conflict(db, p)
        if conflict:
            conflicts += 1
        rows_full.append((p, conflict, reason))

    story.append(kpi_row(ss, [
        ("Permits in period", str(len(permits))),
        ("Active", str(len([p for p in permits if p.status == "Active"]))),
        ("Closed", str(len([p for p in permits if p.status == "Closed"]))),
        ("Flagged / conflict", str(conflicts)),
    ]))

    story.append(Paragraph("Permit Register", ss["FSection"]))
    if rows_full:
        rows = [[p.id, zmap.get(p.zone_id, p.zone_id), p.type, p.hazard_class or "—", p.issuer or "—",
                  p.status, "Yes" if c else "No"] for p, c, _ in rows_full[:60]]
        story.append(data_table(ss, ["Permit", "Zone", "Type", "Hazard", "Issuer", "Status", "Conflict"], rows,
                                 col_widths=[20*mm, 18*mm, 30*mm, 22*mm, 32*mm, 20*mm, 20*mm]))
    else:
        story.append(Paragraph("No permits in this period.", ss["FMuted"]))

    flagged = [(p, r) for p, c, r in rows_full if c]
    story.append(Paragraph("Flagged Permit Detail", ss["FSection"]))
    if flagged:
        rows = [[p.id, zmap.get(p.zone_id, p.zone_id), Paragraph(r or "", ss["FCell"])] for p, r in flagged[:30]]
        story.append(data_table(ss, ["Permit", "Zone", "Conflict reason"], rows, col_widths=[24*mm, 24*mm, 112*mm]))
    else:
        story.append(Paragraph("No flagged permits in this period.", ss["FMuted"]))
    return story


def build_compliance_gap(db: Session, req: ReportRequest, ss, plant, start, end, zmap):
    story = []
    gaps = [g for g in db.query(models.ComplianceGap).filter(
        models.ComplianceGap.detected_at >= start, models.ComplianceGap.detected_at <= end).all()
        if zone_ok(g.zone_id, req.zone_id)]

    open_gaps = [g for g in gaps if g.status == "open"]
    standards = len(set(g.regulation_ref.split(" ")[0].split("-")[0] for g in gaps)) if gaps else 0

    story.append(kpi_row(ss, [
        ("Gaps detected", str(len(gaps))),
        ("Open", str(len(open_gaps))),
        ("Resolved", str(len(gaps) - len(open_gaps))),
        ("Standards referenced", str(standards)),
    ]))

    story.append(Paragraph("Detected Gaps", ss["FSection"]))
    if gaps:
        rows = [[g.regulation_ref, zmap.get(g.zone_id, g.zone_id), Paragraph(g.description, ss["FCell"]),
                  g.status, g.detected_at.strftime("%d %b %Y")] for g in gaps[:50]]
        story.append(data_table(ss, ["Regulation", "Zone", "Description", "Status", "Detected"], rows,
                                 col_widths=[32*mm, 18*mm, 76*mm, 20*mm, 24*mm]))
    else:
        story.append(Paragraph("No compliance gaps detected in this period.", ss["FMuted"]))
    return story


def build_data_source_health(db: Session, req: ReportRequest, ss, plant, start, end, zmap):
    story = []
    sources = db.query(models.DataSource).all()
    online = len([s for s in sources if s.status == "online"])

    story.append(kpi_row(ss, [
        ("Sources tracked", str(len(sources))),
        ("Online", str(online)),
        ("Degraded/Offline", str(len(sources) - online)),
    ]))

    story.append(Paragraph("Connector Status", ss["FSection"]))
    if sources:
        rows = [[s.name, s.code, s.type, s.status, "Yes" if s.enabled else "No",
                  s.last_sync_at.strftime("%d %b %H:%M") if s.last_sync_at else "—"] for s in sources]
        story.append(data_table(ss, ["Source", "Code", "Type", "Status", "Enabled", "Last sync"], rows,
                                 col_widths=[38*mm, 22*mm, 26*mm, 22*mm, 18*mm, 30*mm]))

    story.append(Paragraph("Sensor Read Coverage", ss["FSection"]))
    readings = db.query(models.GasReading).filter(
        models.GasReading.timestamp >= start, models.GasReading.timestamp <= end).all()
    by_sensor: dict[str, list] = {}
    for r in readings:
        if zone_ok(r.zone_id, req.zone_id):
            by_sensor.setdefault(r.sensor_id, []).append(r)
    ref = now_ref(db)
    rows = []
    for sid, rs in sorted(by_sensor.items()):
        latest = max(rs, key=lambda r: r.timestamp)
        gap_min = round((ref - latest.timestamp).total_seconds() / 60)
        rows.append([sid, zmap.get(latest.zone_id, latest.zone_id), str(len(rs)),
                      latest.timestamp.strftime("%d %b %H:%M"), f"{gap_min} min ago" if gap_min > 0 else "current"])
    if rows:
        story.append(data_table(ss, ["Sensor", "Zone", "Readings in period", "Last reading", "Data age"], rows,
                                 col_widths=[26*mm, 26*mm, 34*mm, 34*mm, 30*mm]))
    else:
        story.append(Paragraph("No sensor readings in this period.", ss["FMuted"]))
    return story


def build_monthly_executive(db: Session, req: ReportRequest, ss, plant, start, end, zmap):
    story = []
    events = [e for e in db.query(models.RiskEvent).filter(
        models.RiskEvent.timestamp >= start, models.RiskEvent.timestamp <= end).all()
        if zone_ok(e.zone_id, req.zone_id) and severity_ok(e.severity, req.severity_floor)]
    compound = [e for e in events if len(e.contributing_signals or []) >= 2]
    permits = [p for p in db.query(models.Permit).filter(
        models.Permit.start_time <= end, models.Permit.end_time >= start).all() if zone_ok(p.zone_id, req.zone_id)]
    conflicts = sum(1 for p in permits if check_permit_conflict(db, p)[0])
    gaps = [g for g in db.query(models.ComplianceGap).filter(
        models.ComplianceGap.detected_at >= start, models.ComplianceGap.detected_at <= end).all()
        if zone_ok(g.zone_id, req.zone_id)]
    open_gaps = len([g for g in gaps if g.status == "open"])
    zones_at_risk = len(set(e.zone_id for e in events if e.severity in ("critical", "high", "elevated")))

    lead_times = [e.lead_time_minutes for e in events if e.lead_time_minutes]
    avg_lead = round(sum(lead_times) / len(lead_times), 1) if lead_times else 0

    story.append(Paragraph("Executive Summary", ss["FSection"]))
    story.append(Paragraph(
        f"Over the reporting period, the fusion engine logged <b>{len(events)}</b> risk events "
        f"({len(compound)} compound, i.e. ≥2 correlated signals) across <b>{zones_at_risk}</b> zone(s) "
        f"at elevated risk or above. <b>{conflicts}</b> permit(s) were flagged for live conflicts against "
        f"active risk conditions, and <b>{open_gaps}</b> compliance gap(s) remain open of {len(gaps)} detected. "
        f"Average prediction lead-time across events was <b>{avg_lead} minutes</b>.",
        ss["FBody"]))
    story.append(Spacer(1, 8))

    story.append(kpi_row(ss, [
        ("Risk events", str(len(events))),
        ("Compound events", str(len(compound))),
        ("Zones at risk", str(zones_at_risk)),
        ("Avg lead-time", f"{avg_lead} min"),
    ]))
    story.append(Spacer(1, 6))
    story.append(kpi_row(ss, [
        ("Permits in period", str(len(permits))),
        ("Permit conflicts", str(conflicts)),
        ("Compliance gaps", str(len(gaps))),
        ("Open gaps", str(open_gaps)),
    ]))

    story.append(Paragraph("Severity Breakdown", ss["FSection"]))
    sev_counts: dict[str, int] = {}
    for e in events:
        sev_counts[e.severity] = sev_counts.get(e.severity, 0) + 1
    if sev_counts:
        rows = [[s.upper(), str(sev_counts.get(s, 0))] for s in SEVERITY_ORDER if sev_counts.get(s)]
        story.append(data_table(ss, ["Severity", "Count"], rows, col_widths=[140*mm, 40*mm]))
    else:
        story.append(Paragraph("No risk events in this period.", ss["FMuted"]))

    story.append(Paragraph("Top Zones by Risk Volume", ss["FSection"]))
    zone_counts: dict[str, int] = {}
    for e in events:
        zone_counts[e.zone_id] = zone_counts.get(e.zone_id, 0) + 1
    if zone_counts:
        rows = [[zmap.get(z, z), str(c)] for z, c in sorted(zone_counts.items(), key=lambda x: -x[1])[:10]]
        story.append(data_table(ss, ["Zone", "Events"], rows, col_widths=[140*mm, 40*mm]))
    else:
        story.append(Paragraph("No zone activity in this period.", ss["FMuted"]))

    return story


BUILDERS = {
    "daily_risk": ("Daily Risk Summary", "Every alert, every zone, every signal — the day at a glance.", build_daily_risk),
    "weekly_compound": ("Weekly Compound Risk Report", "Trend analysis of correlated risks, with rule context.", build_weekly_compound),
    "permit_audit": ("Permit Audit Report", "Every permit issued, closed, or flagged during the period.", build_permit_audit),
    "compliance_gap": ("Compliance Gap Report", "Regulatory deviations with cited sources.", build_compliance_gap),
    "data_source_health": ("Data Source Health Report", "Sensor/SCADA/PTW connector uptime and read coverage.", build_data_source_health),
    "monthly_executive": ("Monthly Executive Summary", "Roll-up of risk posture, incidents, and lead-time.", build_monthly_executive),
}


@router.post("/generate")
def generate_report(req: ReportRequest, db: Session = Depends(get_db)):
    if req.report_type not in BUILDERS:
        return {"error": f"Unknown report_type '{req.report_type}'"}

    title, subtitle, builder = BUILDERS[req.report_type]
    plant = db.query(models.PlantConfig).first()
    ref = now_ref(db)
    start, end, period_label = resolve_range(req, ref)
    zmap = zone_name_map(db)

    ss = build_styles()
    filters_bits = [period_label]
    if req.zone_id and req.zone_id != "all":
        filters_bits.append(f"Zone {req.zone_id}")
    else:
        filters_bits.append("All zones")
    filters_bits.append(req.shift if req.shift and req.shift != "all" else "All shifts")
    filters_bits.append(f"{(req.severity_floor or 'all').title()}+ severity" if (req.severity_floor or "all") != "all" else "All severities")
    filters_line = " · ".join(filters_bits)

    story = header_block(ss, plant, title, subtitle, filters_line)
    story += builder(db, req, ss, plant, start, end, zmap)
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        f"Generated {ref.strftime('%d %b %Y, %H:%M')} · FUSE.OS Risk Fusion Engine",
        ss["FMuted"]))

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm, topMargin=16 * mm, bottomMargin=20 * mm,
        title=title,
    )
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    buf.seek(0)

    filename = f"fuseos-{req.report_type}-{ref.strftime('%Y%m%d')}.pdf"
    return StreamingResponse(
        buf, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
