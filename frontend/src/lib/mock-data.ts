// Realistic-looking mock data for FUSE.OS
export type Severity = "critical" | "high" | "medium" | "low" | "normal";

export const PLANT = {
  name: "Rourkela Integrated Steelworks",
  code: "RIS-01",
  sector: "Sector 4 · Coke & Chemicals",
  timezone: "Asia/Kolkata",
};

export const ZONES = [
  { id: "Z-A1", name: "Coke Oven Battery A",    risk: "high" as Severity,    x: 40,  y: 60,  w: 220, h: 120, desc: "Hot-work zone, elevated CO drift" },
  { id: "Z-A2", name: "Coke Oven Battery B",    risk: "medium" as Severity,  x: 280, y: 60,  w: 220, h: 120, desc: "Nominal, gas trending up" },
  { id: "Z-B1", name: "By-Product Plant",       risk: "critical" as Severity,x: 40,  y: 200, w: 180, h: 140, desc: "Benzene sensor spike + active permit" },
  { id: "Z-B2", name: "Tar Distillation",       risk: "low" as Severity,     x: 240, y: 200, w: 180, h: 140, desc: "Nominal" },
  { id: "Z-B3", name: "Ammonia Storage",        risk: "high" as Severity,    x: 440, y: 200, w: 160, h: 140, desc: "NH3 leak trend, confined-space permit" },
  { id: "Z-C1", name: "BF-3 Cast House",        risk: "medium" as Severity,  x: 620, y: 60,  w: 200, h: 140, desc: "Slag runner temp elevated" },
  { id: "Z-C2", name: "Stove Dome C",           risk: "normal" as Severity,  x: 620, y: 220, w: 200, h: 120, desc: "Stable" },
  { id: "Z-D1", name: "Gas Holder Yard",        risk: "low" as Severity,     x: 40,  y: 360, w: 260, h: 100, desc: "Purge in progress" },
  { id: "Z-D2", name: "BOF Converter Bay",      risk: "medium" as Severity,  x: 320, y: 360, w: 260, h: 100, desc: "Oxygen line maintenance" },
  { id: "Z-D3", name: "Power House 2",          risk: "normal" as Severity,  x: 600, y: 360, w: 220, h: 100, desc: "Stable, all sensors online" },
];

export const SENSORS = [
  { id: "GS-2211", type: "gas", param: "CO",    zone: "Z-A1", reading: 42,  unit: "ppm", threshold: 50, trend: [22,25,28,30,33,36,38,40,42] },
  { id: "GS-2212", type: "gas", param: "H2S",   zone: "Z-A1", reading: 6,   unit: "ppm", threshold: 10, trend: [3,3,4,4,5,5,6,6,6] },
  { id: "GS-2301", type: "gas", param: "C6H6",  zone: "Z-B1", reading: 4.8, unit: "ppm", threshold: 5,  trend: [1.2,1.4,2.1,2.8,3.4,3.9,4.3,4.6,4.8] },
  { id: "GS-2302", type: "gas", param: "NH3",   zone: "Z-B3", reading: 28,  unit: "ppm", threshold: 35, trend: [12,14,16,18,20,22,24,26,28] },
  { id: "TS-1104", type: "temp",param: "SlagT", zone: "Z-C1", reading: 1512,unit: "°C",  threshold: 1550,trend: [1490,1495,1498,1502,1505,1508,1510,1512,1512] },
  { id: "PS-0450", type: "pressure",param:"O2 Line",zone:"Z-D2",reading:8.2,unit:"bar", threshold: 10, trend:[7.8,7.9,8.0,8.1,8.1,8.2,8.2,8.2,8.2] },
  { id: "GS-2455", type: "gas", param: "CH4",   zone: "Z-D1", reading: 12,  unit: "ppm", threshold: 40, trend: [8,9,10,11,11,12,12,12,12], offline: true },
  { id: "TS-1105", type: "temp",param: "StoveT",zone:"Z-C2",  reading: 1180,unit: "°C",  threshold: 1300,trend:[1170,1172,1175,1178,1178,1180,1180,1180,1180] },
];

