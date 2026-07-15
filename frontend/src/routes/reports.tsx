import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader, SectionCard } from "@/components/app-layout";
import { FileText, Calendar, Filter, Download, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "@/lib/toast";


export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — FUSE.OS" }, { name: "robots", content: "noindex" }] }),
  component: Reports,
});

const TYPES = [
  { id: "daily",    title: "Daily Risk Summary",         desc: "Every alert, every zone, every signal — the day at a glance.", cadence: "Daily 22:00" },
  { id: "weekly",   title: "Weekly Compound Risk Report",desc: "Trend analysis of correlated risks with rule-level attribution.", cadence: "Mondays 08:00" },
  { id: "audit",    title: "Permit Audit Report",        desc: "Every PTW issued, closed, or flagged during the period.",         cadence: "On demand" },
  { id: "gap",      title: "Compliance Gap Report",      desc: "OISD, DGMS and Factory Act deviations with cited sources.",       cadence: "Monthly" },
  { id: "health",   title: "Data Source Health Report",  desc: "Sensor/SCADA/PTW connector uptime, drift and gaps.",              cadence: "Weekly" },
  { id: "exec",     title: "Monthly Executive Summary",  desc: "Board-ready roll-up of risk posture, incidents and lead-time.",    cadence: "1st of month" },
];

const INCLUDES: Record<string, string[]> = {
  daily:  ["All compound-risk alerts", "Permit conflicts flagged", "Sensor threshold breaches", "Shift handover observations", "Copilot recommendations issued"],
  weekly: ["Rule-level trigger frequency", "Zone risk trajectory charts", "Comparative lead-time vs prior week", "Contributing signal breakdown"],
  audit:  ["Every PTW with lifecycle timestamps", "Flagged conflicts with reasoning", "Issuer/approver chain", "Related sensor evidence"],
  gap:    ["Detected regulatory deviations", "Standards cited (OISD/DGMS/IS)", "Zone-scoped exposure duration", "Remediation status"],
  health: ["Connector uptime %", "Last sync per data source", "Calibration drift observations", "Coverage gaps by zone"],
  exec:   ["Plant-wide risk score trend", "Incidents avoided (est.)", "Rule-pack performance", "Compliance posture"],
};

function Reports() {
  const [sel, setSel] = useState("weekly");

  return (
    <AppLayout>
      <PageHeader title="Reports" subtitle="Audit-ready exports. Every artifact carries the evidence chain." />

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mb-6">
        {TYPES.map((t) => (
          <button key={t.id} onClick={() => setSel(t.id)}
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
              <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Date range</span>
              <div className="mt-1 relative">
                <Calendar className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                <input defaultValue="Nov 3 – Nov 9, 2026" className="w-full h-9 pl-9 pr-3 rounded border border-border bg-[var(--panel-elevated)]" />
              </div>
            </label>
            <label className="block">
              <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Zone filter</span>
              <select defaultValue="all" className="mt-1 w-full h-9 px-3 rounded border border-border bg-[var(--panel-elevated)]">
                <option value="all">All zones</option>
                <option>Coke Ovens (Z-A*)</option>
                <option>By-Product (Z-B*)</option>
                <option>Cast House (Z-C*)</option>
                <option>Utilities (Z-D*)</option>
              </select>
            </label>
            <label className="block">
              <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Shift</span>
              <select defaultValue="all" className="mt-1 w-full h-9 px-3 rounded border border-border bg-[var(--panel-elevated)]">
                <option value="all">All shifts</option>
                <option>Shift A (22–06)</option>
                <option>Shift B (06–14)</option>
                <option>Shift C (14–22)</option>
              </select>
            </label>
            <label className="block">
              <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Severity floor</span>
              <select defaultValue="medium" className="mt-1 w-full h-9 px-3 rounded border border-border bg-[var(--panel-elevated)]">
                <option>All</option><option>Low+</option><option value="medium">Medium+</option><option>High+</option><option>Critical only</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => toast(`Exporting "${TYPES.find(t=>t.id===sel)!.title}" as signed PDF…`, "success")} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5"><Download className="h-4 w-4" /> Export as PDF</button>
            <button onClick={() => toast("Report scheduled — next delivery Monday 08:00 IST", "info")} className="h-9 px-4 rounded-md border border-border bg-[var(--panel)] text-sm">Schedule</button>
          </div>

        </SectionCard>

        <SectionCard title="What this report includes">
          <div className="text-sm mb-3 font-semibold">{TYPES.find((t) => t.id === sel)!.title}</div>
          <ul className="space-y-1.5 text-sm text-foreground/85">
            {INCLUDES[sel].map((i) => (
              <li key={i} className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />{i}</li>
            ))}
          </ul>
          <div className="mt-4 text-[11px] text-muted-foreground font-mono">Delivered as signed PDF · CSV appendix included</div>
        </SectionCard>
      </div>
    </AppLayout>
  );
}
