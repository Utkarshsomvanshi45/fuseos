from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class ZoneOut(BaseModel):
    id: str
    name: str
    sector: Optional[str] = None
    risk_score: int = 0
    risk_level: str = "normal"

    class Config:
        from_attributes = True


class PermitOut(BaseModel):
    id: str
    type: str
    zone_id: str
    hazard_class: Optional[str]
    issuer: Optional[str]
    start_time: datetime
    end_time: datetime
    status: str
    conflict: bool = False
    conflict_reason: Optional[str] = None

    class Config:
        from_attributes = True


class GasReadingOut(BaseModel):
    sensor_id: str
    zone_id: str
    gas_type: str
    reading: float
    unit: str
    threshold: float
    timestamp: datetime

    class Config:
        from_attributes = True


class RiskEventOut(BaseModel):
    id: str
    zone_id: str
    risk_type: str
    severity: str
    confidence: int
    contributing_signals: List[str]
    lead_time_minutes: Optional[int]
    description: str
    status: str
    timestamp: datetime

    class Config:
        from_attributes = True


class DashboardSummary(BaseModel):
    active_compound_risks: int
    open_permit_conflicts: int
    zones_at_elevated_risk: int
    avg_lead_time_minutes: float
    sensors_online: int
    sensors_total: int
    permits_active_today: int
