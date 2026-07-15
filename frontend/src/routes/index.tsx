import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Zap, ArrowRight, ShieldCheck, Radar, FileText, Map, Cpu,
  FileBarChart, AlertTriangle, Activity, CheckCircle2,
} from "lucide-react";
import { SeverityPill, SignalChips, Sparkline } from "@/components/risk-primitives";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FUSE.OS — See compound risk before it becomes incident" },
      { name: "description", content: "FUSE.OS is the risk fusion engine for heavy industry. Correlate permits, gas sensors, SCADA and shift data into one live picture — and catch the dangerous combinations no single system can see." },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Radar,        title: "Compound Risk Detection",     desc: "Rules fuse across permits, sensors, SCADA and shifts. A hot-work permit alone is fine — a hot-work permit next to rising CO isn't." },
  { icon: FileText,     title: "Permit Intelligence",         desc: "Every active PTW is re-scored every 30s against live plant conditions. Conflicts surface with the exact reason attached." },
  { icon: Map,          title: "Zone Risk Map",               desc: "Your plant floor, color-coded by real-time correlated risk. Click any zone for the full contributing signal stack." },
  { icon: Activity,     title: "Predictive Lead-Time Alerts", desc: "Statistical models flag threshold-approach trajectories 15–90 minutes before breach. Time to act, not react." },
  { icon: Cpu,          title: "Live Fusion Engine",          desc: "Streaming correlation across gas, SCADA, permits, roster and weather. Sub-second latency, on-prem or edge." },
  { icon: FileBarChart, title: "Audit-Ready Reporting",       desc: "Every alert carries its full evidence chain. Compliance exports in OISD, DGMS and Factory Act formats." },
];

