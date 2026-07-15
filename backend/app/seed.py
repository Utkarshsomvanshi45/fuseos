"""
Populates the DB with realistic demo data so backend + frontend can be built and
tested end-to-end right now, without waiting on the ml/ simulators.

Once ml/simulators are ready, this script gets replaced by an import step that
loads their actual output instead of this hand-written demo set. Keep the shapes
identical (see docs/data_schema.md) so swapping is a non-event.

Run with:  python -m app.seed
"""
import random
from datetime import datetime, timedelta
from app.database.database import SessionLocal, Base, engine
from app.database import models
from app.auth.jwt_handler import hash_password

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# wipe existing data for a clean reseed
for m in [models.RiskEvent, models.ShiftLog, models.ScadaReading, models.GasReading,
          models.Permit, models.Zone, models.User, models.ComplianceGap,
          models.Camera, models.DataSource, models.RiskRule, models.NotificationRecipient,
          models.AuditLogEntry, models.PlantConfig]:
    db.query(m).delete()
db.commit()

# --- demo user, matches the login screen ---
db.add(models.User(
    name="Ananya Rao", email="ananya.rao@ris.gov.in",
    hashed_password=hash_password("password123"),
    role="admin", department="Safety",
))
db.commit()

NOW = datetime(2026, 7, 10, 9, 45)

ZONES = [
    ("Z-A1", "Coke Oven Battery A", "Coke & Chemicals"),
    ("Z-A2", "Coke Oven Battery B", "Coke & Chemicals"),
    ("Z-B1", "By-Product Plant", "Coke & Chemicals"),
    ("Z-B2", "Tar Distillation", "Coke & Chemicals"),
    ("Z-B3", "Ammonia Storage", "Coke & Chemicals"),
    ("Z-C1", "BF-3 Cast House", "Iron Making"),
    ("Z-C2", "Stove Dome C", "Iron Making"),
    ("Z-D1", "Gas Holder Yard", "Utilities"),
    ("Z-D2", "BOF Converter Bay", "Steel Making"),
    ("Z-D3", "Power House 2", "Utilities"),
]
for zid, name, sector in ZONES:
    db.add(models.Zone(id=zid, name=name, sector=sector))
db.commit()

GAS_TYPES = {
    "GS-2211": ("CO", "Z-A1", 50), "GS-2212": ("H2S", "Z-A1", 10),
    "GS-2301": ("C6H6", "Z-B1", 5), "GS-2302": ("NH3", "Z-B3", 35),
    "GS-2401": ("CH4", "Z-D1", 40), "GS-2455": ("CH4", "Z-C1", 40),
}

# --- gas readings: mostly stable, a couple of zones trending toward danger ---
SPIKE_SENSORS = {"GS-2301": 0.96, "GS-2211": 0.84, "GS-2302": 0.80}  # target % of threshold
for sensor_id, (gas_type, zone_id, threshold) in GAS_TYPES.items():
    target_pct = SPIKE_SENSORS.get(sensor_id, random.uniform(0.1, 0.3))
    start_val = threshold * random.uniform(0.05, 0.15)
    end_val = threshold * target_pct
    for i in range(30):
        t = NOW - timedelta(minutes=(30 - i) * 3)
        progress = i / 29
        val = start_val + (end_val - start_val) * progress + random.uniform(-0.3, 0.3)
        db.add(models.GasReading(
            sensor_id=sensor_id, zone_id=zone_id, gas_type=gas_type,
            reading=round(max(val, 0), 2), unit="ppm", threshold=threshold, timestamp=t,
        ))
db.commit()

# --- SCADA readings ---
SCADA_POINTS = [
    ("SCADA-VENT-04", "Z-A1", "vent_fan_output", 62, "%"),
    ("SCADA-SLAG-01", "Z-C1", "slag_temp", 1512, "°C"),
    ("SCADA-VENT-01", "Z-B1", "vent_fan_output", 58, "%"),
]
for eid, zone_id, param, val, unit in SCADA_POINTS:
    db.add(models.ScadaReading(
        equipment_id=eid, zone_id=zone_id, parameter=param,
        value=val, unit=unit, timestamp=NOW,
    ))
db.commit()

# --- permits ---
PERMITS = [
    ("PTW-221", "Hot Work", "Z-A1", "Class II", "K. Mahato", -165, 300, "Active"),
    ("PTW-224", "Confined Space", "Z-B3", "Class I", "R. Iyer", -195, 120, "Active"),
    ("PTW-225", "Electrical", "Z-D2", "Class II", "S. Basu", -105, 480, "Active"),
    ("PTW-226", "Line Break", "Z-B1", "Class I", "A. Kulkarni", -45, 195, "Active"),
    ("PTW-227", "Working at Height", "Z-C1", "Class III", "V. Sharma", 15, 375, "Upcoming"),
    ("PTW-228", "Hot Work", "Z-A2", "Class II", "K. Mahato", 255, 615, "Upcoming"),
    ("PTW-218", "Radiography", "Z-C2", "Class I", "M. Rao", -700, -460, "Closed"),
]
for pid, ptype, zone_id, hclass, issuer, start_off, end_off, status in PERMITS:
    db.add(models.Permit(
        id=pid, type=ptype, zone_id=zone_id, hazard_class=hclass, issuer=issuer,
        start_time=NOW + timedelta(minutes=start_off),
        end_time=NOW + timedelta(minutes=end_off),
        status=status,
    ))
