// Central API client for the FUSE.OS backend. Every route file that used to
// import mock data from `mock-data.ts` should import fetchers/types from here
// instead (via the React Query hooks in `lib/queries.ts`).
import type { Severity } from "./mock-data";

export const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:8000";
export const WS_BASE = API_BASE.replace(/^http/, "ws");

const TOKEN_KEY = "fuse_token";
const USER_KEY = "fuse_user";

export type AuthUser = { name: string; email: string; role: string };

const isBrowser = typeof window !== "undefined";

export function getStoredToken(): string | null {
  if (!isBrowser) return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (!isBrowser) return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: AuthUser) {
  if (!isBrowser) return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  if (!isBrowser) return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = { ...(options.headers as Record<string, string> | undefined) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const isFormBody = options.body instanceof URLSearchParams;
  if (options.body && !isFormBody) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(`Could not reach FUSE.OS backend at ${API_BASE}. Is it running?`, 0);
  }

  if (res.status === 401) {
    clearSession();
    if (isBrowser) window.location.href = "/login";
    throw new ApiError("Session expired", 401);
  }
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.detail || JSON.stringify(body);
    } catch {
      detail = await res.text().catch(() => "");
    }
    throw new ApiError(detail || `Request failed (${res.status})`, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function get<T>(path: string): Promise<T> {
  return request<T>(path, { method: "GET" });
}
function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined });
}
function patch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined });
}
function del<T>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Severity translation — frontend's `Severity` type uses "medium", the
// backend's `RiskEvent.severity` / `ZoneOut.risk_level` use "elevated".
// ---------------------------------------------------------------------------
export type ApiSeverity = "critical" | "high" | "elevated" | "low" | "normal";

