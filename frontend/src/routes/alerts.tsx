import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader, SectionCard } from "@/components/app-layout";
import { SeverityPill, SignalChips, Skeleton } from "@/components/risk-primitives";
import { useState } from "react";
import { X, Search, Download, CheckCheck, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { apiSeverityToUi } from "@/lib/api";
import type { RiskEventOut } from "@/lib/api";
import { useRiskEvents, useUpdateRiskEventStatus } from "@/lib/queries";


export const Route = createFileRoute("/alerts")({
  head: () => ({ meta: [{ title: "Alert Center — FUSE.OS" }, { name: "robots", content: "noindex" }] }),
  component: Alerts,
});

function Alerts() {
  const [sev, setSev] = useState<"all"|"critical"|"high"|"medium"|"low">("all");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const { data: allEvents, isLoading } = useRiskEvents({ limit: 100 });
  const updateStatus = useUpdateRiskEventStatus();

  const events = allEvents ?? [];
  const list = events.filter((e) => {
    if (sev !== "all" && apiSeverityToUi(e.severity) !== sev) return false;
    if (q && !`${e.id} ${e.zone_id} ${e.risk_type} ${e.description}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const alert = sel ? events.find((e) => e.id === sel) : null;
  const someChecked = Object.values(checked).some(Boolean);

  async function bulkResolve() {
    const ids = Object.entries(checked).filter(([, v]) => v).map(([id]) => id);
    setChecked({});
    await Promise.all(ids.map((id) => updateStatus.mutateAsync({ id, status: "resolved" })));
    toast(`Marked ${ids.length} alert${ids.length === 1 ? "" : "s"} resolved`, "success");
  }

  function exportCsv() {
    const header = ["id", "zone", "risk_type", "severity", "confidence", "lead_time_minutes", "status", "timestamp", "description"];
    const rows = list.map((e) => [e.id, e.zone_id, e.risk_type, e.severity, e.confidence, e.lead_time_minutes ?? "", e.status, e.timestamp, e.description.replace(/"/g, "'")]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fuseos-alerts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${list.length} alerts as CSV`, "success");
  }

  return (
    <AppLayout>
      <PageHeader
        title="Compound Risk Alert Center"
        subtitle="Every flag carries its evidence chain. Filter, triage, and export the audit trail."
        actions={<>
          {someChecked && (
            <button onClick={bulkResolve} disabled={updateStatus.isPending} className="h-9 px-3 rounded-md border border-border bg-[var(--panel)] text-sm inline-flex items-center gap-1.5 disabled:opacity-60"><CheckCheck className="h-4 w-4" /> Mark resolved</button>
          )}
          <button onClick={exportCsv} className="h-9 px-3 rounded-md border border-border bg-[var(--panel)] text-sm inline-flex items-center gap-1.5"><Download className="h-4 w-4" /> Export</button>
        </>}
      />

      <div className="rounded-lg border border-border bg-[var(--panel)] mb-5">
        <div className="flex flex-wrap items-center gap-3 p-3 border-b border-border">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-4 w-4 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search alerts…"
              className="w-full h-9 pl-9 pr-3 rounded-md border border-border bg-[var(--panel-elevated)] text-sm outline-none focus:border-primary" />
          </div>
          <div className="flex gap-1 text-xs font-mono">
            {(["all","critical","high","medium","low"] as const).map((f) => (
              <button key={f} onClick={() => setSev(f)}
                className={`px-2.5 py-1.5 rounded uppercase tracking-wider ${sev === f ? "bg-primary/15 text-primary border border-primary/40" : "text-muted-foreground border border-border hover:border-primary/40"}`}>{f}</button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground font-mono">Showing {list.length} of {events.length}</div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground text-left border-b border-border">
              <th className="p-3 w-8"></th>
              <th className="p-3 font-medium">Alert</th>
              <th className="p-3 font-medium">Zone</th>
              <th className="p-3 font-medium">Signals</th>
              <th className="p-3 font-medium">Severity</th>
              <th className="p-3 font-medium">Confidence</th>
              <th className="p-3 font-medium">Lead-time</th>
              <th className="p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50"><td colSpan={8} className="p-3"><Skeleton className="h-5 w-full" /></td></tr>
              ))
            ) : list.length === 0 ? (
              <tr><td colSpan={8} className="p-6 text-center text-sm text-muted-foreground">No alerts match these filters.</td></tr>
            ) : list.map((e) => (
              <tr key={e.id} onClick={() => setSel(e.id)}
                className="border-b border-border/50 hover:bg-[var(--panel-elevated)]/60 cursor-pointer">
                <td className="p-3" onClick={(ev) => ev.stopPropagation()}>
                  <input type="checkbox" checked={!!checked[e.id]} onChange={(ev) => setChecked({ ...checked, [e.id]: ev.target.checked })} className="accent-[color:var(--primary)]" />
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-primary">{e.id}</span>
                    <span>{e.risk_type}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate max-w-[420px]">{e.description}</div>
                </td>
                <td className="p-3 font-mono text-xs">{e.zone_id}</td>
                <td className="p-3"><SignalChips signals={e.contributing_signals} /></td>
                <td className="p-3"><SeverityPill s={apiSeverityToUi(e.severity)} /></td>
                <td className="p-3 font-mono text-xs">{e.confidence}%</td>
                <td className="p-3 font-mono text-xs">{e.lead_time_minutes != null ? `${e.lead_time_minutes} min` : "—"}</td>
                <td className="p-3"><StatusPill s={e.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {alert && <AlertDrawer alert={alert} onClose={() => setSel(null)} updateStatus={updateStatus} />}
    </AppLayout>
  );
}

function AlertDrawer({ alert, onClose, updateStatus }: { alert: RiskEventOut; onClose: () => void; updateStatus: ReturnType<typeof useUpdateRiskEventStatus> }) {
  async function setStatus(status: string) {
    await updateStatus.mutateAsync({ id: alert.id, status });
    toast(`${alert.id} marked ${status}`, "success");
    if (status === "resolved") onClose();
  }

  return (
    <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <aside onClick={(e) => e.stopPropagation()} className="absolute right-0 top-0 h-full w-full max-w-2xl bg-[var(--panel)] border-l border-border overflow-y-auto">
        <header className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-muted-foreground">{alert.id}</span>
              <SeverityPill s={apiSeverityToUi(alert.severity)} />
            </div>
            <h2 className="text-xl font-display font-semibold">{alert.risk_type}</h2>
            <div className="mt-1 text-sm text-muted-foreground">
              {alert.zone_id} · Flagged at {new Date(alert.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}
              {alert.lead_time_minutes != null && ` · Lead-time ${alert.lead_time_minutes} min`} · Confidence {alert.confidence}%
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-md hover:bg-[var(--panel-elevated)] flex items-center justify-center"><X className="h-4 w-4" /></button>
        </header>
        <div className="p-5 space-y-4">
          <SectionCard title="Why this was flagged">
            <p className="text-sm text-foreground/90 leading-relaxed">{alert.description}</p>
            <div className="mt-3"><SignalChips signals={alert.contributing_signals} /></div>
          </SectionCard>
          <SectionCard title="Recommended action">
            <ol className="text-sm space-y-1.5 list-decimal list-inside text-foreground/90">
              <li>Pause active permits in {alert.zone_id}</li>
              <li>Force a ventilation / verification cycle as appropriate</li>
              <li>Re-verify sensor readings before resumption</li>
              <li>Notify Shift Superintendent and issuing authority</li>
            </ol>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setStatus("acknowledged")} disabled={updateStatus.isPending || alert.status !== "new"} className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50 inline-flex items-center gap-1.5">
                {updateStatus.isPending && <Loader2 className="h-3 w-3 animate-spin" />} Acknowledge
              </button>
              <button onClick={() => setStatus("resolved")} disabled={updateStatus.isPending || alert.status === "resolved"} className="h-8 px-3 rounded-md border border-border bg-[var(--panel-elevated)] text-xs disabled:opacity-50">Mark resolved</button>
            </div>
          </SectionCard>
        </div>
      </aside>
    </div>
  );
}

function StatusPill({ s }: { s: string }) {
  const map: Record<string, { c: string; l: string }> = {
    new:          { c: "var(--sev-critical)", l: "New" },
    acknowledged: { c: "var(--sev-medium)",   l: "Ack'd" },
    resolved:     { c: "var(--sev-normal)",   l: "Resolved" },
  };
  const m = map[s] ?? map.new;
  return <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded" style={{ color: m.c, background: `color-mix(in oklab, ${m.c} 15%, transparent)` }}>{m.l}</span>;
}
