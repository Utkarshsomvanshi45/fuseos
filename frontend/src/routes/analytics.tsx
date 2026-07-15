import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader, SectionCard } from "@/components/app-layout";
import { Skeleton } from "@/components/risk-primitives";
import { severityVar } from "@/lib/mock-data";
import { useAnalyticsSummary, useZones } from "@/lib/queries";


export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics — FUSE.OS" }, { name: "robots", content: "noindex" }] }),
  component: Analytics,
});

const SIGNAL_COLOR: Record<string, string> = {
  compound: "var(--sev-critical)",
  permit: "var(--signal-permit)",
  sensor: "var(--signal-sensor)",
  scada: "var(--signal-scada)",
  shift: "var(--signal-shift)",
  camera: "var(--signal-camera)",
  ppe: "var(--signal-ppe)",
};

function scoreToSeverity(score: number) {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 35) return "medium";
  if (score >= 15) return "low";
  return "normal";
}

function Analytics() {
  const { data: summary, isLoading } = useAnalyticsSummary();
  const { data: zones } = useZones();
  const zoneName = (id: string) => zones?.find((z) => z.id === id)?.name ?? id;

  const breakdown = summary
    ? Object.entries(summary.signal_breakdown_pct).sort((a, b) => b[1] - a[1])
    : [];
  const zoneComparison = summary
    ? [...summary.zone_comparison].sort((a, b) => b.score - a.score)
    : [];

  return (
    <AppLayout>
      <PageHeader
        title="Analytics"
        subtitle="Live plant-wide performance of the fusion engine, computed from open events."
      />

      <div className="grid grid-cols-3 gap-3 mb-5">
        {isLoading || !summary ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
        ) : (
          <>
            <Kpi v={`${Math.round(summary.avg_lead_time_minutes)} min`} l="Avg lead-time" />
            <Kpi v={`${Math.round(summary.avg_confidence_pct)}%`} l="Avg model confidence" />
            <Kpi v={`${summary.total_events_analyzed}`} l="Events analyzed" />
          </>
        )}
      </div>

      <div className="grid xl:grid-cols-2 gap-5">
        <SectionCard title="Events by contributing signal">
          {isLoading || !summary ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
          ) : breakdown.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">No events to break down right now.</div>
          ) : (
            <div className="space-y-2.5">
              {breakdown.map(([label, v]) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1 capitalize"><span>{label}</span><span className="font-mono">{v}%</span></div>
                  <div className="h-2 rounded-full bg-[var(--panel-elevated)] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${v}%`, background: SIGNAL_COLOR[label] ?? "var(--primary)" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Zone comparison — live">
          {isLoading || !summary ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
          ) : (
            <div className="space-y-2">
              {zoneComparison.map((z) => {
                const sev = scoreToSeverity(z.score);
                return (
                  <div key={z.zone_id} className="flex items-center gap-3">
                    <div className="w-32 text-xs">
                      <div className="font-mono text-muted-foreground">{z.zone_id}</div>
                      <div className="truncate">{zoneName(z.zone_id)}</div>
                    </div>
                    <div className="flex-1 h-6 rounded bg-[var(--panel-elevated)] overflow-hidden relative">
                      <div className="h-full rounded" style={{ width: `${z.score}%`, background: `color-mix(in oklab, ${severityVar(sev)} 45%, transparent)`, borderRight: `2px solid ${severityVar(sev)}` }} />
                      <span className="absolute inset-0 flex items-center px-2 text-[11px] font-mono">{z.score} / 100</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </AppLayout>
  );
}

function Kpi({ v, l }: { v: string; l: string }) {
  return (
    <div className="rounded border border-border bg-[var(--panel-elevated)] p-3">
      <div className="text-xl font-mono font-semibold tabular-nums">{v}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</div>
    </div>
  );
}