const STATS = [
  { n: "48", l: "Plants monitored" },
  { n: "12,400+", l: "Compound risks caught" },
  { n: "38 min", l: "Avg lead-time before incident" },
  { n: "1,860", l: "Zones under fusion" },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border/70 bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-md bg-primary/15 border border-primary/40 flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary" strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <div className="font-display font-bold tracking-tight">FUSE<span className="text-primary">.OS</span></div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Risk Fusion Engine</div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground ml-6">
            <a href="#platform" className="hover:text-foreground">Platform</a>
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#how"     className="hover:text-foreground">How it works</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5">Sign in</Link>
            <a href="#demo" className="text-sm bg-primary text-primary-foreground px-3.5 py-1.5 rounded-md font-medium hover:brightness-110 inline-flex items-center gap-1.5">
              Request a demo <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden grid-bg border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28 relative">
          <div className="grid lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-primary border border-primary/40 bg-primary/10 rounded-full px-3 py-1 mb-6">
                <span className="pulse-dot" /> Fusion engine online · 48 plants
              </div>
              <h1 className="text-5xl md:text-6xl font-display font-bold tracking-tight leading-[1.02]">
                Isolated readings are normal.<br />
                <span className="text-primary">Combinations</span> are dangerous.
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
                Your plant already has gas sensors, SCADA, work permits and shift logs. FUSE.OS correlates them
                in real time — surfacing the dangerous combinations no single system was ever built to catch.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#demo" className="bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-medium inline-flex items-center gap-2 hover:brightness-110">
                  Request a demo <ArrowRight className="h-4 w-4" />
                </a>
                <Link to="/login" className="border border-border bg-[var(--panel)] px-5 py-2.5 rounded-md font-medium hover:bg-[var(--panel-elevated)]">
                  Sign in
                </Link>
              </div>
              <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl">
                {STATS.map((s) => (
                  <div key={s.l} className="border-l-2 border-primary/50 pl-3">
                    <div className="text-2xl font-display font-semibold font-mono">{s.n}</div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live preview panel */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 via-transparent to-transparent blur-2xl pointer-events-none" />
              <div className="relative rounded-xl border border-border bg-[var(--panel)] shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-[var(--panel-elevated)]">
                  <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider">
                    <span className="h-2 w-2 rounded-full bg-[var(--sev-critical)] animate-pulse" />
                    Live fusion feed · Rourkela Steelworks
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">09:42:07 IST</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="rounded-lg border border-[color:var(--sev-critical)]/50 bg-[color:var(--sev-critical)]/10 p-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-[color:var(--sev-critical)]" />
                        <span className="font-semibold text-sm">Compound Risk — Zone B1 (By-Product Plant)</span>
                      </div>
                      <SeverityPill s="critical" />
                    </div>
                    <p className="text-sm text-foreground/85 leading-relaxed">
                      Line-break permit <span className="font-mono text-primary">PTW-226</span> opened at 09:12 while benzene
                      sensor <span className="font-mono text-primary">GS-2301</span> reads <span className="font-mono">4.8&nbsp;ppm</span> (96% of 5&nbsp;ppm limit).
                      Rule <span className="font-mono">R4</span> triggered with <span className="font-mono">94%</span> confidence.
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <SignalChips signals={["permit", "sensor"]} />
                      <span className="text-[11px] text-muted-foreground font-mono">Lead-time · 27 min</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <MiniStat icon={FileText}  label="PTW-226" sub="Line Break · Z-B1" data={[1,1,1,1,1,1,1,1]} color="var(--signal-permit)" />
                    <MiniStat icon={Radar}     label="GS-2301" sub="Benzene 4.8 ppm"  data={[1.2,1.4,2.1,2.8,3.4,3.9,4.3,4.8]} color="var(--sev-critical)" />
                    <MiniStat icon={Activity}  label="SCADA"   sub="Vent fan 62%"     data={[70,68,66,65,64,63,63,62]} color="var(--signal-scada)" />
                  </div>

                  <div className="rounded-md border border-border bg-[var(--panel-elevated)] p-3 text-xs text-muted-foreground">
                    <span className="text-primary font-mono uppercase tracking-wider text-[10px]">Copilot · </span>
                    Recommend pausing PTW-226 and forcing a 15-minute purge cycle before continuing hot work.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-2xl mb-12">
          <div className="text-xs uppercase font-mono tracking-[0.18em] text-primary mb-3">The platform</div>
          <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight">One risk picture. Every signal your plant already produces.</h2>
          <p className="mt-3 text-muted-foreground">FUSE.OS doesn't add more sensors. It makes the ones you have talk to each other — and to your permits, roster and process data.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-lg border border-border bg-[var(--panel)] p-5 hover:border-primary/50 transition-colors">
              <div className="h-10 w-10 rounded-md bg-primary/12 border border-primary/40 flex items-center justify-center mb-3">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-1.5">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-border bg-[var(--panel)]/40">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-xs uppercase font-mono tracking-[0.18em] text-primary mb-3">How it works</div>
          <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight mb-12 max-w-2xl">Ingest. Correlate. Explain. Act.</h2>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { n: "01", t: "Ingest",     d: "Connect gas sensors, SCADA, permit system, roster and weather via existing OPC/MQTT/REST." },
              { n: "02", t: "Correlate",  d: "The fusion engine runs 40+ configurable compound-risk rules on the joined stream." },
              { n: "03", t: "Explain",    d: "Every alert carries its evidence chain: contributing signals, thresholds, timing, confidence." },
              { n: "04", t: "Act",        d: "Route to operators via app, SMS or WhatsApp. Copilot suggests the exact next step." },
            ].map((s) => (
              <div key={s.n} className="rounded-lg border border-border bg-[var(--panel)] p-5">
                <div className="font-mono text-primary text-xs mb-3">{s.n}</div>
                <h3 className="font-semibold mb-1.5">{s.t}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="demo" className="max-w-4xl mx-auto px-6 py-24 text-center">
        <ShieldCheck className="h-10 w-10 text-primary mx-auto mb-4" />
        <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight">Bring FUSE.OS to your plant.</h2>
        <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Live pilot in under 6 weeks. On-prem or edge deployment. Ships with rule packs for steel, refining and power.</p>
        <div className="mt-6 flex justify-center gap-3">
          <a href="mailto:demo@fuse.os" className="bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-medium inline-flex items-center gap-2 hover:brightness-110">
            Request a demo <ArrowRight className="h-4 w-4" />
          </a>
          <Link to="/login" className="border border-border bg-[var(--panel)] px-5 py-2.5 rounded-md font-medium hover:bg-[var(--panel-elevated)]">Sign in</Link>
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground font-mono uppercase tracking-wider">
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> OISD-aligned</span>
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Factory Act ready</span>
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> ISO 27001</span>
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Air-gap deployable</span>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground font-mono">
        © 2026 FUSE.OS · Industrial Risk Fusion Systems
      </footer>
    </div>
  );
}

function MiniStat({ icon: Icon, label, sub, data, color }: { icon: any; label: string; sub: string; data: number[]; color: string }) {
  return (
    <div className="rounded-md border border-border bg-[var(--panel-elevated)] p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-0.5">
        <Icon className="h-3 w-3" style={{ color }} /> {label}
      </div>
      <div className="text-[11px] mb-1 truncate">{sub}</div>
      <Sparkline data={data} color={color} width={100} height={24} />
    </div>
  );
}
