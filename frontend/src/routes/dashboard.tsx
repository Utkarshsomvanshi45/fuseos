import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout, SectionCard, PageHeader } from "@/components/app-layout";
import { SeverityPill, SignalChips, Sparkline, Skeleton } from "@/components/risk-primitives";
import { PLANT, severityVar, type Severity } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth";
import { apiSeverityToUi } from "@/lib/api";
import { useDashboardSummary, usePermits, useRiskEvents, useSensors, useZones } from "@/lib/queries";
import { useState } from "react";
import { toast } from "@/lib/toast";
import { askCopilot } from "@/lib/copilot-bus";
import {
  Radar, FileText, MapPin, Clock, ArrowRight,
  AlertTriangle, TrendingUp, WifiOff, CheckCircle2, Sparkles, RefreshCw,
} from "lucide-react";


export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — FUSE.OS" }, { name: "robots", content: "noindex" }] }),
  component: Dashboard,
});

const INSIGHT_ICON: Record<Severity, typeof AlertTriangle> = {
  critical: AlertTriangle, high: TrendingUp, medium: WifiOff, low: CheckCircle2, normal: CheckCircle2,
};

function Dashboard() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "there";

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useDashboardSummary();
  const { data: permits, isLoading: permitsLoading, refetch: refetchPermits } = usePermits();
  const { data: events, isLoading: eventsLoading, refetch: refetchEvents } = useRiskEvents({ limit: 6 });
  const { data: sensors, isLoading: sensorsLoading, refetch: refetchSensors } = useSensors();
  const { data: zones, refetch: refetchZones } = useZones();

  const [refreshing, setRefreshing] = useState(false);

  const loading = summaryLoading || permitsLoading || eventsLoading || sensorsLoading;
  const conflictedPermits = (permits ?? []).filter((p) => p.conflict);
  const zonesSorted = [...(zones ?? [])].sort((a, b) => b.risk_score - a.risk_score).slice(0, 6);

  const insights = [...(events ?? [])]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 4)
    .map((e) => {
      const sev = apiSeverityToUi(e.severity);
      return {
        icon: INSIGHT_ICON[sev],
        sev,
        title: `${e.zone_id}: ${e.risk_type}`,
        body: e.description,
        sub: `${e.contributing_signals.length} signal${e.contributing_signals.length === 1 ? "" : "s"} · ${e.confidence}% confidence${e.lead_time_minutes ? ` · ${e.lead_time_minutes} min lead-time` : ""}`,
      };
    });

  async function refresh() {
    setRefreshing(true);
    toast("Refreshing fusion feed…", "info");
    await Promise.all([refetchSummary(), refetchPermits(), refetchEvents(), refetchSensors(), refetchZones()]);
    setRefreshing(false);
    toast("Fusion feed updated", "success");
  }

  const KPI_ITEMS = summary
    ? [
        { icon: AlertTriangle, label: "Active Compound Risks", value: summary.active_compound_risks, delta: "Open, ≥2 signals", tone: "critical" as const },
        { icon: FileText, label: "Open Permit Conflicts", value: summary.open_permit_conflicts, delta: "Live-scored", tone: "high" as const },
        { icon: MapPin, label: "Zones at Elevated Risk", value: summary.zones_at_elevated_risk, delta: `of ${zones?.length ?? 10} total`, tone: "medium" as const },
        { icon: Clock, label: "Avg Prediction Lead-Time", value: `${Math.round(summary.avg_lead_time_minutes)} min`, delta: "Across open events", tone: "low" as const },
        { icon: Radar, label: "Sensors Online", value: `${summary.sensors_online} / ${summary.sensors_total}`, delta: `${summary.sensors_total - summary.sensors_online} offline`, tone: "normal" as const },
        { icon: FileText, label: "Permits Active Today", value: summary.permits_active_today, delta: "Live count", tone: "normal" as const },
      ]
    : [];

  return (
    <AppLayout>
      <PageHeader
        title={`Good morning, ${firstName}`}
        subtitle={`${PLANT.name} · ${PLANT.sector} · Live fusion feed`}
        actions={
          <>
            <button onClick={refresh} disabled={refreshing} className="h-9 px-3 rounded-md border border-border bg-[var(--panel)] text-sm hover:bg-[var(--panel-elevated)] inline-flex items-center gap-1.5 disabled:opacity-60"><RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh</button>
            <Link to="/alerts" className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5">
              View alerts <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        {loading || !summary
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-[var(--panel)] p-3.5">
                <Skeleton className="h-4 w-4 mb-2" />
                <Skeleton className="h-6 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))
          : KPI_ITEMS.map((k) => (
          <div key={k.label} className="rounded-lg border border-border bg-[var(--panel)] p-3.5">
            <div className="flex items-start justify-between mb-2">
              <k.icon className="h-4 w-4" style={{ color: `var(--sev-${k.tone})` }} />
              <SeverityPill s={k.tone} label={k.tone === "critical" ? "Live" : k.tone === "normal" ? "OK" : undefined} />
            </div>
            <div className="text-2xl font-display font-semibold font-mono tabular-nums">{k.value}</div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1 leading-tight">{k.label}</div>
            <div className="text-[11px] text-muted-foreground mt-1 font-mono">{k.delta}</div>
          </div>
        ))}
      </div>

      {/* AI insights */}
      <SectionCard
        title="AI Fusion Insights"
        right={
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-primary pulse-dot font-mono uppercase tracking-wider">Live</span>
            <button onClick={() => askCopilot("What's driving risk this shift?", insights[0] ? `${insights[0].title} — ${insights[0].body} (${insights[0].sub})` : "No active insights right now — plant nominal.")} className="text-xs text-primary hover:underline inline-flex items-center gap-1"><Sparkles className="h-3 w-3" /> Ask AI about this shift</button>
          </div>
        }
        className="mb-5"
      >
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border bg-[var(--panel-elevated)] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-full mb-1.5" />
                  <Skeleton className="h-3 w-5/6 mb-1.5" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ))
            : insights.length === 0 ? (
              <div className="col-span-full text-sm text-muted-foreground py-6 text-center">No active fusion insights right now — plant nominal.</div>
            ) : insights.map((ins) => (
            <div key={ins.title} className="rounded-lg border border-border bg-[var(--panel-elevated)] p-4 flex flex-col">
              <div className="flex items-center justify-between mb-2.5">
                <div className="h-8 w-8 rounded-md flex items-center justify-center"
                  style={{ background: `color-mix(in oklab, var(--sev-${ins.sev}) 18%, transparent)`, color: `var(--sev-${ins.sev})` }}>
                  <ins.icon className="h-4 w-4" />
                </div>
                <SeverityPill s={ins.sev} />
              </div>
              <div className="font-semibold text-sm leading-snug mb-1.5">{ins.title}</div>
              <p className="text-xs text-muted-foreground leading-relaxed flex-1">{ins.body}</p>
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground font-mono">{ins.sub}</span>
                <button onClick={() => askCopilot(`What's happening with ${ins.title.split(":")[0]}?`, `${ins.title.split(":")[1]?.trim() ?? ins.title} — ${ins.body} (${ins.sub})`)} className="text-[11px] text-primary hover:underline">Ask AI →</button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Zone comparison + Permits */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5 mb-5">
        <SectionCard title="Zone Risk Comparison — Live">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {zonesSorted.map((z) => (
                <div key={z.id} className="flex items-center gap-3">
                  <div className="w-32 text-xs">
                    <div className="font-mono text-muted-foreground">{z.id}</div>
                    <div className="truncate">{z.name}</div>
                  </div>
                  <div className="flex-1 h-6 rounded bg-[var(--panel-elevated)] overflow-hidden relative">
                    <div className="h-full rounded" style={{ width: `${z.risk_score}%`, background: `color-mix(in oklab, ${severityVar(apiSeverityToUi(z.risk_level))} 45%, transparent)`, borderRight: `2px solid ${severityVar(apiSeverityToUi(z.risk_level))}` }} />
                    <span className="absolute inset-0 flex items-center px-2 text-[11px] font-mono">{z.risk_score} / 100</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Permit Conflicts" right={<Link to="/permits" className="text-xs text-primary hover:underline">View all</Link>}>
          <div className="space-y-2.5">
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
            ) : conflictedPermits.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">No permit conflicts right now.</div>
            ) : conflictedPermits.map((p) => (
              <div key={p.id} className="rounded-md border border-border bg-[var(--panel-elevated)] p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5" style={{ color: "var(--signal-permit)" }} />
                    <span className="font-mono text-xs text-primary">{p.id}</span>
                    <span className="text-xs text-foreground/90">· {p.type}</span>
                  </div>
                  <SeverityPill s="critical" label="Conflict" />
                </div>
                <div className="text-[11px] text-muted-foreground font-mono">{p.zone_id} · {new Date(p.start_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}–{new Date(p.end_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}</div>
                <p className="text-xs mt-1.5 text-foreground/80 leading-snug">{p.conflict_reason}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Sensor strip */}
      <SectionCard title="Live Sensor Snapshot" right={<Link to="/monitor" className="text-xs text-primary hover:underline">Live monitor →</Link>} className="mb-5">
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-md border border-border bg-[var(--panel-elevated)] p-3">
                  <div className="flex items-center justify-between mb-2"><Skeleton className="h-3 w-14" /><Skeleton className="h-4 w-10" /></div>
                  <Skeleton className="h-3 w-24 mb-3" />
                  <div className="flex items-end justify-between"><Skeleton className="h-6 w-16" /><Skeleton className="h-6 w-16" /></div>
                </div>
              ))
            : (sensors ?? []).slice(0, 4).map((s) => {
            const pct = (s.reading / s.threshold) * 100;
            const sev = pct > 90 ? "critical" : pct > 75 ? "high" : pct > 50 ? "medium" : "normal";
            return (
              <div key={s.id} className="rounded-md border border-border bg-[var(--panel-elevated)] p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs">{s.id}</span>
                  <SeverityPill s={sev} label={`${Math.round(pct)}%`} />
                </div>
                <div className="text-[11px] text-muted-foreground">{s.param} · {s.zone_id}</div>
                <div className="flex items-end justify-between mt-2">
                  <div>
                    <div className="text-xl font-mono font-semibold tabular-nums">{s.reading}<span className="text-xs text-muted-foreground ml-1">{s.unit}</span></div>
                    <div className="text-[10px] text-muted-foreground font-mono">of {s.threshold} {s.unit}</div>
                  </div>
                  <Sparkline data={s.trend} color={`var(--sev-${sev})`} />
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Recent events */}
      <SectionCard title="Recent Compound-Risk Events" right={<Link to="/alerts" className="text-xs text-primary hover:underline">Alert center →</Link>}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground text-left border-b border-border">
                <th className="pb-2 font-medium">Time</th>
                <th className="pb-2 font-medium">Event</th>
                <th className="pb-2 font-medium">Zone</th>
                <th className="pb-2 font-medium">Signals</th>
                <th className="pb-2 font-medium">Severity</th>
                <th className="pb-2 font-medium">Conf.</th>
                <th className="pb-2 font-medium text-right"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50"><td colSpan={7} className="py-2.5"><Skeleton className="h-5 w-full" /></td></tr>
                ))
              ) : (events ?? []).map((e) => (
                <tr key={e.id} className="border-b border-border/50 hover:bg-[var(--panel-elevated)]/60">
                  <td className="py-2.5 font-mono text-xs text-muted-foreground">{new Date(e.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}</td>
                  <td className="py-2.5">
                    <div className="text-sm">{e.risk_type}</div>
                    <div className="text-[11px] text-muted-foreground truncate max-w-[380px]">{e.description}</div>
                  </td>
                  <td className="py-2.5 font-mono text-xs">{e.zone_id}</td>
                  <td className="py-2.5"><SignalChips signals={e.contributing_signals} /></td>
                  <td className="py-2.5"><SeverityPill s={apiSeverityToUi(e.severity)} /></td>
                  <td className="py-2.5 font-mono text-xs">{e.confidence}%</td>
                  <td className="py-2.5 text-right"><Link to="/alerts" className="text-xs text-primary hover:underline">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </AppLayout>
  );
}
