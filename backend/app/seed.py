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
          models.Permit, models.Zone, models.User]:
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
]
for r in RISK_EVENTS:
    db.add(models.RiskEvent(**r))
db.commit()
db.close()

print("Seed complete.")