export const PERMITS = [
  { id: "PTW-221", type: "Hot Work",         zone: "Z-A1", hazard: "Class II", start: "07:00", end: "15:00", issuer: "K. Mahato",   status: "active",   conflict: true,  conflictReason: "CO rising 18% in 40m near active hot-work perimeter" },
  { id: "PTW-224", type: "Confined Space",   zone: "Z-B3", hazard: "Class I",  start: "06:30", end: "12:30", issuer: "R. Iyer",     status: "active",   conflict: true,  conflictReason: "NH3 trend +130% since permit start; O2 last checked 3h ago" },
  { id: "PTW-225", type: "Electrical",       zone: "Z-D2", hazard: "Class II", start: "08:00", end: "18:00", issuer: "S. Basu",     status: "active",   conflict: false },
  { id: "PTW-226", type: "Line Break",       zone: "Z-B1", hazard: "Class I",  start: "09:00", end: "13:00", issuer: "A. Kulkarni", status: "active",   conflict: true,  conflictReason: "Benzene at 96% of threshold in same zone" },
  { id: "PTW-227", type: "Working at Height",zone: "Z-C1", hazard: "Class III",start: "10:00", end: "16:00", issuer: "V. Sharma",   status: "active",   conflict: false },
  { id: "PTW-228", type: "Hot Work",         zone: "Z-A2", hazard: "Class II", start: "14:00", end: "20:00", issuer: "K. Mahato",   status: "upcoming", conflict: false },
  { id: "PTW-229", type: "Excavation",       zone: "Z-D1", hazard: "Class III",start: "13:00", end: "17:00", issuer: "P. Nanda",    status: "upcoming", conflict: false },
  { id: "PTW-218", type: "Radiography",      zone: "Z-C2", hazard: "Class I",  start: "02:00", end: "06:00", issuer: "M. Rao",      status: "closed",   conflict: false },
];

export const SHIFTS = [
  { worker: "Team Alpha (12)", role: "Furnace Ops",    zone: "Z-C1", start: "06:00", end: "14:00" },
  { worker: "Team Bravo (8)",  role: "Maintenance",    zone: "Z-A1", start: "07:00", end: "15:00" },
  { worker: "Team Delta (6)",  role: "By-Product",     zone: "Z-B1", start: "06:00", end: "14:00" },
  { worker: "Team Echo (4)",   role: "Instrumentation",zone: "Z-D2", start: "08:00", end: "18:00" },
];

export type SignalKind = "permit"|"sensor"|"scada"|"shift"|"camera"|"ppe";

export type RiskEvent = {
  id: string;
  ts: string;
  zone: string;
  type: string;
  signals: SignalKind[];
  severity: Severity;
  confidence: number;
  leadTime: string;
  status: "new"|"acknowledged"|"resolved";
  reason: string;
};

