import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader, SectionCard } from "@/components/app-layout";
import { Skeleton } from "@/components/risk-primitives";
import { ScrollText, Search, BookOpen, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "@/lib/toast";
import { useComplianceGaps, useComplianceHealth } from "@/lib/queries";


export const Route = createFileRoute("/compliance")({
  head: () => ({ meta: [{ title: "Compliance Intelligence — FUSE.OS" }, { name: "robots", content: "noindex" }] }),
  component: Compliance,
});

// The "Ask FUSE Compliance" panel is a scripted demo Q&A (same pattern as the
// AI Copilot elsewhere in the app) — there's no regulatory-citation endpoint
// on the backend to wire this to, so it stays local/illustrative.
const CITATIONS = [
  { src: "OISD-STD-105 Rev.4", note: "Work permit systems for oil & gas installations" },
  { src: "Factories Act 1948", note: "Chapter IV §41-C — Compulsory disclosure of chemical hazards" },
  { src: "IS 5571:2009",        note: "Selection of electrical equipment for hazardous areas" },
];

function Compliance() {
  const [q, setQ] = useState("");
  const [ans, setAns] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const { data: gaps, isLoading: gapsLoading } = useComplianceGaps();
  const { data: health, isLoading: healthLoading } = useComplianceHealth();
  const gapsList = gaps ?? [];

  function ask(text: string) {
    setAns(
      `Per ${CITATIONS[0].src}, ${CITATIONS[0].note}. Cross-referencing your currently open compliance gaps and active permits may surface items relevant to this question — see the detected gaps list alongside for what's live right now.`
    );
    setQ(text);
  }

  return (
    <AppLayout>
      <PageHeader title="Regulatory & Compliance Intelligence" subtitle="Ask a compliance question — get an answer with citations. Detected gaps sit alongside." />

      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-5">
        <SectionCard title="Ask FUSE Compliance">
          <div className="relative">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-3.5" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask(q)}
              placeholder='e.g. "What is the O2 re-check interval for confined-space entry under OISD?"'
              className="w-full h-11 pl-10 pr-3 rounded-md border border-border bg-[var(--panel-elevated)] text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
            {[
              "Confined-space O2 requirements",
              "Hot-work permit downwind checks",
              "Ammonia storage separation distance",
              "Hazardous area classification review cadence",
            ].map((s) => (
              <button key={s} onClick={() => ask(s)} className="px-2 py-1 rounded-md border border-border bg-[var(--panel-elevated)] text-muted-foreground hover:text-foreground hover:border-primary/50">{s}</button>
            ))}
          </div>
          {ans && (
            <div className="mt-4 rounded-md border border-primary/40 bg-primary/8 p-4">
              <div className="text-[10px] uppercase tracking-wider text-primary font-mono mb-1.5">Answer</div>
              <p className="text-sm leading-relaxed text-foreground/90">{ans}</p>
              <div className="mt-3 pt-3 border-t border-primary/20 space-y-1">
                <div className="text-[10px] uppercase tracking-wider text-primary font-mono">Cited sources</div>
                {CITATIONS.map((c) => (
                  <div key={c.src} className="flex items-start gap-2 text-xs text-muted-foreground"><BookOpen className="h-3 w-3 mt-0.5 text-primary" /><span><span className="text-foreground font-mono">{c.src}</span> — {c.note}</span></div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Compliance Health">
          {healthLoading || !health ? (
            <div className="grid grid-cols-3 gap-2 mb-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : (
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="rounded border border-border bg-[var(--panel-elevated)] p-3 text-center">
                <div className="text-2xl font-mono font-semibold text-[color:var(--sev-low)]">{Math.round(health.coverage_pct)}<span className="text-xs">%</span></div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Coverage</div>
              </div>
              <div className="rounded border border-border bg-[var(--panel-elevated)] p-3 text-center">
                <div className="text-2xl font-mono font-semibold text-[color:var(--sev-medium)]">{health.open_gaps}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Open gaps</div>
              </div>
              <div className="rounded border border-border bg-[var(--panel-elevated)] p-3 text-center">
                <div className="text-2xl font-mono font-semibold">{health.standards_referenced}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Standards</div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Aligned with OISD, DGMS, Factory Act, IS 5571.
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Detected Compliance Gaps" className="mt-5" right={<span className="text-[11px] font-mono text-muted-foreground inline-flex items-center gap-1.5"><ScrollText className="h-3.5 w-3.5" /> {gapsList.length} total</span>}>
        {gapsLoading ? (
          <div className="space-y-3 py-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : gapsList.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">No compliance gaps detected right now.</div>
        ) : (
          <>
            <div className="divide-y divide-border">
              {(showAll ? gapsList : gapsList.slice(0, 4)).map((g) => (
                <div key={g.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[color:var(--sev-medium)]" />
                      <span className="font-mono text-xs text-primary">{g.regulation_ref}</span>
                      <span className="text-xs font-mono text-muted-foreground">· {g.zone_id}</span>
                      {g.status !== "open" && <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded text-[color:var(--sev-normal)] bg-[color:var(--sev-normal)]/10">{g.status}</span>}
                    </div>
                    <div className="text-sm">{g.description}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">Detected {new Date(g.detected_at).toLocaleString("en-IN")}{g.source && ` · Source: ${g.source}`}</div>
                  </div>
                  <button onClick={() => toast(`Case opened for ${g.regulation_ref} · ${g.zone_id}`, "info")} className="text-xs text-primary hover:underline shrink-0">Open case →</button>
                </div>
              ))}
            </div>
            {gapsList.length > 4 && (
              <div className="pt-3 mt-1 border-t border-border flex items-center justify-between">
                <span className="text-[11px] font-mono text-muted-foreground">{showAll ? `Showing all ${gapsList.length}` : `Showing 4 of ${gapsList.length}`}</span>
                <button onClick={() => setShowAll(!showAll)} className="text-xs text-primary hover:underline">
                  {showAll ? "Show fewer" : `Load ${gapsList.length - 4} more →`}
                </button>
              </div>
            )}
          </>
        )}
      </SectionCard>
    </AppLayout>
  );
}
