import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader, SectionCard } from "@/components/app-layout";
import { SeverityPill, Sparkline, RiskGauge, Skeleton } from "@/components/risk-primitives";
import type { Severity } from "@/lib/mock-data";
import { apiSeverityToUi } from "@/lib/api";
import { useSensors, usePermits, useZones } from "@/lib/queries";
import { zoneLayout } from "@/lib/zone-layout";
import { useState } from "react";
import { X, Radio, FileText, WifiOff, HardHat } from "lucide-react";

export const Route = createFileRoute("/monitor")({
  head: () => ({ meta: [{ title: "Live Risk Monitor — FUSE.OS" }, { name: "robots", content: "noindex" }] }),
  component: Monitor,
});

function Monitor() {
  const [filter, setFilter] = useState<"all" | Severity>("all");
  const [selected, setSelected] = useState<string | null>(null);

  const { data: allZones, isLoading: zonesLoading } = useZones();
  const { data: sensors } = useSensors();
  const { data: permits } = usePermits();

  const all = allZones ?? [];
  const zones = filter === "all" ? all : all.filter((z) => apiSeverityToUi(z.risk_level) === filter);
  const zone = selected ? all.find((z) => z.id === selected) : null;

  const sensorsFor = (zoneId: string) => (sensors ?? []).filter((s) => s.zone_id === zoneId);
  const activePermitsFor = (zoneId: string) => (permits ?? []).filter((p) => p.zone_id === zoneId && p.status === "Active");

  return (
    <AppLayout>
      <PageHeader
        title="Live Risk Monitor"
        subtitle="Every zone, correlated in real time. Filter by risk band or open a zone for its full signal stack."
        actions={
          <div className="flex gap-1 text-xs font-mono">
            {(["all","critical","high","medium","low","normal"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded uppercase tracking-wider ${filter === f ? "bg-primary/15 text-primary border border-primary/40" : "text-muted-foreground border border-border hover:border-primary/40"}`}>
                {f}
              </button>
            ))}
          </div>
        }
      />

      <div className="mb-3 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
        <span>Showing {zones.length} of {all.length} zones</span>
        <span className="hidden md:inline">Click a zone for full signal stack →</span>
      </div>

      {zonesLoading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 w-full" />)}
        </div>
      ) : (
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {zones.map((z) => {
          const zoneSensors = sensorsFor(z.id);
          const zonePermits = activePermitsFor(z.id);
          const primary = zoneSensors[0];
          const sev = apiSeverityToUi(z.risk_level);
          return (
            <button key={z.id} onClick={() => setSelected(z.id)}
              className="text-left rounded-lg border border-border bg-[var(--panel)] p-4 hover:border-primary/50 transition-colors">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-mono text-muted-foreground">{z.id}</div>
                  <div className="font-semibold truncate">{z.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{zoneLayout(z.id).desc}</div>
                </div>
                <div className="shrink-0"><RiskGauge value={z.risk_score} severity={sev} size={72} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {primary ? (
                  <div className="rounded border border-border bg-[var(--panel-elevated)] p-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1">
                      {primary.offline ? <WifiOff className="h-3 w-3 text-[color:var(--sev-medium)]" /> : <Radio className="h-3 w-3" style={{color:"var(--signal-sensor)"}} />}
                      {primary.param}
                    </div>
                    <div className="flex items-end justify-between mt-1">
                      <span className="font-mono text-sm">{primary.reading} {primary.unit}</span>
                      <Sparkline data={primary.trend} color={`var(--sev-${sev})`} width={60} height={22} />
                    </div>
                  </div>
                ) : (
                  <div className="rounded border border-dashed border-border bg-[var(--panel-elevated)]/40 p-2 flex flex-col justify-center">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1">
                      <WifiOff className="h-3 w-3" /> No sensor
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">Not yet assigned to this zone</div>
                  </div>
                )}
                <div className="rounded border border-border bg-[var(--panel-elevated)] p-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1">
                    <FileText className="h-3 w-3" style={{ color: "var(--signal-permit)" }} /> Active permits
                  </div>
                  <div className="flex items-end justify-between mt-1">
                    <span className="font-mono text-sm">{zonePermits.length || "None"}</span>
                    {zonePermits.some((p) => p.conflict) && <SeverityPill s="critical" label="Conflict" />}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <SeverityPill s={sev} />
                <span className="text-[11px] text-primary">Open zone →</span>
              </div>
            </button>
          );
        })}
      </div>
      )}

      {!zonesLoading && zones.length === 0 && (
        <div className="mt-6 rounded-lg border border-dashed border-border bg-[var(--panel)]/50 p-8 text-center text-sm text-muted-foreground">
          No zones match the <span className="font-mono text-foreground">{filter}</span> filter.
        </div>
      )}

      {/* Drawer */}
      {zone && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <aside onClick={(e) => e.stopPropagation()} className="absolute right-0 top-0 h-full w-full max-w-xl bg-[var(--panel)] border-l border-border overflow-y-auto">
            <header className="flex items-start justify-between p-5 border-b border-border">
              <div>
                <div className="text-xs font-mono text-muted-foreground">{zone.id}</div>
                <h2 className="text-xl font-display font-semibold">{zone.name}</h2>
                <div className="mt-2"><SeverityPill s={apiSeverityToUi(zone.risk_level)} /></div>
              </div>
              <button onClick={() => setSelected(null)} className="h-8 w-8 rounded-md hover:bg-[var(--panel-elevated)] flex items-center justify-center"><X className="h-4 w-4" /></button>
            </header>
            <div className="p-5 space-y-5">
              <SectionCard title="Zone Risk">
                <div className="flex items-center gap-4">
                  <RiskGauge value={zone.risk_score} severity={apiSeverityToUi(zone.risk_level)} size={120} />
                  <div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{zoneLayout(zone.id).desc}</p>
                  </div>
                </div>
              </SectionCard>
              <SectionCard title="Sensors In-Zone">
                <div className="space-y-2">
                  {sensorsFor(zone.id).length === 0 ? (
                    <div className="text-sm text-muted-foreground">No sensors assigned to this zone.</div>
                  ) : sensorsFor(zone.id).map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded border border-border bg-[var(--panel-elevated)] p-2.5">
                      <div>
                        <div className="text-sm font-mono">{s.id} · {s.param}</div>
                        <div className="text-[11px] text-muted-foreground">{s.reading} / {s.threshold} {s.unit}</div>
                      </div>
                      <Sparkline data={s.trend} color={s.offline ? "var(--muted-foreground)" : "var(--primary)"} />
                    </div>
                  ))}
                </div>
              </SectionCard>
              <SectionCard title="Active Permits">
                <div className="space-y-2">
                  {activePermitsFor(zone.id).map((p) => (
                    <div key={p.id} className="rounded border border-border bg-[var(--panel-elevated)] p-2.5">
                      <div className="flex items-center justify-between">
                        <div className="text-sm"><span className="font-mono text-primary">{p.id}</span> · {p.type}</div>
                        {p.conflict && <SeverityPill s="critical" label="Conflict" />}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">{new Date(p.start_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}–{new Date(p.end_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })} · {p.issuer}</div>
                      {p.conflict_reason && <p className="text-xs mt-1.5 text-foreground/80">{p.conflict_reason}</p>}
                    </div>
                  ))}
                  {activePermitsFor(zone.id).length === 0 && (
                    <div className="text-sm text-muted-foreground">No active permits in-zone.</div>
                  )}
                </div>
              </SectionCard>
              <SectionCard title="PPE Compliance" right={
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border"
                  style={{ color: "var(--signal-ppe)", borderColor: "color-mix(in oklab, var(--signal-ppe) 40%, transparent)", background: "color-mix(in oklab, var(--signal-ppe) 12%, transparent)" }}>
                  <HardHat className="h-3 w-3" /> PPE
                </span>
              }>
                <div className="text-sm text-muted-foreground">
                  PPE / camera vision data isn't wired into the backend yet — this panel will populate once the camera vision pipeline feeds the fusion engine.
                </div>
              </SectionCard>
            </div>
          </aside>
        </div>
      )}
    </AppLayout>
  );
}
