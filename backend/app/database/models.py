from sqlalchemy import Column, String, Float, Integer, DateTime, JSON, Boolean
from app.database.database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="operator")   # admin / operator / viewer
    department = Column(String, nullable=True)


class Camera(Base):
    __tablename__ = "cameras"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    zone_id = Column(String, nullable=False)
    status = Column(String, default="online")   # online / offline / degraded
    last_frame_at = Column(DateTime, nullable=True)
    active = Column(Boolean, default=True)
    # None = no real video source (status-only, honest placeholder in UI).
    # "webcam" = frontend renders a real getUserMedia() feed from this device's
    # camera — there's no camera hardware/RTSP in this system otherwise, so
    # this is the one genuinely real video source available.
    stream_source = Column(String, nullable=True)


class DataSource(Base):
    __tablename__ = "data_sources"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)          # e.g. "Draeger Polytron Grid"
    code = Column(String, nullable=False)           # e.g. "DS-GAS-01"
    type = Column(String, nullable=False)            # gas_sensors/scada/work_permits/shift_logs/cctv/weather
    status = Column(String, default="online")         # online / degraded / offline
    last_sync_at = Column(DateTime, nullable=True)
    enabled = Column(Boolean, default=True)


class RiskRule(Base):
    __tablename__ = "risk_rules"
    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String, nullable=False)           # e.g. "R1"
    name = Column(String, nullable=False)            # e.g. "Hot work + rising combustible gas"
    enabled = Column(Boolean, default=True)
    sensitivity = Column(Integer, default=75)         # 0-100


class NotificationRecipient(Base):
    __tablename__ = "notification_recipients"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=True)
    email = Column(String, nullable=False)
    channel_email = Column(Boolean, default=True)
    channel_sms = Column(Boolean, default=False)
    channel_whatsapp = Column(Boolean, default=False)
    enabled = Column(Boolean, default=True)


class AuditLogEntry(Base):
    __tablename__ = "audit_log"
    id = Column(Integer, primary_key=True, autoincrement=True)
    actor = Column(String, nullable=False)          # user name, or "System"
    action = Column(String, nullable=False)
    timestamp = Column(DateTime, nullable=False)


class PlantConfig(Base):
    __tablename__ = "plant_config"
    id = Column(Integer, primary_key=True, autoincrement=True)
    plant_name = Column(String, default="Rourkela Integrated Steelworks")
    plant_code = Column(String, default="RIS-01")
    timezone = Column(String, default="Asia/Kolkata (UTC+5:30)")
    language = Column(String, default="English (India)")
    shift_a_start = Column(String, default="22:00")
    shift_a_end = Column(String, default="06:00")
    shift_b_start = Column(String, default="06:00")
    shift_b_end = Column(String, default="14:00")
    shift_c_start = Column(String, default="14:00")
    shift_c_end = Column(String, default="22:00")


class ComplianceGap(Base):
    __tablename__ = "compliance_gaps"
    id = Column(Integer, primary_key=True, autoincrement=True)
    zone_id = Column(String, nullable=False)
    regulation_ref = Column(String, nullable=False)   # e.g. "OISD-STD-105 §5.3.2"
    source = Column(String, nullable=True)             # e.g. "OISD 105 Rev.4, 5.3.2"
    description = Column(String, nullable=False)
    detected_at = Column(DateTime, nullable=False)
    status = Column(String, default="open")            # open / resolved


class Zone(Base):
    __tablename__ = "zones"
    id = Column(String, primary_key=True)          # e.g. "Z-B1"
    name = Column(String, nullable=False)
    sector = Column(String, nullable=True)


class Permit(Base):
    __tablename__ = "permits"
    id = Column(String, primary_key=True)           # e.g. "PTW-226"
    type = Column(String, nullable=False)
    zone_id = Column(String, nullable=False)
    hazard_class = Column(String, nullable=True)
    issuer = Column(String, nullable=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    status = Column(String, nullable=False)          # Active / Upcoming / Closed


class GasReading(Base):
    __tablename__ = "gas_readings"
    id = Column(Integer, primary_key=True, autoincrement=True)
    sensor_id = Column(String, nullable=False)
    zone_id = Column(String, nullable=False)
    gas_type = Column(String, nullable=False)
    reading = Column(Float, nullable=False)
    unit = Column(String, default="ppm")
    threshold = Column(Float, nullable=False)
    timestamp = Column(DateTime, nullable=False)


class ScadaReading(Base):
    __tablename__ = "scada_readings"
    id = Column(Integer, primary_key=True, autoincrement=True)
    equipment_id = Column(String, nullable=False)
    zone_id = Column(String, nullable=False)
    parameter = Column(String, nullable=False)
    value = Column(Float, nullable=False)
    unit = Column(String, nullable=True)
    timestamp = Column(DateTime, nullable=False)


class ShiftLog(Base):
    __tablename__ = "shift_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    worker_id = Column(String, nullable=False)
    role = Column(String, nullable=True)
    zone_id = Column(String, nullable=False)
    shift = Column(String, nullable=False)
    shift_start = Column(DateTime, nullable=False)
    shift_end = Column(DateTime, nullable=False)


class RiskEvent(Base):
    __tablename__ = "risk_events"
    id = Column(String, primary_key=True)             # e.g. "RX-8841"
    zone_id = Column(String, nullable=False)
    risk_type = Column(String, nullable=False)
    severity = Column(String, nullable=False)          # critical/high/elevated/low
    confidence = Column(Integer, nullable=False)
    contributing_signals = Column(JSON, nullable=False)  # list[str]
    lead_time_minutes = Column(Integer, nullable=True)
    description = Column(String, nullable=False)
    status = Column(String, default="new")              # new/acknowledged/resolved
    timestamp = Column(DateTime, nullable=False)
