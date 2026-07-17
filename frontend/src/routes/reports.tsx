import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader, SectionCard } from "@/components/app-layout";
import { FileText, Calendar, Filter, Download, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "@/lib/toast";
import { generateReport, ApiError, type ReportType } from "@/lib/api";
import { useZones } from "@/lib/queries";


export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — FUSE.OS" }, { name: "robots", content: "noindex" }] }),
  component: Reports,
});

const TYPES: { id: ReportType; title: string; desc: string; cadence: string }[] = [
  { id: "daily_risk",         title: "Daily Risk Summary",          desc: "Every alert, every zone, every signal — the day at a glance.",      cadence: "Typically daily" },
  { id: "weekly_compound",    title: "Weekly Compound Risk Report", desc: "Trend analysis of correlated risks, with rule context.",             cadence: "Typically weekly" },
  { id: "permit_audit",       title: "Permit Audit Report",         desc: "Every permit issued, closed, or flagged during the period.",         cadence: "On demand" },
  { id: "compliance_gap",     title: "Compliance Gap Report",       desc: "OISD/DGMS/Factory Act deviations with cited sources.",               cadence: "Typically monthly" },
  { id: "data_source_health", title: "Data Source Health Report",   desc: "Sensor/SCADA/PTW connector uptime and read coverage.",               cadence: "Typically weekly" },
  { id: "monthly_executive",  title: "Monthly Executive Summary",   desc: "Roll-up of risk posture, incidents, and lead-time.",                  cadence: "Typically monthly" },
];

// What each report ACTUALLY contains — kept in sync with backend/app/api/reports.py's
// section headings, so this panel never promises something the PDF doesn't have.
const INCLUDES: Record<ReportType, string[]> = {
  daily_risk: ["Compound-risk alerts (all severities)", "Permit conflicts flagged, with reasons", "Sensor threshold breaches", "Shift handover log entries", "System-generated recommendations (rule-based, not live AI)"],
  weekly_compound: ["Trend by risk type", "Trend by zone", "Full compound-event detail table", "Currently enabled risk-rule context"],
  permit_audit: ["Full permit register for the period", "Hazard class & issuer per permit", "Flagged/conflicted permit detail with reasons"],
  compliance_gap: ["Detected gaps with regulation reference", "Zone + detection date", "Open vs. resolved status", "Standards referenced"],
  data_source_health: ["Connector status & last sync", "Sensor read coverage & data age", "Enabled/disabled state per source"],
  monthly_executive: ["Executive summary paragraph", "Severity breakdown", "Top zones by risk volume", "Permit & compliance rollup KPIs"],
};