db.commit()

# --- shift logs ---
db.add(models.ShiftLog(worker_id="W-104", role="Operator", zone_id="Z-A1",
                        shift="Shift B", shift_start=NOW - timedelta(hours=3, minutes=45),
                        shift_end=NOW + timedelta(hours=4, minutes=15)))
db.add(models.ShiftLog(worker_id="W-118", role="Shift Superintendent", zone_id="Z-B1",
                        shift="Shift B", shift_start=NOW - timedelta(hours=3, minutes=45),
                        shift_end=NOW + timedelta(hours=4, minutes=15)))
db.commit()

# --- risk events: this is what the ml/ rules+model stage will eventually generate ---
RISK_EVENTS = [
    dict(id="RX-8841", zone_id="Z-B1", risk_type="Permit x Gas Threshold Convergence",
         severity="critical", confidence=94, contributing_signals=["permit", "sensor"],
         lead_time_minutes=27,
         description="Line-break permit PTW-226 opened while benzene sensor GS-2301 reads 96% of 5 ppm threshold.",
         status="new", timestamp=NOW - timedelta(minutes=3)),
    dict(id="RX-8840", zone_id="Z-A1", risk_type="Hot-Work + Rising CO",
         severity="high", confidence=88, contributing_signals=["permit", "sensor", "shift"],
         lead_time_minutes=41,
         description="PTW-221 hot work ongoing; CO climbed toward 84% of threshold over 40 min with active crew.",
         status="acknowledged", timestamp=NOW - timedelta(minutes=14)),
    dict(id="RX-8839", zone_id="Z-B3", risk_type="Confined Space x NH3 Trend",
         severity="high", confidence=82, contributing_signals=["permit", "sensor"],
         lead_time_minutes=55,
         description="NH3 trending up since PTW-224 start; confined space entry active.",
         status="new", timestamp=NOW - timedelta(minutes=27)),
    dict(id="RX-8838", zone_id="Z-C1", risk_type="Coverage Gap",
         severity="elevated", confidence=71, contributing_signals=["sensor"],
         lead_time_minutes=None,
         description="CH4 sensor GS-2455 offline 42 min during a permitted work window.",
         status="new", timestamp=NOW - timedelta(minutes=48)),
    dict(id="RX-8837", zone_id="Z-C1", risk_type="Slag Temp x Shift Changeover",
         severity="elevated", confidence=66, contributing_signals=["scada", "shift"],
         lead_time_minutes=18,
         description="Slag temp elevated during Alpha->Bravo handover window.",
         status="resolved", timestamp=NOW - timedelta(minutes=61)),
    dict(id="RX-8836", zone_id="Z-A2", risk_type="Upcoming Permit x Trending Gas",
         severity="low", confidence=58, contributing_signals=["permit", "sensor"],
         lead_time_minutes=252,
         description="PTW-228 hot work starts 14:00; CO in adjacent battery already climbing.",
         status="new", timestamp=NOW - timedelta(minutes=75)),
    dict(id="RX-8835", zone_id="Z-D2", risk_type="Multi-Permit Overlap",
         severity="low", confidence=55, contributing_signals=["permit", "scada"],
         lead_time_minutes=65,
         description="Electrical permit overlaps with O2-line maintenance window.",
         status="resolved", timestamp=NOW - timedelta(minutes=90)),
    dict(id="RX-8834", zone_id="Z-B1", risk_type="Sensor Drift",
         severity="low", confidence=61, contributing_signals=["sensor"],
         lead_time_minutes=None,
         description="Benzene sensor GS-2301 calibration drift 4% vs baseline.",
         status="acknowledged", timestamp=NOW - timedelta(minutes=105)),
]
for r in RISK_EVENTS:
    db.add(models.RiskEvent(**r))
db.commit()

