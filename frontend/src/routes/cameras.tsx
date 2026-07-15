import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader, SectionCard } from "@/components/app-layout";
import { Skeleton } from "@/components/risk-primitives";
import { useState } from "react";
import { Video, VideoOff, AlertTriangle, Plus, Search } from "lucide-react";
import { toast } from "@/lib/toast";
import { useCameras, useZones } from "@/lib/queries";

export const Route = createFileRoute("/cameras")({
  head: () => ({ meta: [{ title: "Live Feed & Camera Status — FUSE.OS" }, { name: "robots", content: "noindex" }] }),
  component: Cameras,
});

function statusMeta(s: string) {
  if (s === "online")   return { color: "var(--sev-normal)",   label: "Online" };
  if (s === "degraded") return { color: "var(--sev-medium)",   label: "Degraded" };
  return                        { color: "var(--sev-critical)", label: "Offline" };
}

function Cameras() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all"|"online"|"degraded"|"offline">("all");
  const { data: cameras, isLoading } = useCameras();
  const { data: zones } = useZones();

  const all = cameras ?? [];
  const list = all.filter((c) => {
    if (filter !== "all" && c.status !== filter) return false;
    if (q && !`${c.id} ${c.name} ${c.zone_id}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const counts = {
    online:   all.filter(c => c.status === "online").length,
    degraded: all.filter(c => c.status === "degraded").length,
    offline:  all.filter(c => c.status === "offline").length,
  };

  return (
    <AppLayout>
      <PageHeader
        title="Live Feed & Camera Status"
        subtitle="Infrastructure health of the PPE vision layer. Feeds into the fusion engine as one more signal."
        actions={
          <button
            onClick={() => toast("Manage cameras from Settings → Cameras", "info")}
            className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" /> Add camera
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
        ) : (
          <>
            <Kpi v={all.length}       l="Cameras installed" tone="var(--primary)" />
            <Kpi v={counts.online}    l="Online"   tone="var(--sev-normal)" />
            <Kpi v={counts.degraded}  l="Degraded" tone="var(--sev-medium)" />
            <Kpi v={counts.offline}   l="Offline"  tone="var(--sev-critical)" />
          </>
        )}
      </div>

      <SectionCard>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-4 w-4 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by camera or zone…"
              className="w-full h-9 pl-9 pr-3 rounded-md border border-border bg-[var(--panel-elevated)] text-sm outline-none focus:border-primary" />
          </div>
          <div className="flex gap-1 text-xs font-mono">
            {(["all","online","degraded","offline"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-2.5 py-1.5 rounded uppercase tracking-wider ${filter === f ? "bg-primary/15 text-primary border border-primary/40" : "text-muted-foreground border border-border hover:border-primary/40"}`}>{f}</button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground font-mono">Showing {list.length} of {all.length}</div>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
          </div>
        ) : list.length === 0 ? (
          <div className="text-sm text-muted-foreground py-10 text-center">No cameras match these filters.</div>
        ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {list.map((c) => {
            const m = statusMeta(c.status);
            const zone = zones?.find(z => z.id === c.zone_id);
            return (
              <div key={c.id} className="rounded-lg border border-border bg-[var(--panel-elevated)] overflow-hidden flex flex-col">
                <div className="aspect-video bg-[var(--panel)] border-b border-border relative flex items-center justify-center">
                  {c.status === "offline" ? (
                    <div className="flex flex-col items-center gap-1.5 text-[color:var(--sev-critical)]">
                      <VideoOff className="h-6 w-6" />
                      <span className="text-[10px] font-mono uppercase tracking-wider">No signal</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                      <Video className="h-6 w-6" />
                      <span className="text-[10px] font-mono uppercase tracking-wider">Preview disabled · status only</span>
                    </div>
                  )}
                  <span
                    className="absolute top-2 left-2 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border"
                    style={{ color: m.color, borderColor: `color-mix(in oklab, ${m.color} 40%, transparent)`, background: `color-mix(in oklab, ${m.color} 15%, transparent)` }}
                  >
                    <span className="inline-block h-1.5 w-1.5 rounded-full mr-1 align-middle" style={{ background: m.color }} />
                    {m.label}
                  </span>
                </div>
                <div className="p-3">
                  <div className="text-[11px] font-mono text-muted-foreground">CAM-{c.id}</div>
                  <div className="font-semibold text-sm truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{c.zone_id}{zone ? ` · ${zone.name}` : ""}</div>
                  <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                    <span>Last frame · {c.last_frame_at ? new Date(c.last_frame_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }) : "—"}</span>
                    {c.status === "degraded" && <span className="inline-flex items-center gap-1 text-[color:var(--sev-medium)]"><AlertTriangle className="h-3 w-3" /> latency</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </SectionCard>
    </AppLayout>
  );
}

function Kpi({ v, l, tone }: { v: number | string; l: string; tone: string }) {
  return (
    <div className="rounded-lg border border-border bg-[var(--panel)] p-3.5">
      <div className="text-2xl font-display font-semibold font-mono" style={{ color: tone }}>{v}</div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">{l}</div>
    </div>
  );
}
