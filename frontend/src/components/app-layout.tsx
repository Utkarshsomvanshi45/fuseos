import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard, Radio, FileText, AlertTriangle, Map, ScrollText,
  BarChart3, FileBarChart, Settings, Bell, LogOut, Zap, Menu,
  CheckCircle2, Info, AlertCircle, Video,
} from "lucide-react";
import { PLANT } from "@/lib/mock-data";
import { AICopilot } from "./ai-copilot";
import type { ToastPayload } from "@/lib/toast";
import { useAuth } from "@/lib/auth";
import { useDashboardSummary, useCameras, useRiskEvents, usePlantConfig } from "@/lib/queries";
import { useLiveSocket } from "@/lib/use-live-socket";

function timeToMinutes(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}
function inShiftWindow(nowMin: number, start: string, end: string): boolean {
  const s = timeToMinutes(start), e = timeToMinutes(end);
  if (s == null || e == null || s === e) return false;
  return s < e ? nowMin >= s && nowMin < e : nowMin >= s || nowMin < e; // handles overnight wrap
}
function currentShiftLabel(config: ReturnType<typeof usePlantConfig>["data"]): string | null {
  if (!config) return null;
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const candidates: [string, string | null, string | null][] = [
    ["Shift A", config.shift_a_start, config.shift_a_end],
    ["Shift B", config.shift_b_start, config.shift_b_end],
    ["Shift C", config.shift_c_start, config.shift_c_end],
  ];
  for (const [label, start, end] of candidates) {
    if (start && end && inShiftWindow(nowMin, start, end)) return `${label} · ${start}–${end}`;
  }
  return null;
}

const NAV = [
  { to: "/dashboard",  label: "Dashboard",         icon: LayoutDashboard },
  { to: "/monitor",    label: "Live Risk Monitor", icon: Radio },
  { to: "/cameras",    label: "Live Feed",         icon: Video },
  { to: "/permits",    label: "Permit Intelligence", icon: FileText },
  { to: "/alerts",     label: "Alert Center",      icon: AlertTriangle },
  { to: "/zones",      label: "Zone Risk Map",     icon: Map },
  { to: "/compliance", label: "Compliance",        icon: ScrollText },
  { to: "/analytics",  label: "Analytics",         icon: BarChart3 },
  { to: "/reports",    label: "Reports",           icon: FileBarChart },
  { to: "/settings",   label: "Settings",          icon: Settings },
] as const;