export const RISK_EVENTS: RiskEvent[] = [
  { id: "RX-8841", ts: "09:42", zone: "Z-B1", type: "Permit × Gas Threshold Convergence",     signals:["permit","sensor"],               severity:"critical", confidence:0.94, leadTime:"27 min", status:"new",         reason:"Line-break permit PTW-226 opened while benzene at 96% of 5 ppm threshold." },
  { id: "RX-8840", ts: "09:31", zone: "Z-A1", type: "Hot-Work + Rising CO + PPE Gap",         signals:["permit","sensor","shift","ppe"], severity:"high",     confidence:0.88, leadTime:"41 min", status:"acknowledged",reason:"PTW-221 hot work ongoing; CO climbed 22→42 ppm over 40 min. 2 crew flagged for missing face-shield at 09:28." },
  { id: "RX-8839", ts: "09:18", zone: "Z-B3", type: "Confined Space × NH3 Trend",             signals:["permit","sensor"],               severity:"high",     confidence:0.82, leadTime:"55 min", status:"new",         reason:"NH3 up 130% since PTW-224 start. Last O2 check 3h old vs 1h SOP." },
  { id: "RX-8842", ts: "09:07", zone: "Z-C1", type: "PPE Non-Compliance × Active Hot-Work",   signals:["ppe","permit","camera"],         severity:"medium",   confidence:0.79, leadTime:"—",      status:"new",         reason:"Helmet not worn detected on 1 worker in cast-house during PTW-227 working-at-height. Cam CAM-05." },
  { id: "RX-8838", ts: "08:57", zone: "Z-D1", type: "Coverage Gap",                            signals:["sensor"],                        severity:"medium",   confidence:0.71, leadTime:"—",      status:"new",         reason:"CH4 sensor GS-2455 offline 42 min during purge." },
  { id: "RX-8837", ts: "08:44", zone: "Z-C1", type: "Slag Temp × Shift Changeover",            signals:["scada","shift"],                 severity:"medium",   confidence:0.66, leadTime:"18 min", status:"resolved",    reason:"Slag temp 1512°C during Alpha→Bravo handover window." },
  { id: "RX-8836", ts: "08:12", zone: "Z-A2", type: "Upcoming Permit × Trending Gas",          signals:["permit","sensor"],               severity:"low",      confidence:0.58, leadTime:"4h 12m", status:"new",         reason:"PTW-228 hot work starts 14:00; CO in adjacent battery already climbing." },
  { id: "RX-8835", ts: "07:48", zone: "Z-D2", type: "Multi-Permit Overlap",                    signals:["permit","scada"],                severity:"low",      confidence:0.55, leadTime:"1h 05m", status:"resolved",    reason:"Electrical permit overlaps with O2-line maintenance window." },
  { id: "RX-8834", ts: "07:22", zone: "Z-B1", type: "Sensor Drift",                            signals:["sensor"],                        severity:"low",      confidence:0.61, leadTime:"—",      status:"acknowledged",reason:"Benzene sensor GS-2301 calibration drift 4% vs baseline." },
];

export const CAMERAS = [
  { id: "CAM-01", name: "Coke Oven A · North Deck",   zone: "Z-A1", status: "online" as const,   lastFrame: "2 s ago",  ppe: 94 },
  { id: "CAM-02", name: "Coke Oven B · South Rail",   zone: "Z-A2", status: "online" as const,   lastFrame: "3 s ago",  ppe: 97 },
  { id: "CAM-03", name: "By-Product Plant · Vent",    zone: "Z-B1", status: "degraded" as const, lastFrame: "41 s ago", ppe: 88 },
  { id: "CAM-04", name: "Ammonia Storage · Yard",     zone: "Z-B3", status: "online" as const,   lastFrame: "1 s ago",  ppe: 92 },
  { id: "CAM-05", name: "BF-3 Cast Floor",            zone: "Z-C1", status: "online" as const,   lastFrame: "2 s ago",  ppe: 81 },
  { id: "CAM-06", name: "Gas Holder Yard · East",     zone: "Z-D1", status: "offline" as const,  lastFrame: "18 m ago", ppe: 0  },
  { id: "CAM-07", name: "BOF Converter · Overhead",   zone: "Z-D2", status: "online" as const,   lastFrame: "3 s ago",  ppe: 95 },
  { id: "CAM-08", name: "Power House 2 · Turbine",    zone: "Z-D3", status: "online" as const,   lastFrame: "4 s ago",  ppe: 99 },
];

export const PPE_EVIDENCE: Record<string, { violation: string; ts: string; cam: string }[]> = {
  "Z-A1": [
    { violation: "Face shield missing", ts: "09:28", cam: "CAM-01" },
    { violation: "Helmet strap loose",  ts: "08:51", cam: "CAM-01" },
  ],
  "Z-B1": [{ violation: "Safety jacket not worn", ts: "09:04", cam: "CAM-03" }],
  "Z-B3": [{ violation: "Respirator missing",     ts: "07:42", cam: "CAM-04" }],
  "Z-C1": [
    { violation: "Helmet not worn",     ts: "09:07", cam: "CAM-05" },
    { violation: "Harness clip open",   ts: "08:33", cam: "CAM-05" },
  ],
  "Z-D2": [{ violation: "Hi-vis vest missing",    ts: "08:12", cam: "CAM-07" }],
};