const DEFAULT_DAYS: Record<ReportType, number> = {
  daily_risk: 1, weekly_compound: 7, permit_audit: 7,
  compliance_gap: 30, data_source_health: 7, monthly_executive: 30,
};

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function Reports() {
  const [sel, setSel] = useState<ReportType>("weekly_compound");
  const [dateFrom, setDateFrom] = useState(isoDaysAgo(DEFAULT_DAYS.weekly_compound));
  const [dateTo, setDateTo] = useState(todayIso());
  const [zoneId, setZoneId] = useState("all");
  const [shift, setShift] = useState("all");
  const [severityFloor, setSeverityFloor] = useState("medium");
  const [exporting, setExporting] = useState(false);
  const [scheduled, setScheduled] = useState(false);

  const { data: zones } = useZones();
  const current = TYPES.find((t) => t.id === sel)!;

  function selectType(id: ReportType) {
    setSel(id);
    setDateFrom(isoDaysAgo(DEFAULT_DAYS[id]));
    setDateTo(todayIso());
  }

  async function exportPdf() {
    setExporting(true);
    try {
      const { blob, filename } = await generateReport({
        report_type: sel,
        date_from: dateFrom || null,
        date_to: dateTo || null,
        zone_id: zoneId,
        shift,
        severity_floor: severityFloor,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast(`${current.title} generated and downloaded`, "success");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Could not generate report", "error");
    } finally {
      setExporting(false);
    }
  }

  function schedule() {
    // Honest about what this does: there's no job scheduler in this backend
    // (no cron/celery/etc.), so this doesn't wire up real automated delivery —
    // it just confirms the preference locally rather than pretending to.
    setScheduled(true);
    toast(`Schedule preference noted for "${current.title}" — demo only, no automated delivery pipeline is wired up yet`, "info");
    setTimeout(() => setScheduled(false), 2500);
  }

  return (
    <AppLayout>
      <PageHeader title="Reports" subtitle="Audit-ready exports, generated live from current plant data." />

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mb-6">
        {TYPES.map((t) => (
          <button key={t.id} onClick={() => selectType(t.id)}
            className={`text-left rounded-lg border p-4 bg-[var(--panel)] transition-colors ${sel === t.id ? "border-primary/60 bg-primary/5" : "border-border hover:border-primary/40"}`}>
            <div className="flex items-start justify-between mb-2">
              <div className="h-9 w-9 rounded-md bg-primary/12 border border-primary/40 flex items-center justify-center">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              {sel === t.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
            </div>
            <div className="font-semibold text-sm">{t.title}</div>
            <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{t.desc}</div>
            <div className="mt-3 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{t.cadence}</div>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-5">
        <SectionCard title="Configure" right={<Filter className="h-4 w-4 text-muted-foreground" />}>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <label className="block">
              <span className="text-muted-foreground uppercase tracking-wider text-[10px]">From</span>
              <div className="mt-1 relative">
                <Calendar className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground pointer-events-none" />
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded border border-border bg-[var(--panel-elevated)]" />
              </div>
            </label>
            <label className="block">
              <span className="text-muted-foreground uppercase tracking-wider text-[10px]">To</span>
              <div className="mt-1 relative">
                <Calendar className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground pointer-events-none" />
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded border border-border bg-[var(--panel-elevated)]" />
              </div>
            </label>
            <label className="block">
              <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Zone filter</span>
              <select value={zoneId} onChange={(e) => setZoneId(e.target.value)} className="mt-1 w-full h-9 px-3 rounded border border-border bg-[var(--panel-elevated)]">
                <option value="all">All zones</option>
                {(zones ?? []).map((z) => <option key={z.id} value={z.id}>{z.id} · {z.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Shift</span>
              <select value={shift} onChange={(e) => setShift(e.target.value)} className="mt-1 w-full h-9 px-3 rounded border border-border bg-[var(--panel-elevated)]">
                <option value="all">All shifts</option>
                <option value="Shift A">Shift A</option>
                <option value="Shift B">Shift B</option>
                <option value="Shift C">Shift C</option>
              </select>
            </label>
            <label className="block col-span-2">
              <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Severity floor</span>
              <select value={severityFloor} onChange={(e) => setSeverityFloor(e.target.value)} className="mt-1 w-full h-9 px-3 rounded border border-border bg-[var(--panel-elevated)]">
                <option value="all">All</option>
                <option value="low">Low+</option>
                <option value="medium">Medium+</option>
                <option value="high">High+</option>
                <option value="critical">Critical only</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={exportPdf} disabled={exporting} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-60">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} {exporting ? "Generating…" : "Export as PDF"}
            </button>
            <button onClick={schedule} disabled={scheduled} className="h-9 px-4 rounded-md border border-border bg-[var(--panel)] text-sm disabled:opacity-60">
              {scheduled ? "Noted" : "Schedule"}
            </button>
          </div>
        </SectionCard>

        <SectionCard title="What this report includes">
          <div className="text-sm mb-3 font-semibold">{current.title}</div>
          <ul className="space-y-1.5 text-sm text-foreground/85">
            {INCLUDES[sel].map((i) => (
              <li key={i} className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />{i}</li>
            ))}
          </ul>
          <div className="mt-4 text-[11px] text-muted-foreground font-mono">Generated live from current plant data · PDF, no CSV appendix</div>
        </SectionCard>
      </div>
    </AppLayout>
  );
}