function SidebarInner({ path, onNavigate }: { path: string; onNavigate?: () => void }) {
  return (
    <>
      <Link to="/dashboard" onClick={onNavigate} className="px-5 py-5 border-b border-border flex items-center gap-2.5 shrink-0">
        <div className="h-8 w-8 rounded-md bg-primary/15 flex items-center justify-center border border-primary/40 shrink-0">
          <Zap className="h-4 w-4 text-primary" strokeWidth={2.5} />
        </div>
        <div className="leading-tight min-w-0">
          <div className="font-display font-bold tracking-tight text-[15px]">FUSE<span className="text-primary">.OS</span></div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Risk Fusion Engine</div>
        </div>
      </Link>
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {NAV.map((n) => {
          const active = path.startsWith(n.to);
          const Icon = n.icon;
          return (
            <Link key={n.to} to={n.to} onClick={onNavigate}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? "bg-primary/12 text-primary border-l-2 border-primary pl-[10px]"
                  : "text-muted-foreground hover:bg-[var(--panel-elevated)] hover:text-foreground"
              }`}>
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{n.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border text-[11px] text-muted-foreground shrink-0">
        <div className="flex items-center gap-1.5 text-primary pulse-dot mb-1"><span>Fusion engine live</span></div>
        <div className="font-mono">v4.2.1 · uptime 41d</div>
      </div>
    </>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const now = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });

  const nav = useNavigate();
  const { user, token, loading, logout } = useAuth();
  useLiveSocket(!!token);

  useEffect(() => {
    if (!loading && !token) nav({ to: "/login" });
  }, [loading, token, nav]);

  const { data: summary } = useDashboardSummary();
  const { data: cameras } = useCameras();
  const { data: newEvents } = useRiskEvents({ limit: 100 });
  const { data: plantConfig } = usePlantConfig();
  const shiftLabel = currentShiftLabel(plantConfig);

  const camerasOnline = cameras?.filter((c) => c.status === "online").length ?? 0;
  const camerasTotal = cameras?.length ?? 0;
  const unreadCount = newEvents?.filter((e) => e.status === "new").length ?? 0;
  const initials = user?.name
    ? user.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()
    : "—";

  function handleSignOut() {
    logout();
    nav({ to: "/" });
  }

  if (loading || !token) {
    return (
      <div className="app-light min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="app-light min-h-screen bg-background text-foreground">
      {/* Fixed sidebar */}
      <aside className="hidden lg:flex fixed top-0 left-0 h-screen w-60 border-r border-border bg-[var(--panel)] flex-col z-40">
        <SidebarInner path={path} />
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <aside onClick={(e) => e.stopPropagation()} className="w-64 h-full bg-[var(--panel)] border-r border-border flex flex-col">
            <SidebarInner path={path} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-60 flex flex-col min-h-screen min-w-0">
        <header className="h-14 border-b border-border bg-[var(--panel)]/85 backdrop-blur flex items-center gap-3 sm:gap-4 px-3 sm:px-5 sticky top-0 z-30">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden h-8 w-8 rounded-md border border-border flex items-center justify-center shrink-0" aria-label="Open menu">
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3 min-w-0">
            <div className="text-sm font-medium truncate">{plantConfig?.plant_name ?? PLANT.name}</div>
            <div className="text-xs text-muted-foreground hidden md:block truncate">{PLANT.sector}</div>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-4 text-xs">
            <span className="text-primary pulse-dot font-mono hidden sm:inline">{shiftLabel ?? "No shift configured"}</span>
            <span className="text-muted-foreground font-mono hidden xl:inline">Sensors <span className="text-foreground">{summary ? `${summary.sensors_online}/${summary.sensors_total}` : "—"}</span></span>
            <span className="text-muted-foreground font-mono hidden xl:inline">CCTV <span className="text-foreground">{cameras ? `${camerasOnline}/${camerasTotal}` : "—"}</span></span>
            <span className="text-muted-foreground font-mono hidden md:inline">{now} IST</span>
            <Link
              to="/alerts"
              className="relative h-8 w-8 rounded-md border border-border hover:bg-[var(--panel-elevated)] flex items-center justify-center shrink-0"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-[var(--sev-critical)] text-[10px] font-mono text-white flex items-center justify-center">{unreadCount}</span>
              )}
            </Link>
            <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-[11px] font-semibold text-primary shrink-0" title={user?.name}>{initials}</div>
            <button onClick={handleSignOut} className="text-muted-foreground hover:text-foreground hidden sm:inline" title="Sign out"><LogOut className="h-4 w-4" /></button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 min-w-0">{children}</main>
      </div>

      <AICopilot />
      <Toaster />
    </div>
  );
}

function Toaster() {
  const [items, setItems] = useState<ToastPayload[]>([]);
  useEffect(() => {
    function handler(e: Event) {
      const t = (e as CustomEvent<ToastPayload>).detail;
      setItems((s) => [...s, t]);
      setTimeout(() => setItems((s) => s.filter((x) => x.id !== t.id)), 3200);
    }
    window.addEventListener("fuse:toast", handler);
    return () => window.removeEventListener("fuse:toast", handler);
  }, []);
  return (
    <div className="fixed top-4 right-4 z-[70] flex flex-col gap-2 pointer-events-none">
      {items.map((t) => {
        const Icon = t.kind === "success" ? CheckCircle2 : t.kind === "error" || t.kind === "warn" ? AlertCircle : Info;
        const color = t.kind === "success" ? "var(--sev-normal)" : t.kind === "error" ? "var(--sev-critical)" : t.kind === "warn" ? "var(--sev-medium)" : "var(--primary)";
        return (
          <div key={t.id} className="pointer-events-auto min-w-[260px] max-w-sm rounded-md border border-border bg-[var(--panel-elevated)] shadow-lg px-3 py-2.5 text-sm flex items-start gap-2 animate-in slide-in-from-right-4">
            <Icon className="h-4 w-4 mt-0.5 shrink-0" style={{ color }} />
            <span className="leading-snug">{t.text}</span>
          </div>
        );
      })}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionCard({ title, right, children, className = "" }: { title?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-border bg-[var(--panel)] ${className}`}>
      {(title || right) && (
        <header className="flex items-center justify-between px-4 py-3 border-b border-border">
          {title && <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">{title}</h3>}
          {right}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}
