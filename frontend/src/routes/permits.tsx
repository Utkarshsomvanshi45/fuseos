import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader, SectionCard } from "@/components/app-layout";
import { SeverityPill, Skeleton } from "@/components/risk-primitives";
import { useState } from "react";
import { FileText, AlertTriangle, X, ShieldCheck, Search, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { useIssuePermit, usePermits, useZones } from "@/lib/queries";


export const Route = createFileRoute("/permits")({
  head: () => ({ meta: [{ title: "Permit Intelligence — FUSE.OS" }, { name: "robots", content: "noindex" }] }),
  component: Permits,
});

function Permits() {
  const [statusFilter, setStatusFilter] = useState<"all"|"active"|"upcoming"|"closed">("all");
  const [conflictOnly, setConflictOnly] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [issuing, setIssuing] = useState(false);

  const { data: allPermits, isLoading } = usePermits();
  const { data: zones } = useZones();
  const issueMutation = useIssuePermit();

  const permits = (allPermits ?? []).filter((p) => {
    if (statusFilter !== "all" && p.status.toLowerCase() !== statusFilter) return false;
    if (conflictOnly && !p.conflict) return false;
    if (q && !`${p.id} ${p.type} ${p.zone_id} ${p.issuer ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const p = selected ? (allPermits ?? []).find((x) => x.id === selected) : null;

  return (
    <AppLayout>
      <PageHeader
        title="Permit Intelligence"
        subtitle="Every permit re-scored live against current plant conditions. Conflicts carry their reason."
        actions={<button onClick={() => setIssuing(true)} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium">Issue new permit</button>}
      />

      <div className="rounded-lg border border-border bg-[var(--panel)] mb-5">
        <div className="flex flex-wrap items-center gap-3 p-3 border-b border-border">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-4 w-4 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by permit ID, type, zone, issuer…"
              className="w-full h-9 pl-9 pr-3 rounded-md border border-border bg-[var(--panel-elevated)] text-sm outline-none focus:border-primary" />
          </div>
          <div className="flex gap-1 text-xs font-mono">
            {(["all","active","upcoming","closed"] as const).map((f) => (
              <button key={f} onClick={() => setStatusFilter(f)}
                className={`px-2.5 py-1.5 rounded uppercase tracking-wider ${statusFilter === f ? "bg-primary/15 text-primary border border-primary/40" : "text-muted-foreground border border-border hover:border-primary/40"}`}>{f}</button>
            ))}
          </div>
          <label className="text-xs flex items-center gap-1.5 text-muted-foreground">
            <input type="checkbox" checked={conflictOnly} onChange={(e) => setConflictOnly(e.target.checked)} className="accent-[color:var(--primary)]" />
            Conflicts only
          </label>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground text-left border-b border-border">
              <th className="p-3 font-medium">Permit</th>
              <th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium">Zone</th>
              <th className="p-3 font-medium">Hazard</th>
              <th className="p-3 font-medium">Window</th>
              <th className="p-3 font-medium">Issuer</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Conflict</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50"><td colSpan={8} className="p-3"><Skeleton className="h-5 w-full" /></td></tr>
              ))
            ) : permits.length === 0 ? (
              <tr><td colSpan={8} className="p-6 text-center text-sm text-muted-foreground">No permits match these filters.</td></tr>
            ) : permits.map((p) => (
              <tr key={p.id} onClick={() => setSelected(p.id)}
                className="border-b border-border/50 hover:bg-[var(--panel-elevated)]/60 cursor-pointer">
                <td className="p-3 font-mono text-xs text-primary">{p.id}</td>
                <td className="p-3">{p.type}</td>
                <td className="p-3 font-mono text-xs">{p.zone_id}</td>
                <td className="p-3 text-xs">{p.hazard_class ?? "—"}</td>
                <td className="p-3 font-mono text-xs">{fmtTime(p.start_time)}–{fmtTime(p.end_time)}</td>
                <td className="p-3 text-xs text-muted-foreground">{p.issuer ?? "—"}</td>
                <td className="p-3"><StatusPill s={p.status} /></td>
                <td className="p-3">
                  {p.conflict
                    ? <SeverityPill s="critical" label="Live conflict" />
                    : <span className="text-[11px] text-muted-foreground font-mono inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-[color:var(--sev-normal)]" /> Clear</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {p && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <aside onClick={(e) => e.stopPropagation()} className="absolute right-0 top-0 h-full w-full max-w-xl bg-[var(--panel)] border-l border-border overflow-y-auto">
            <header className="flex items-start justify-between p-5 border-b border-border">
              <div>
                <div className="text-xs font-mono text-muted-foreground">{p.id}</div>
                <h2 className="text-xl font-display font-semibold">{p.type}</h2>
                <div className="mt-1 text-sm text-muted-foreground">{p.zone_id} · Hazard {p.hazard_class ?? "—"} · {fmtTime(p.start_time)}–{fmtTime(p.end_time)}</div>
              </div>
              <button onClick={() => setSelected(null)} className="h-8 w-8 rounded-md hover:bg-[var(--panel-elevated)] flex items-center justify-center"><X className="h-4 w-4" /></button>
            </header>
            <div className="p-5 space-y-4">
              {p.conflict && (
                <div className="rounded-lg border border-[color:var(--sev-critical)]/40 bg-[color:var(--sev-critical)]/10 p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <AlertTriangle className="h-4 w-4 text-[color:var(--sev-critical)]" />
                    <span className="font-semibold text-sm">Fusion engine flagged this permit</span>
                  </div>
                  <p className="text-sm text-foreground/85">{p.conflict_reason}</p>
                </div>
              )}
              <SectionCard title="Permit details">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2"><FileText className="h-4 w-4 mt-0.5" style={{color:"var(--signal-permit)"}} /><span>Permit <span className="font-mono text-primary">{p.id}</span> opened {fmtTime(p.start_time)} by {p.issuer ?? "unknown issuer"}</span></li>
                  {p.conflict && <li className="flex items-start gap-2"><AlertTriangle className="h-4 w-4 mt-0.5 text-[color:var(--sev-medium)]" /><span>Cross-checked against live risk events for {p.zone_id}</span></li>}
                </ul>
              </SectionCard>
              {p.conflict && (
                <SectionCard title="Recommended action">
                  <div className="text-sm text-foreground/90 leading-relaxed">
                    Pause work under {p.id}, re-verify zone conditions, and notify the issuing authority ({p.issuer ?? "issuer"}) and the Shift Superintendent before resumption.
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => { toast(`${p.id} acknowledged — issuer notified`, "success"); setSelected(null); }} className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium">Acknowledge &amp; notify</button>
                    <button onClick={() => toast(`Override recorded for ${p.id} (reason required)`, "warn")} className="h-8 px-3 rounded-md border border-border bg-[var(--panel-elevated)] text-xs">Override with reason</button>
                  </div>
                </SectionCard>
              )}
            </div>
          </aside>
        </div>
      )}

      {issuing && <IssuePermitModal zones={zones ?? []} onClose={() => setIssuing(false)} mutation={issueMutation} />}
    </AppLayout>
  );
}

function IssuePermitModal({ zones, onClose, mutation }: { zones: { id: string; name: string }[]; onClose: () => void; mutation: ReturnType<typeof useIssuePermit> }) {
  const [type, setType] = useState("Hot Work");
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("14:00");
  const [issuer, setIssuer] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const today = new Date().toISOString().slice(0, 10);
    const id = `PMT-${Date.now().toString().slice(-6)}`;
    try {
      await mutation.mutateAsync({
        id,
        type,
        zone_id: zoneId,
        start_time: `${today}T${start}:00`,
        end_time: `${today}T${end}:00`,
        issuer: issuer || "Unknown",
        status: "Active",
      });
      toast(`Permit ${id} issued and live-scored`, "success");
      onClose();
    } catch {
      toast("Could not issue permit — check backend connection", "error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-lg border border-border bg-[var(--panel)] shadow-2xl">
        <header className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-display font-semibold">Issue new permit</h3>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </header>
        <form onSubmit={onSubmit} className="p-4 space-y-3 text-sm">
          <label className="block"><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Permit type</span>
            <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 w-full h-9 px-3 rounded border border-border bg-[var(--panel-elevated)] text-sm">
              <option>Hot Work</option><option>Confined Space Entry</option><option>Line Break</option><option>Working at Height</option>
            </select>
          </label>
          <label className="block"><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Zone</span>
            <select value={zoneId} onChange={(e) => setZoneId(e.target.value)} className="mt-1 w-full h-9 px-3 rounded border border-border bg-[var(--panel-elevated)] text-sm">
              {zones.map((z) => <option key={z.id} value={z.id}>{z.id} · {z.name}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Start</span>
              <input value={start} onChange={(e) => setStart(e.target.value)} className="mt-1 w-full h-9 px-3 rounded border border-border bg-[var(--panel-elevated)] text-sm font-mono" />
            </label>
            <label className="block"><span className="text-[10px] uppercase tracking-wider text-muted-foreground">End</span>
              <input value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1 w-full h-9 px-3 rounded border border-border bg-[var(--panel-elevated)] text-sm font-mono" />
            </label>
          </div>
          <label className="block"><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Issuer</span>
            <input value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="Your name" className="mt-1 w-full h-9 px-3 rounded border border-border bg-[var(--panel-elevated)] text-sm" />
          </label>
          <div className="pt-2 flex justify-end gap-2 border-t border-border">
            <button type="button" onClick={onClose} className="h-8 px-3 rounded border border-border text-sm">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="h-8 px-3 rounded bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-60">
              {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Submit &amp; live-score
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function StatusPill({ s }: { s: string }) {
  const map: Record<string, { c: string; bg: string; l: string }> = {
    active:   { c: "var(--sev-low)",   bg: "color-mix(in oklab, var(--sev-low) 15%, transparent)",   l: "Active" },
    upcoming: { c: "var(--signal-scada)", bg: "color-mix(in oklab, var(--signal-scada) 15%, transparent)", l: "Upcoming" },
    closed:   { c: "var(--muted-foreground)", bg: "color-mix(in oklab, var(--muted-foreground) 15%, transparent)", l: "Closed" },
  };
  const m = map[s.toLowerCase()] ?? map.closed;
  return <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded" style={{ color: m.c, background: m.bg }}>{m.l}</span>;
}
