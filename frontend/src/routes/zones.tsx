import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader, SectionCard } from "@/components/app-layout";
import { SeverityPill, RiskGauge, Skeleton } from "@/components/risk-primitives";
import { severityVar } from "@/lib/mock-data";
import { apiSeverityToUi } from "@/lib/api";
import { useZoneDetail, useZones } from "@/lib/queries";
import { zoneLayout } from "@/lib/zone-layout";
import { useState } from "react";
import { Edit3, X } from "lucide-react";
import { toast } from "@/lib/toast";


export const Route = createFileRoute("/zones")({
  head: () => ({ meta: [{ title: "Zone Risk Map — FUSE.OS" }, { name: "robots", content: "noindex" }] }),
  component: Zones,
});

function Zones() {
  const [selected, setSelected] = useState<string | null>(null);
  const [edit, setEdit] = useState(false);
  const { data: zones, isLoading } = useZones();
  const { data: detail } = useZoneDetail(selected);
  const zone = zones?.find((z) => z.id === selected);

  return (
    <AppLayout>
      <PageHeader
        title="Zone Risk Map"
        subtitle="Plant floor layout, color-coded by live compound-risk score."
        actions={
          <button onClick={() => setEdit(!edit)} className={`h-9 px-3 rounded-md text-sm inline-flex items-center gap-1.5 ${edit ? "bg-primary text-primary-foreground" : "border border-border bg-[var(--panel)]"}`}>
            <Edit3 className="h-4 w-4" /> {edit ? "Exit edit mode" : "Admin edit"}
          </button>
        }
      />

      <div className="grid lg:grid-cols-[1fr_320px] gap-5">
        <SectionCard title="Rourkela Steelworks · Sector 4">
          {isLoading || !zones ? (
            <Skeleton className="h-[420px] w-full" />
          ) : (
          <div className="rounded-md border border-border bg-[var(--background)] p-3 grid-bg">
            <svg viewBox="0 0 860 500" className="w-full h-auto">
              <defs>
                <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="1" opacity="0.15" />
                </pattern>
              </defs>
              {/* compass */}
              <g transform="translate(810,30)" opacity="0.4">
                <circle r="14" fill="none" stroke="currentColor" />
                <text y="-18" textAnchor="middle" fontSize="10" fill="currentColor" fontFamily="monospace">N</text>
              </g>
              {zones.map((z) => {
                const layout = zoneLayout(z.id);
                const sev = apiSeverityToUi(z.risk_level);
                return (
                  <g key={z.id} onClick={() => setSelected(z.id)} className="cursor-pointer" role="button" aria-label={z.name}>
                    <rect x={layout.x} y={layout.y} width={layout.w} height={layout.h} rx="6"
                      fill={`color-mix(in oklab, ${severityVar(sev)} 20%, transparent)`}
                      stroke={severityVar(sev)} strokeWidth={selected === z.id ? 3 : 1.5} />
                    <rect x={layout.x} y={layout.y} width={layout.w} height={layout.h} rx="6" fill="url(#hatch)" style={{color: severityVar(sev)}} />
                    <text x={layout.x + 10} y={layout.y + 20} fontSize="11" fontFamily="monospace" fill={severityVar(sev)}>{z.id}</text>
                    <text x={layout.x + 10} y={layout.y + 38} fontSize="13" fontWeight="600" fill="currentColor">{z.name}</text>
                    <text x={layout.x + 10} y={layout.y + 54} fontSize="10" fontFamily="monospace" fill="currentColor" opacity="0.6">
                      RISK {z.risk_score}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          )}
          {/* legend */}
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {(["critical","high","medium","low","normal"] as const).map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{background: severityVar(s)}} /> {s}
              </span>
            ))}
          </div>
        </SectionCard>

        <div className="space-y-4">
          {edit && (
            <SectionCard title="Admin · Layout controls" right={<span className="text-[10px] font-mono text-primary">EDIT MODE</span>}>
              <p className="text-xs text-muted-foreground mb-3">Adjust plant baselines and re-map zones. Select a zone on the map for zone-specific edits.</p>
              <div className="space-y-2.5 text-xs">
                <label className="block">Plant baseline sensitivity
                  <input type="range" defaultValue={64} className="w-full accent-[color:var(--primary)] mt-1" />
                </label>
                <label className="block">Auto-scale zone size to signal density
                  <input type="checkbox" defaultChecked className="ml-2 accent-[color:var(--primary)]" />
                </label>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button onClick={() => toast("Layout saved", "success")} className="h-8 px-3 rounded bg-primary text-primary-foreground text-xs font-medium">Save layout</button>
                  <button onClick={() => toast("Reverted to last saved layout", "info")} className="h-8 px-3 rounded border border-border bg-[var(--panel-elevated)] text-xs">Revert</button>
                </div>

              </div>
            </SectionCard>
          )}
          {!zone ? (
            <SectionCard title="Select a zone">
              <p className="text-sm text-muted-foreground">Click any zone on the map for its live signal stack.</p>
              <div className="mt-3 space-y-1.5">
                {(zones ?? []).slice(0, 6).map((z) => (
                  <button key={z.id} onClick={() => setSelected(z.id)} className="w-full flex items-center justify-between px-3 py-2 rounded-md border border-border bg-[var(--panel-elevated)] hover:border-primary/40 text-left">
                    <div>
                      <div className="text-sm">{z.name}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">{z.id}</div>
                    </div>
                    <SeverityPill s={apiSeverityToUi(z.risk_level)} />
                  </button>
                ))}
              </div>
            </SectionCard>
          ) : (
            <>
              <SectionCard title={zone.name} right={<button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}>
                <div className="flex items-center gap-4 mb-3">
                  <RiskGauge value={zone.risk_score} severity={apiSeverityToUi(zone.risk_level)} size={90} />
                  <div>
                    <div className="text-[11px] font-mono text-muted-foreground">{zone.id}</div>
                    <SeverityPill s={apiSeverityToUi(zone.risk_level)} />
                    <p className="text-xs text-muted-foreground mt-2">{zoneLayout(zone.id).desc}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Stat label="Events today" v={`${detail?.recent_events.length ?? "—"}`} />
                  <Stat label="Sensors" v={`${detail?.recent_gas_readings.length ?? "—"}`} />
                  <Stat label="Active permits" v={`${detail?.permits.filter((p) => p.status === "Active").length ?? "—"}`} />
                </div>
              </SectionCard>
              <SectionCard title="Live sensors">
                {!detail ? (
                  <Skeleton className="h-16 w-full" />
                ) : detail.recent_gas_readings.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No sensors reporting in this zone.</div>
                ) : detail.recent_gas_readings.map((s) => (
                  <div key={s.sensor_id} className="flex items-center justify-between py-1.5 text-sm border-b border-border/40 last:border-0">
                    <span className="font-mono text-xs">{s.sensor_id} · {s.gas_type}</span>
                    <span className="font-mono text-xs">{s.reading} {s.unit}</span>
                  </div>
                ))}
              </SectionCard>
              {edit && (
                <SectionCard title="Admin — Edit zone">
                  <div className="space-y-2 text-xs">
                    <label className="block">Name<input defaultValue={zone.name} className="mt-1 w-full h-8 px-2 rounded border border-border bg-[var(--panel-elevated)]" /></label>
                    <label className="block">Baseline threshold<input type="range" defaultValue={50} className="w-full accent-[color:var(--primary)]" /></label>
                    <button onClick={() => toast(`Saved changes to ${zone.name}`, "success")} className="h-8 px-3 rounded bg-primary text-primary-foreground text-xs font-medium">Save</button>
                  </div>
                </SectionCard>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function Stat({ label, v }: { label: string; v: string }) {
  return (
    <div className="rounded border border-border bg-[var(--panel-elevated)] p-2">
      <div className="text-lg font-mono font-semibold">{v}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