export const USERS = [
  { name: "Ananya Rao",   email: "ananya.rao@ris.gov.in",   role: "Admin",    dept: "Safety",       last: "2 min ago",  status: "active" },
  { name: "Kunal Mahato", email: "kunal.m@ris.gov.in",       role: "Operator", dept: "Coke Ovens",   last: "18 min ago", status: "active" },
  { name: "Priya Nanda",  email: "priya.n@ris.gov.in",       role: "Operator", dept: "Utilities",    last: "1 h ago",    status: "active" },
  { name: "Suresh Basu",  email: "s.basu@ris.gov.in",        role: "Operator", dept: "Electrical",   last: "3 h ago",    status: "active" },
  { name: "M. Iqbal",     email: "iqbal@ris.gov.in",         role: "Viewer",   dept: "Compliance",   last: "Yesterday",  status: "active" },
  { name: "R. Deshpande", email: "r.desh@ris.gov.in",        role: "Viewer",   dept: "Executive",    last: "4 d ago",    status: "invited" },
];

export const DATA_SOURCES = [
  { id: "DS-GAS-01",  name: "Draeger Polytron Grid",  type: "Gas Sensors",       lastSync: "12 s ago",  status: "online",  enabled: true },
  { id: "DS-SCADA",   name: "ABB 800xA SCADA",        type: "SCADA",             lastSync: "3 s ago",   status: "online",  enabled: true },
  { id: "DS-PTW",     name: "eSafety PTW System",     type: "Work Permits",      lastSync: "44 s ago",  status: "online",  enabled: true },
  { id: "DS-SHIFT",   name: "Kronos Shift Roster",    type: "Shift Logs",        lastSync: "6 min ago", status: "online",  enabled: true },
  { id: "DS-CCTV",    name: "Bosch CCTV Bridge",      type: "CCTV / PPE Vision",   lastSync: "4 s ago",   status: "online",  enabled: true },
  { id: "DS-WEATHER", name: "IMD Weather Feed",       type: "Environmental",     lastSync: "9 min ago", status: "online",  enabled: true },
];

export const RISK_RULES = [
  { id: "R1", name: "Hot work + rising combustible gas",         enabled: true,  sensitivity: 78 },
  { id: "R2", name: "Confined space + abnormal process reading", enabled: true,  sensitivity: 84 },
  { id: "R3", name: "Shift changeover + active high-hazard permit", enabled: true, sensitivity: 62 },
  { id: "R4", name: "Line break + adjacent VOC threshold approach", enabled: true, sensitivity: 90 },
  { id: "R5", name: "Coverage gap in permitted zone",            enabled: true,  sensitivity: 55 },
  { id: "R6", name: "Multi-permit overlap in same zone",         enabled: false, sensitivity: 40 },
  { id: "R7", name: "Weather (temp/humidity) × exothermic process", enabled: true, sensitivity: 48 },
];

export const AUDIT_LOG = [
  { ts: "09:44", user: "Ananya Rao",   action: "Updated risk rule R2 sensitivity 80→84" },
  { ts: "09:12", user: "System",       action: "Sensor GS-2455 marked offline" },
  { ts: "08:31", user: "Kunal Mahato", action: "Acknowledged event RX-8840" },
  { ts: "07:55", user: "Ananya Rao",   action: "Invited user r.desh@ris.gov.in (Viewer)" },
  { ts: "07:02", user: "System",       action: "Shift handover Alpha → Bravo (Z-C1)" },
  { ts: "06:48", user: "Priya Nanda",  action: "Closed permit PTW-218 (Radiography)" },
];

export const KPIS = {
  activeCompoundRisks: 6,
  openPermitConflicts: 3,
  elevatedZones: 4,
  avgLeadTime: "38 min",
  sensorsOnline: "127 / 132",
  permitsToday: 18,
};

export function severityLabel(s: Severity) {
  return { critical: "Critical", high: "High", medium: "Elevated", low: "Low", normal: "Normal" }[s];
}
export function severityClass(s: Severity) {
  return {
    critical: "sev-critical-bg border-[color:var(--sev-critical)]/40",
    high:     "sev-high-bg border-[color:var(--sev-high)]/40",
    medium:   "sev-medium-bg border-[color:var(--sev-medium)]/40",
    low:      "sev-low-bg border-[color:var(--sev-low)]/40",
    normal:   "sev-normal-bg border-[color:var(--sev-normal)]/40",
  }[s];
}
export function severityVar(s: Severity) {
  return `var(--sev-${s})`;
}
