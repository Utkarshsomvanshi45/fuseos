from sqlalchemy import Column, String, Float, Integer, DateTime, JSON
from app.database.database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="operator")   # admin / operator / viewer
    department = Column(String, nullable=True)


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
