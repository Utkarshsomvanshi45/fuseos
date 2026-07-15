import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";

// ---------------------------------------------------------------------------
// Query keys, centralized so invalidation (incl. from the websocket) is easy.
// ---------------------------------------------------------------------------
export const qk = {
  dashboardSummary: ["dashboard-summary"] as const,
  zones: ["zones"] as const,
  zoneDetail: (id: string) => ["zone-detail", id] as const,
  permits: (status?: string) => ["permits", status ?? "all"] as const,
  riskEvents: (params: { severity?: string; zone_id?: string; limit?: number } = {}) =>
    ["risk-events", params] as const,
  sensors: (zoneId?: string) => ["sensors", zoneId ?? "all"] as const,
  analyticsSummary: ["analytics-summary"] as const,
  complianceGaps: ["compliance-gaps"] as const,
  complianceHealth: ["compliance-health"] as const,
  cameras: ["cameras"] as const,
  dataSources: ["data-sources"] as const,
  riskRules: ["risk-rules"] as const,
  users: ["users"] as const,
  recipients: ["recipients"] as const,
  auditLog: ["audit-log"] as const,
  plantConfig: ["plant-config"] as const,
};

// Anything that changes when a risk event fires or its status changes.
export function invalidateRiskDerived(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
  queryClient.invalidateQueries({ queryKey: ["risk-events"] });
  queryClient.invalidateQueries({ queryKey: ["zones"] });
  queryClient.invalidateQueries({ queryKey: ["zone-detail"] });
  queryClient.invalidateQueries({ queryKey: ["permits"] });
  queryClient.invalidateQueries({ queryKey: ["analytics-summary"] });
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export function useDashboardSummary() {
  return useQuery({ queryKey: qk.dashboardSummary, queryFn: api.getDashboardSummary, refetchInterval: 30_000 });
}

// ---------------------------------------------------------------------------
// Zones
// ---------------------------------------------------------------------------
export function useZones() {
  return useQuery({ queryKey: qk.zones, queryFn: api.getZones, refetchInterval: 30_000 });
}
export function useZoneDetail(zoneId: string | null) {
  return useQuery({
    queryKey: qk.zoneDetail(zoneId ?? ""),
    queryFn: () => api.getZoneDetail(zoneId as string),
    enabled: !!zoneId,
  });
}

// ---------------------------------------------------------------------------
// Permits
// ---------------------------------------------------------------------------
export function usePermits(status?: string) {
  return useQuery({ queryKey: qk.permits(status), queryFn: () => api.getPermits(status), refetchInterval: 30_000 });
}
export function useIssuePermit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.issuePermit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permits"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Risk events
// ---------------------------------------------------------------------------
export function useRiskEvents(params: { severity?: string; zone_id?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: qk.riskEvents(params),
    queryFn: () => api.getRiskEvents(params),
    refetchInterval: 15_000,
  });
}
export function useUpdateRiskEventStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.updateRiskEventStatus(id, status),
    onSuccess: () => invalidateRiskDerived(queryClient),
  });
}

// ---------------------------------------------------------------------------
// Sensors
// ---------------------------------------------------------------------------
export function useSensors(zoneId?: string) {
  return useQuery({ queryKey: qk.sensors(zoneId), queryFn: () => api.getSensors(zoneId), refetchInterval: 30_000 });
}

// ---------------------------------------------------------------------------
// Analytics / Compliance
// ---------------------------------------------------------------------------
export function useAnalyticsSummary() {
  return useQuery({ queryKey: qk.analyticsSummary, queryFn: api.getAnalyticsSummary });
}
export function useComplianceGaps() {
  return useQuery({ queryKey: qk.complianceGaps, queryFn: api.getComplianceGaps });
}
export function useComplianceHealth() {
  return useQuery({ queryKey: qk.complianceHealth, queryFn: api.getComplianceHealth });
}

// ---------------------------------------------------------------------------
// Settings — Cameras
// ---------------------------------------------------------------------------
export function useCameras() {
  return useQuery({ queryKey: qk.cameras, queryFn: api.getCameras, refetchInterval: 30_000 });
}
export function useToggleCamera() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => api.toggleCamera(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.cameras }),
  });
}
export function useDeleteCamera() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteCamera(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.cameras }),
  });
}
export function useAddCamera() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.addCamera,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.cameras }),
  });
}

// ---------------------------------------------------------------------------
// Settings — Data Sources
// ---------------------------------------------------------------------------
export function useDataSources() {
  return useQuery({ queryKey: qk.dataSources, queryFn: api.getDataSources });
}
export function useToggleDataSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) => api.toggleDataSource(id, enabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.dataSources }),
  });
}

// ---------------------------------------------------------------------------
// Settings — Risk Rules
// ---------------------------------------------------------------------------
export function useRiskRules() {
  return useQuery({ queryKey: qk.riskRules, queryFn: api.getRiskRules });
}
export function useUpdateRiskRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { enabled?: boolean; sensitivity?: number } }) =>
      api.updateRiskRule(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.riskRules }),
  });
}

// ---------------------------------------------------------------------------
// Settings — Users
// ---------------------------------------------------------------------------
export function useUsers() {
  return useQuery({ queryKey: qk.users, queryFn: api.getUsers });
}
export function useInviteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.inviteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.users }),
  });
}
export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.users }),
  });
}

// ---------------------------------------------------------------------------
// Settings — Notifications
// ---------------------------------------------------------------------------
export function useRecipients() {
  return useQuery({ queryKey: qk.recipients, queryFn: api.getRecipients });
}
export function useAddRecipient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.addRecipient,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.recipients }),
  });
}
export function useUpdateRecipient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof api.updateRecipient>[1] }) =>
      api.updateRecipient(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.recipients }),
  });
}
export function useDeleteRecipient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteRecipient(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.recipients }),
  });
}

// ---------------------------------------------------------------------------
// Settings — Audit Log
// ---------------------------------------------------------------------------
export function useAuditLog(limit = 50) {
  return useQuery({ queryKey: qk.auditLog, queryFn: () => api.getAuditLog(limit) });
}

// ---------------------------------------------------------------------------
// Settings — Plant Config
// ---------------------------------------------------------------------------
export function usePlantConfig() {
  return useQuery({ queryKey: qk.plantConfig, queryFn: api.getPlantConfig });
}
export function useUpdatePlantConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.updatePlantConfig,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.plantConfig }),
  });
}