export function apiSeverityToUi(s: string): Severity {
  return s === "elevated" ? "medium" : (s as Severity);
}
export function uiSeverityToApi(s: Severity): ApiSeverity {
  return s === "medium" ? "elevated" : (s as ApiSeverity);
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export async function login(email: string, password: string) {
  const body = new URLSearchParams();
  body.set("username", email);
  body.set("password", password);
  return request<{ access_token: string; token_type: string; user: AuthUser }>("/api/auth/login", {
    method: "POST",
    body,
  });
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export type DashboardSummary = {
  active_compound_risks: number;
  open_permit_conflicts: number;
  zones_at_elevated_risk: number;
  avg_lead_time_minutes: number;
  sensors_online: number;
  sensors_total: number;
  permits_active_today: number;
};
export function getDashboardSummary() {
  return get<DashboardSummary>("/api/dashboard/summary");
}

// ---------------------------------------------------------------------------
// Zones
// ---------------------------------------------------------------------------
export type ZoneOut = { id: string; name: string; sector: string | null; risk_score: number; risk_level: string };
export function getZones() {
  return get<ZoneOut[]>("/api/zones");
}
export type ZoneDetail = ZoneOut & {
  permits: PermitOut[];
  recent_gas_readings: GasReadingOut[];
  recent_events: RiskEventOut[];
};
export function getZoneDetail(zoneId: string) {
  return get<ZoneDetail>(`/api/zones/${zoneId}`);
}

// ---------------------------------------------------------------------------
// Permits
// ---------------------------------------------------------------------------
export type PermitOut = {
  id: string;
  type: string;
  zone_id: string;
  hazard_class: string | null;
  issuer: string | null;
  start_time: string;
  end_time: string;
  status: string; // Active / Upcoming / Closed
  conflict: boolean;
  conflict_reason: string | null;
};
export function getPermits(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return get<PermitOut[]>(`/api/permits${qs}`);
}
export function issuePermit(permit: {
  id: string;
  type: string;
  zone_id: string;
  hazard_class?: string | null;
  issuer?: string | null;
  start_time: string;
  end_time: string;
  status: string;
}) {
  // Reuses the ml/ ingest join point — it upserts against the exact PermitOut
  // shape, which is also exactly what "issue a permit" needs to write.
  // hazard_class/issuer must be present (even if null) — PermitOut's
  // Optional[str] fields have no default, so pydantic requires the key.
  return post<{ ingested: number }>("/api/ingest/permits", [
    {
      ...permit,
      hazard_class: permit.hazard_class ?? null,
      issuer: permit.issuer ?? null,
      conflict: false,
      conflict_reason: null,
    },
  ]);
}

// ---------------------------------------------------------------------------
// Risk events
// ---------------------------------------------------------------------------
export type RiskEventOut = {
  id: string;
  zone_id: string;
  risk_type: string;
  severity: ApiSeverity;
  confidence: number;
  contributing_signals: string[];
  lead_time_minutes: number | null;
  description: string;
  status: "new" | "acknowledged" | "resolved";
  timestamp: string;
};
export function getRiskEvents(params: { severity?: string; zone_id?: string; limit?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.severity) qs.set("severity", params.severity);
  if (params.zone_id) qs.set("zone_id", params.zone_id);
  if (params.limit) qs.set("limit", String(params.limit));
  const s = qs.toString();
  return get<RiskEventOut[]>(`/api/risk-events${s ? `?${s}` : ""}`);
}
export function updateRiskEventStatus(id: string, status: string) {
  return patch<{ id: string; status: string }>(`/api/risk-events/${id}/status?new_status=${encodeURIComponent(status)}`);
}

// ---------------------------------------------------------------------------
// Sensors (additive endpoint — see backend/app/api/sensors.py)
// ---------------------------------------------------------------------------
export type SensorOut = {
  id: string;
  zone_id: string;
  param: string;
  reading: number;
  unit: string;
  threshold: number;
  timestamp: string;
  trend: number[];
  offline: boolean;
};
export function getSensors(zoneId?: string) {
  const qs = zoneId ? `?zone_id=${encodeURIComponent(zoneId)}` : "";
  return get<SensorOut[]>(`/api/sensors${qs}`);
}
export type GasReadingOut = {
  sensor_id: string;
  zone_id: string;
  gas_type: string;
  reading: number;
  unit: string;
  threshold: number;
  timestamp: string;
};

// ---------------------------------------------------------------------------
// Analytics / Compliance
// ---------------------------------------------------------------------------
export type AnalyticsSummary = {
  signal_breakdown_pct: Record<string, number>;
  zone_comparison: { zone_id: string; score: number }[];
  avg_lead_time_minutes: number;
  avg_confidence_pct: number;
  total_events_analyzed: number;
};
export function getAnalyticsSummary() {
  return get<AnalyticsSummary>("/api/analytics/summary");
}

export type ComplianceGap = {
  id: number;
  zone_id: string;
  regulation_ref: string;
  source: string | null;
  description: string;
  detected_at: string;
  status: string;
};
export function getComplianceGaps() {
  return get<ComplianceGap[]>("/api/compliance/gaps");
}
export type ComplianceHealth = {
  coverage_pct: number;
  open_gaps: number;
  total_gaps_tracked: number;
  standards_referenced: number;
};
export function getComplianceHealth() {
  return get<ComplianceHealth>("/api/compliance/health");
}

// ---------------------------------------------------------------------------
// Settings — Cameras
// ---------------------------------------------------------------------------
export type CameraOut = {
  id: number;
  name: string;
  zone_id: string;
  status: string;
  last_frame_at: string | null;
  active: boolean;
};
export function getCameras() {
  return get<CameraOut[]>("/api/cameras");
}
export function addCamera(camera: { name: string; zone_id: string }) {
  return post<{ id: number; name: string }>("/api/cameras", camera);
}
export function toggleCamera(id: number, active: boolean) {
  return patch<{ id: number; active: boolean }>(`/api/cameras/${id}/toggle`, { active });
}
export function deleteCamera(id: number) {
  return del<{ deleted: number }>(`/api/cameras/${id}`);
}

// ---------------------------------------------------------------------------
// Settings — Data Sources
// ---------------------------------------------------------------------------
export type DataSourceOut = {
  id: number;
  name: string;
  code: string;
  type: string;
  status: string;
  last_sync_at: string | null;
  enabled: boolean;
};
export function getDataSources() {
  return get<DataSourceOut[]>("/api/data-sources");
}
export function toggleDataSource(id: number, enabled: boolean) {
  return patch<{ id: number; enabled: boolean }>(`/api/data-sources/${id}/toggle`, { enabled });
}

// ---------------------------------------------------------------------------
// Settings — Risk Rules
// ---------------------------------------------------------------------------
export type RiskRuleOut = { id: number; code: string; name: string; enabled: boolean; sensitivity: number };
export function getRiskRules() {
  return get<RiskRuleOut[]>("/api/risk-rules");
}
export function updateRiskRule(id: number, payload: { enabled?: boolean; sensitivity?: number }) {
  return patch<RiskRuleOut>(`/api/risk-rules/${id}`, payload);
}

// ---------------------------------------------------------------------------
// Settings — Users
// ---------------------------------------------------------------------------
export type UserOut = { id: number; name: string; email: string; role: string; department: string | null };
export function getUsers() {
  return get<UserOut[]>("/api/users");
}
export function inviteUser(payload: { name: string; email: string; role?: string; department?: string | null }) {
  return post<UserOut & { temp_password?: string; error?: string }>("/api/users/invite", payload);
}
export function deleteUser(id: number) {
  return del<{ deleted: number }>(`/api/users/${id}`);
}

// ---------------------------------------------------------------------------
// Settings — Notifications
// ---------------------------------------------------------------------------
export type RecipientOut = {
  id: number;
  name: string;
  role: string | null;
  email: string;
  channel_email: boolean;
  channel_sms: boolean;
  channel_whatsapp: boolean;
  enabled: boolean;
};
export function getRecipients() {
  return get<RecipientOut[]>("/api/notifications/recipients");
}
export function addRecipient(payload: {
  name: string;
  role?: string;
  email: string;
  channel_email?: boolean;
  channel_sms?: boolean;
  channel_whatsapp?: boolean;
}) {
  return post<{ id: number }>("/api/notifications/recipients", payload);
}
export function updateRecipient(
  id: number,
  payload: Partial<{ channel_email: boolean; channel_sms: boolean; channel_whatsapp: boolean; enabled: boolean }>
) {
  return patch<{ id: number; updated: boolean }>(`/api/notifications/recipients/${id}`, payload);
}
export function deleteRecipient(id: number) {
  return del<{ deleted: number }>(`/api/notifications/recipients/${id}`);
}

// ---------------------------------------------------------------------------
// Settings — Audit Log
// ---------------------------------------------------------------------------
export type AuditLogEntryOut = { id: number; actor: string; action: string; timestamp: string };
export function getAuditLog(limit = 50) {
  return get<AuditLogEntryOut[]>(`/api/audit-log?limit=${limit}`);
}

// ---------------------------------------------------------------------------
// Settings — Plant Config
// ---------------------------------------------------------------------------
export type PlantConfigOut = {
  plant_name: string | null;
  plant_code: string | null;
  timezone: string | null;
  language: string | null;
  shift_a_start: string | null;
  shift_a_end: string | null;
  shift_b_start: string | null;
  shift_b_end: string | null;
  shift_c_start: string | null;
  shift_c_end: string | null;
};
export function getPlantConfig() {
  return get<PlantConfigOut>("/api/plant-config");
}
export function updatePlantConfig(payload: Partial<PlantConfigOut>) {
  return patch<{ updated: string[] }>("/api/plant-config", payload);
}

export { ApiError };