# --- compliance gaps ---
GAPS = [
    ("Z-B3", "OISD-STD-105 §5.3.2", "OISD 105 Rev.4, 5.3.2",
     "Confined-space O2 re-check interval exceeded", -27),
    ("Z-A1", "Factory Act §41-C", "Factories Act 1948 §41-C",
     "Continuous H2S monitoring not logged for 22 min", -124),
    ("Z-A2", "OISD-GDN-192", "OISD-GDN-192 §7.1",
     "Hot-work permit issued without downwind gas check", -1440),
    ("Z-D1", "IS 5571 §4.2", "IS 5571:2007 §4.2",
     "Hazardous area classification review overdue", -2160),
    ("Z-B1", "OISD-STD-105 §6.1", "OISD 105 Rev.4, 6.1",
     "Line-break permit missing dual sign-off for Class I hazard", -3200),
    ("Z-C1", "DGMS Circular 12/2019", "DGMS Circular 12/2019 §3",
     "Cast house temperature log gap exceeds 1-hour SOP window", -4600),
    ("Z-D2", "Factory Act §36", "Factories Act 1948 §36",
     "Confined space entry register not updated for latest shift", -5800),
    ("Z-A1", "Factory Act §79", "Factories Act 1948 §79",
     "PPE non-compliance detected during active hot-work permit", -95),
]
for zone_id, ref, source, desc, offset in GAPS:
    db.add(models.ComplianceGap(
        zone_id=zone_id, regulation_ref=ref, source=source, description=desc,
        detected_at=NOW + timedelta(minutes=offset), status="open",
    ))
db.commit()

# --- cameras ---
CAMERAS = [
    ("BC_Load Area", "Z-A1", "online", -12),
    ("CRNCTL-CRNCTL", "Z-A2", "online", -8),
    ("Scrap Yard", "Z-B1", "online", -5),
    ("HR Slitting", "Z-B3", "online", -3),
    ("Main Security Gate", "Z-D1", "online", -1),
    ("Sinter Plant Gate", "Z-C1", "degraded", -140),
    ("Weight Bridge", "Z-D2", "online", -2),
    ("Trap Area", "Z-C2", "offline", -320),
]
for name, zone_id, status, offset in CAMERAS:
    db.add(models.Camera(
        name=name, zone_id=zone_id, status=status,
        last_frame_at=NOW + timedelta(minutes=offset), active=True,
    ))
db.commit()

# --- data sources ---
DATA_SOURCES = [
    ("Draeger Polytron Grid", "DS-GAS-01", "gas_sensors", "online", -1, True),
    ("ABB 800xA SCADA", "DS-SCADA", "scada", "online", -1, True),
    ("eSafety PTW System", "DS-PTW", "work_permits", "online", -1, True),
    ("Kronos Shift Roster", "DS-SHIFT", "shift_logs", "online", -6, True),
    ("Bosch CCTV Bridge", "DS-CCTV", "cctv", "online", -2, True),
    ("IMD Weather Feed", "DS-WEATHER", "weather", "online", -9, True),
]
for name, code, dtype, status, offset, enabled in DATA_SOURCES:
    db.add(models.DataSource(
        name=name, code=code, type=dtype, status=status,
        last_sync_at=NOW + timedelta(minutes=offset), enabled=enabled,
    ))
db.commit()

# --- risk rules ---
RULES = [
    ("R1", "Hot work + rising combustible gas", True, 78),
    ("R2", "Confined space + abnormal process reading", True, 84),
    ("R3", "Shift changeover + active high-hazard permit", True, 62),
    ("R4", "Line break + adjacent VOC threshold approach", True, 90),
    ("R5", "Coverage gap in permitted zone", True, 55),
]
for code, name, enabled, sensitivity in RULES:
    db.add(models.RiskRule(code=code, name=name, enabled=enabled, sensitivity=sensitivity))
db.commit()

# --- notification recipients ---
RECIPIENTS = [
    ("Ananya Rao", "Safety Head", "ananya.rao@ris.gov.in", True, True, True),
    ("Kunal Mahato", "Shift Super", "kunal.m@ris.gov.in", True, True, False),
    ("S. Basu", "Electrical Lead", "s.basu@ris.gov.in", True, False, False),
    ("M. Iqbal", "Compliance", "iqbal@ris.gov.in", True, False, False),
]
for name, role, email, ce, cs, cw in RECIPIENTS:
    db.add(models.NotificationRecipient(
        name=name, role=role, email=email,
        channel_email=ce, channel_sms=cs, channel_whatsapp=cw, enabled=True,
    ))
db.commit()

# --- plant config ---
db.add(models.PlantConfig())
db.commit()

# --- initial audit log entries ---
AUDIT_ENTRIES = [
    ("Ananya Rao", "Updated risk rule R2 sensitivity 80->84", -4),
    ("System", "Sensor GS-2455 marked offline", -36),
    ("Kunal Mahato", "Acknowledged event RX-8840", -77),
    ("Ananya Rao", "Invited user r.desh@ris.gov.in (Viewer)", -172),
    ("System", "Shift handover Alpha -> Bravo (Z-C1)", -225),
    ("Priya Nanda", "Closed permit PTW-218 (Radiography)", -237),
]
for actor, action, offset in AUDIT_ENTRIES:
    db.add(models.AuditLogEntry(actor=actor, action=action, timestamp=NOW + timedelta(minutes=offset)))
db.commit()

db.close()

print("Seed complete.")
