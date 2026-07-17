import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader, SectionCard } from "@/components/app-layout";
import { Skeleton } from "@/components/risk-primitives";
import { useState } from "react";
import { UserPlus, Trash2, KeyRound, Bell, X, Radio, CheckCircle2, AlertTriangle, Plus, Video, Loader2, Lock } from "lucide-react";
import { toast } from "@/lib/toast";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import {
  useCameras, useToggleCamera, useDeleteCamera, useAddCamera,
  useDataSources, useToggleDataSource,
  useRiskRules, useUpdateRiskRule,
  useUsers, useInviteUser, useDeleteUser,
  useRecipients, useAddRecipient, useUpdateRecipient, useDeleteRecipient,
  useAuditLog,
  usePlantConfig, useUpdatePlantConfig,
  useZones, useChangePassword,
} from "@/lib/queries";


export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — FUSE.OS" }, { name: "robots", content: "noindex" }] }),
  component: Settings,
});

const TABS = ["General","Data Sources","Risk Rules","Users","Cameras","Notifications","Security","Audit Log"] as const;
type Tab = typeof TABS[number];

function Settings() {
  const [tab, setTab] = useState<Tab>("General");
  return (
    <AppLayout>
      <PageHeader title="Settings" subtitle="Plant configuration, data sources, rules, users and audit trail." />

      <div className="flex border-b border-border mb-5 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm border-b-2 -mb-px whitespace-nowrap ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t}</button>
        ))}
      </div>

      {tab === "General"       && <General />}
      {tab === "Data Sources"  && <Sources />}
      {tab === "Risk Rules"    && <Rules />}
      {tab === "Users"         && <UsersTab />}
      {tab === "Cameras"       && <CamerasTab />}
      {tab === "Notifications" && <Notifs />}
      {tab === "Security"      && <Security />}
      {tab === "Audit Log"     && <Audit />}
    </AppLayout>
  );
}

// ---------------------------------------------------------------------------
// Cameras
// ---------------------------------------------------------------------------
function CamerasTab() {
  const { data: cams, isLoading } = useCameras();
  const { data: zones } = useZones();
  const toggleCam = useToggleCamera();
  const deleteCam = useDeleteCamera();
  const addCam = useAddCamera();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [zoneId, setZoneId] = useState(zones?.[0]?.id ?? "");
  const [useWebcam, setUseWebcam] = useState(false);

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !zoneId) return;
    await addCam.mutateAsync({ name, zone_id: zoneId, stream_source: useWebcam ? "webcam" : null });
    toast(`${name} added`, "success");
    setName(""); setUseWebcam(false); setAdding(false);
  }

  return (
    <SectionCard title="Camera management" right={
      <button onClick={() => setAdding(true)} className="h-8 px-3 rounded bg-primary text-primary-foreground text-xs font-medium inline-flex items-center gap-1.5">
        <Plus className="h-3.5 w-3.5" /> Add camera
      </button>
    }>
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : (
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-muted-foreground text-left border-b border-border">
            <th className="p-2 font-medium">Camera</th>
            <th className="p-2 font-medium">Zone</th>
            <th className="p-2 font-medium">Status</th>
            <th className="p-2 font-medium">Last frame</th>
            <th className="p-2 font-medium text-center">Active</th>
            <th className="p-2 font-medium text-right"></th>
          </tr>
        </thead>
        <tbody>
          {(cams ?? []).map((c) => {
            const zone = zones?.find(z => z.id === c.zone_id);
            const color = c.status === "online" ? "var(--sev-normal)" : c.status === "degraded" ? "var(--sev-medium)" : "var(--sev-critical)";
            return (
              <tr key={c.id} className="border-b border-border/50">
                <td className="p-2">
                  <div className="text-sm inline-flex items-center gap-1.5"><Video className="h-3.5 w-3.5 text-muted-foreground" /> {c.name}</div>
                  <div className="text-[11px] font-mono text-muted-foreground ml-5">CAM-{c.id}</div>
                </td>
                <td className="p-2 text-xs"><div className="font-mono">{c.zone_id}</div><div className="text-muted-foreground">{zone?.name}</div></td>
                <td className="p-2"><span className="text-[11px] font-mono uppercase tracking-wider" style={{ color }}>{c.status}</span></td>
                <td className="p-2 font-mono text-xs text-muted-foreground">{c.last_frame_at ? new Date(c.last_frame_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }) : "—"}</td>
                <td className="p-2 text-center"><Toggle on={c.active} onChange={(v) => toggleCam.mutate({ id: c.id, active: v })} /></td>
                <td className="p-2 text-right">
                  <button onClick={() => { deleteCam.mutate(c.id); toast(`Removed ${c.name}`, "success"); }} className="text-muted-foreground hover:text-[color:var(--sev-critical)]"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      )}
      {adding && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setAdding(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-lg border border-border bg-[var(--panel)] shadow-2xl">
            <header className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-display font-semibold">Add camera</h3>
              <button onClick={() => setAdding(false)}><X className="h-4 w-4" /></button>
            </header>
            <form onSubmit={submitAdd} className="p-4 space-y-3 text-sm">
              <label className="block"><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Camera name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full h-9 px-3 rounded border border-border bg-[var(--panel-elevated)] text-sm" />
              </label>
              <label className="block"><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Zone</span>
                <select value={zoneId} onChange={(e) => setZoneId(e.target.value)} className="mt-1 w-full h-9 px-3 rounded border border-border bg-[var(--panel-elevated)] text-sm">
                  {(zones ?? []).map((z) => <option key={z.id} value={z.id}>{z.id} · {z.name}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={useWebcam} onChange={(e) => setUseWebcam(e.target.checked)} className="accent-[color:var(--primary)]" />
                Use this browser's webcam as the video source (the only real feed available — everything else is status-only)
              </label>
              <div className="pt-2 flex justify-end gap-2 border-t border-border">
                <button type="button" onClick={() => setAdding(false)} className="h-8 px-3 rounded border border-border text-sm">Cancel</button>
                <button type="submit" disabled={addCam.isPending} className="h-8 px-3 rounded bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// General
// ---------------------------------------------------------------------------
function General() {
  const { data: config, isLoading } = usePlantConfig();
  const update = useUpdatePlantConfig();
  const [form, setForm] = useState<Record<string, string>>({});

  if (isLoading || !config) {
    return <div className="grid lg:grid-cols-2 gap-5"><Skeleton className="h-48 w-full" /><Skeleton className="h-48 w-full" /></div>;
  }

  const val = (k: string, fallback: string) => form[k] ?? fallback ?? "";

  async function save() {
    await update.mutateAsync(form as any);
    toast("Plant configuration saved", "success");
  }

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <SectionCard title="Plant profile" right={<button onClick={save} disabled={update.isPending} className="text-xs text-primary hover:underline disabled:opacity-50">Save</button>}>
        <div className="space-y-3 text-sm">
          <Field label="Plant name" v={val("plant_name", config.plant_name ?? "")} onChange={(v) => setForm({ ...form, plant_name: v })} />
          <Field label="Plant code" v={val("plant_code", config.plant_code ?? "")} onChange={(v) => setForm({ ...form, plant_code: v })} />
          <Field label="Timezone" v={val("timezone", config.timezone ?? "")} onChange={(v) => setForm({ ...form, timezone: v })} />
          <Field label="Language" v={val("language", config.language ?? "")} onChange={(v) => setForm({ ...form, language: v })} />
        </div>
      </SectionCard>
      <SectionCard title="Shift pattern" right={<button onClick={save} disabled={update.isPending} className="text-xs text-primary hover:underline disabled:opacity-50">Save</button>}>
        <div className="space-y-2 text-sm">
          {[
            { n: "Shift A", sk: "shift_a_start", ek: "shift_a_end", s: config.shift_a_start, e: config.shift_a_end },
            { n: "Shift B", sk: "shift_b_start", ek: "shift_b_end", s: config.shift_b_start, e: config.shift_b_end },
            { n: "Shift C", sk: "shift_c_start", ek: "shift_c_end", s: config.shift_c_start, e: config.shift_c_end },
          ].map((s) => (
            <div key={s.n} className="flex items-center gap-2 rounded border border-border bg-[var(--panel-elevated)] p-2">
              <span className="text-xs font-mono w-16">{s.n}</span>
              <input value={val(s.sk, s.s ?? "")} onChange={(e) => setForm({ ...form, [s.sk]: e.target.value })} className="h-8 w-24 rounded border border-border bg-[var(--panel)] px-2 text-sm font-mono" />
              <span className="text-muted-foreground">→</span>
              <input value={val(s.ek, s.e ?? "")} onChange={(e) => setForm({ ...form, [s.ek]: e.target.value })} className="h-8 w-24 rounded border border-border bg-[var(--panel)] px-2 text-sm font-mono" />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function Field({ label, v, onChange }: { label: string; v: string; onChange?: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <input defaultValue={v} onChange={(e) => onChange?.(e.target.value)} className="mt-1 w-full h-9 px-3 rounded border border-border bg-[var(--panel-elevated)] text-sm" />
    </label>
  );
}

// ---------------------------------------------------------------------------
// Data Sources
// ---------------------------------------------------------------------------
function Sources() {
  const { data: sources, isLoading } = useDataSources();
  const toggle = useToggleDataSource();
  return (
    <SectionCard title="Connected data sources">
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : (
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-muted-foreground text-left border-b border-border">
            <th className="p-2 font-medium">Source</th>
            <th className="p-2 font-medium">Type</th>
            <th className="p-2 font-medium">Last sync</th>
            <th className="p-2 font-medium">Status</th>
            <th className="p-2 font-medium text-right">Enabled</th>
          </tr>
        </thead>
        <tbody>
          {(sources ?? []).map((d) => (
            <tr key={d.id} className="border-b border-border/50">
              <td className="p-2"><div className="text-sm">{d.name}</div><div className="text-[11px] font-mono text-muted-foreground">{d.code}</div></td>
              <td className="p-2 text-xs"><span className="inline-flex items-center gap-1"><Radio className="h-3 w-3 text-primary" />{d.type}</span></td>
              <td className="p-2 font-mono text-xs">{d.last_sync_at ? new Date(d.last_sync_at).toLocaleString("en-IN") : "—"}</td>
              <td className="p-2"><StatusChip s={d.status} /></td>
              <td className="p-2 text-right">
                <Toggle on={d.enabled} onChange={(v) => toggle.mutate({ id: d.id, enabled: v })} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      )}
    </SectionCard>
  );
}

function StatusChip({ s }: { s: string }) {
  const map: Record<string, { c: string; icon: any; l: string }> = {
    online:   { c: "var(--sev-normal)",   icon: CheckCircle2,   l: "Online" },
    degraded: { c: "var(--sev-medium)",   icon: AlertTriangle,  l: "Degraded" },
    offline:  { c: "var(--sev-critical)", icon: AlertTriangle,  l: "Offline" },
  };
  const m = map[s] ?? map.offline; const I = m.icon;
  return <span className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-wider" style={{ color: m.c }}><I className="h-3 w-3" /> {m.l}</span>;
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)}
      className={`inline-flex h-5 w-9 rounded-full border transition-colors ${on ? "bg-primary border-primary" : "bg-[var(--panel-elevated)] border-border"}`}>
      <span className={`h-4 w-4 rounded-full bg-white transition-transform mt-[1px] ${on ? "translate-x-4" : "translate-x-[1px]"}`} />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Risk Rules
// ---------------------------------------------------------------------------
function Rules() {
  const { data: rules, isLoading } = useRiskRules();
  const update = useUpdateRiskRule();
  const [master, setMaster] = useState(true);

  return (
    <SectionCard title="Compound risk rules" right={
      <label className="text-xs flex items-center gap-2">Master switch <Toggle on={master} onChange={setMaster} /></label>
    }>
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : (
      <div className="space-y-2">
        {(rules ?? []).map((r) => (
          <div key={r.id} className={`rounded border p-3 ${master && r.enabled ? "border-border bg-[var(--panel-elevated)]" : "border-border/50 bg-[var(--panel-elevated)]/40 opacity-60"}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-muted-foreground">{r.code}</div>
                <div className="text-sm">{r.name}</div>
              </div>
              <Toggle on={r.enabled} onChange={(v) => update.mutate({ id: r.id, payload: { enabled: v } })} />
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground w-24">Sensitivity</span>
              <input type="range" min={0} max={100} defaultValue={r.sensitivity}
                onMouseUp={(e) => update.mutate({ id: r.id, payload: { sensitivity: Number((e.target as HTMLInputElement).value) } })}
                onTouchEnd={(e) => update.mutate({ id: r.id, payload: { sensitivity: Number((e.target as HTMLInputElement).value) } })}
                className="flex-1 accent-[color:var(--primary)]" />
              <span className="text-xs font-mono w-10 text-right">{r.sensitivity}%</span>
            </div>
          </div>
        ))}
      </div>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
function UsersTab() {
  const [inviting, setInviting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: users, isLoading } = useUsers();
  const del = useDeleteUser();

  async function handleDelete(id: number, name: string) {
    setDeleteError(null);
    try {
      await del.mutateAsync(id);
      toast(`Removed ${name}`, "success");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Could not remove user";
      setDeleteError(msg);
      toast(msg, "error");
    }
  }

  return (
    <SectionCard title="Users" right={
      isAdmin
        ? <button onClick={() => setInviting(true)} className="h-8 px-3 rounded bg-primary text-primary-foreground text-xs font-medium inline-flex items-center gap-1.5"><UserPlus className="h-3.5 w-3.5" /> Invite user</button>
        : <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1"><Lock className="h-3 w-3" /> View only</span>
    }>
      {!isAdmin && (
        <div className="mb-3 text-xs text-muted-foreground bg-[var(--panel-elevated)] border border-border rounded p-2.5">
          Only Admins can invite or remove users. You're signed in as <span className="font-mono text-foreground">{user?.role}</span> — you can view the roster below.
        </div>
      )}
      {deleteError && (
        <div className="mb-3 rounded border border-[color:var(--sev-critical)]/40 bg-[color:var(--sev-critical)]/10 px-3 py-2 text-xs text-[color:var(--sev-critical)]">{deleteError}</div>
      )}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : (
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-muted-foreground text-left border-b border-border">
            <th className="p-2 font-medium">Name</th>
            <th className="p-2 font-medium">Role</th>
            <th className="p-2 font-medium">Department</th>
            <th className="p-2 font-medium text-right"></th>
          </tr>
        </thead>
        <tbody>
          {(users ?? []).map((u) => {
            const isSelf = u.email === user?.email;
            return (
              <tr key={u.id} className="border-b border-border/50">
                <td className="p-2"><div className="text-sm">{u.name}{isSelf && <span className="text-[11px] text-muted-foreground"> (you)</span>}</div><div className="text-[11px] font-mono text-muted-foreground">{u.email}</div></td>
                <td className="p-2"><span className={`text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded ${u.role==="admin"?"bg-primary/15 text-primary":"bg-[var(--panel-elevated)] text-muted-foreground"}`}>{u.role}</span></td>
                <td className="p-2 text-xs">{u.department ?? "—"}</td>
                <td className="p-2 text-right">
                  {isAdmin && !isSelf && (
                    <button onClick={() => handleDelete(u.id, u.name)} disabled={del.isPending} className="text-muted-foreground hover:text-[color:var(--sev-critical)] disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      )}
      {inviting && <InviteModal onClose={() => setInviting(false)} />}
    </SectionCard>
  );
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const invite = useInviteUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ email: string; temp_password: string; email_sent: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email) return;
    setError(null);
    try {
      const res = await invite.mutateAsync({ name, email, role });
      if (res.error) {
        setError(res.error);
        return;
      }
      if (!res.temp_password) {
        setError("Invite succeeded but no temporary password was returned.");
        return;
      }
      setCredentials({ email: res.email, temp_password: res.temp_password, email_sent: !!res.email_sent });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send invite — check backend connection.");
    }
  }

  function copyCreds() {
    if (!credentials) return;
    navigator.clipboard.writeText(`Email: ${credentials.email}\nTemporary password: ${credentials.temp_password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={credentials ? undefined : onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-lg border border-border bg-[var(--panel)] shadow-2xl">
        <header className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-display font-semibold">{credentials ? "User created" : "Invite user"}</h3>
          {!credentials && <button onClick={onClose}><X className="h-4 w-4" /></button>}
        </header>

        {credentials ? (
          <div className="p-4 space-y-3 text-sm">
            {credentials.email_sent ? (
              <div className="rounded border border-primary/40 bg-primary/8 px-3 py-2 text-xs text-primary flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                An email with these credentials was just sent to <span className="font-mono">{credentials.email}</span>.
              </div>
            ) : (
              <div className="rounded border border-[color:var(--sev-medium)]/40 bg-[color:var(--sev-medium)]/10 px-3 py-2 text-xs text-[color:var(--sev-medium)] flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                Email delivery didn't go through (SMTP not configured or the send failed) — share these credentials with them directly instead.
              </div>
            )}
            <div className="rounded border border-border bg-[var(--panel-elevated)] p-3 font-mono text-xs space-y-1.5">
              <div><span className="text-muted-foreground">Email</span> — {credentials.email}</div>
              <div><span className="text-muted-foreground">Temp password</span> — <span className="text-primary">{credentials.temp_password}</span></div>
            </div>
            <p className="text-[11px] text-muted-foreground">They can sign in at <span className="font-mono">/login</span> with these, then change their password from Settings → Security.</p>
            <footer className="pt-2 border-t border-border flex justify-end gap-2">
              <button onClick={copyCreds} className="h-8 px-3 rounded border border-border text-sm">{copied ? "Copied!" : "Copy credentials"}</button>
              <button onClick={onClose} className="h-8 px-3 rounded bg-primary text-primary-foreground text-sm font-medium">Done</button>
            </footer>
          </div>
        ) : (
          <form onSubmit={submit} className="p-4 space-y-3 text-sm">
            {error && (
              <div className="rounded-md border border-[color:var(--sev-critical)]/40 bg-[color:var(--sev-critical)]/10 px-3 py-2 text-xs text-[color:var(--sev-critical)]">{error}</div>
            )}
            <label className="block"><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Full name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full h-9 px-3 rounded border border-border bg-[var(--panel-elevated)] text-sm" />
            </label>
            <label className="block"><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Email</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="mt-1 w-full h-9 px-3 rounded border border-border bg-[var(--panel-elevated)] text-sm" />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Role</span>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 w-full h-9 px-3 rounded border border-border bg-[var(--panel-elevated)] text-sm">
                <option value="admin">Admin</option><option value="operator">Operator</option><option value="viewer">Viewer</option>
              </select>
            </label>
            <footer className="pt-2 border-t border-border flex justify-end gap-2">
              <button type="button" onClick={onClose} className="h-8 px-3 rounded border border-border text-sm">Cancel</button>
              <button type="submit" disabled={invite.isPending} className="h-8 px-3 rounded bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60 inline-flex items-center gap-1.5">
                {invite.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Send invite
              </button>
            </footer>
          </form>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
function Notifs() {
  const channels = ["Email", "SMS", "WhatsApp"] as const;
  const riskTypes = ["Critical alerts", "High alerts", "Medium alerts", "Permit conflicts", "Sensor offline", "Compliance gaps"];
  const { data: recipients, isLoading } = useRecipients();
  const addRecipient = useAddRecipient();
  const updateRecipient = useUpdateRecipient();
  const deleteRecipient = useDeleteRecipient();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");

  const channelKey = { Email: "channel_email", SMS: "channel_sms", WhatsApp: "channel_whatsapp" } as const;

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email) return;
    await addRecipient.mutateAsync({ name, role, email, channel_email: true });
    toast(`${name} added as recipient`, "success");
    setName(""); setRole(""); setEmail(""); setAdding(false);
  }

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <SectionCard title="Recipients" right={<button onClick={() => setAdding(true)} className="text-xs text-primary hover:underline">+ Add recipient</button>}>
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
        <div className="space-y-2">
          {(recipients ?? []).map((r) => (
            <div key={r.id} className="rounded border border-border bg-[var(--panel-elevated)] p-2.5 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center text-[11px] font-semibold text-primary shrink-0">{r.name.split(" ").map(s=>s[0]).join("")}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{r.name}</div>
                <div className="text-[11px] text-muted-foreground">{r.role}</div>
              </div>
              <div className="flex gap-2 text-[11px] text-muted-foreground font-mono">
                {([["Email", r.channel_email], ["SMS", r.channel_sms], ["WA", r.channel_whatsapp]] as const).map(([n, on]) => (
                  <button key={n} onClick={() => updateRecipient.mutate({ id: r.id, payload: { [channelKey[n === "WA" ? "WhatsApp" : n]]: !on } as any } )} className={on ? "text-primary" : "hover:text-foreground"}>{n}</button>
                ))}
              </div>
              <button onClick={() => { deleteRecipient.mutate(r.id); toast(`Removed ${r.name}`, "success"); }} className="text-muted-foreground hover:text-[color:var(--sev-critical)]"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
        )}
        {adding && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setAdding(false)}>
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-lg border border-border bg-[var(--panel)] shadow-2xl">
              <header className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-display font-semibold">Add recipient</h3>
                <button onClick={() => setAdding(false)}><X className="h-4 w-4" /></button>
              </header>
              <form onSubmit={submitAdd} className="p-4 space-y-3 text-sm">
                <label className="block"><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Name</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full h-9 px-3 rounded border border-border bg-[var(--panel-elevated)] text-sm" />
                </label>
                <label className="block"><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Role</span>
                  <input value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 w-full h-9 px-3 rounded border border-border bg-[var(--panel-elevated)] text-sm" />
                </label>
                <label className="block"><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Email</span>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="mt-1 w-full h-9 px-3 rounded border border-border bg-[var(--panel-elevated)] text-sm" />
                </label>
                <div className="pt-2 flex justify-end gap-2 border-t border-border">
                  <button type="button" onClick={() => setAdding(false)} className="h-8 px-3 rounded border border-border text-sm">Cancel</button>
                  <button type="submit" disabled={addRecipient.isPending} className="h-8 px-3 rounded bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60">Add</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </SectionCard>
      <SectionCard title="Notification matrix">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground text-left border-b border-border">
                <th className="p-2 font-medium">Risk type</th>
                {channels.map((c) => <th key={c} className="p-2 font-medium text-center">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {riskTypes.map((t) => (
                <tr key={t} className="border-b border-border/50">
                  <td className="p-2 text-sm">{t}</td>
                  {channels.map((c) => (
                    <td key={c} className="p-2 text-center"><input type="checkbox" defaultChecked={t.startsWith("Critical") || (c === "Email")} className="accent-[color:var(--primary)]" /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-[11px] text-muted-foreground flex items-center gap-1.5"><Bell className="h-3 w-3" /> Quiet hours honored per recipient</div>
      </SectionCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Security — now backed by a real POST /api/auth/change-password endpoint
// ---------------------------------------------------------------------------
function Security() {
  const { user } = useAuth();
  const changePassword = useChangePassword();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next.length < 8) { setError("New password must be at least 8 characters."); return; }
    if (next !== confirm) { setError("New password and confirmation don't match."); return; }
    try {
      await changePassword.mutateAsync({ current, next });
      toast("Password updated", "success");
      setCurrent(""); setNext(""); setConfirm("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update password.");
    }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <SectionCard title="Change password">
        <form onSubmit={submit} className="space-y-3 text-sm">
          {error && (
            <div className="rounded-md border border-[color:var(--sev-critical)]/40 bg-[color:var(--sev-critical)]/10 px-3 py-2 text-xs text-[color:var(--sev-critical)]">{error}</div>
          )}
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Current password</span>
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className="mt-1 w-full h-9 px-3 rounded border border-border bg-[var(--panel-elevated)] text-sm" />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">New password</span>
            <input type="password" value={next} onChange={(e) => setNext(e.target.value)} className="mt-1 w-full h-9 px-3 rounded border border-border bg-[var(--panel-elevated)] text-sm" />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Confirm new password</span>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1 w-full h-9 px-3 rounded border border-border bg-[var(--panel-elevated)] text-sm" />
          </label>
          <button type="submit" disabled={changePassword.isPending} className="h-9 px-4 rounded bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-60">
            {changePassword.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Update password
          </button>
        </form>
      </SectionCard>
      <SectionCard title="Account">
        <div className="space-y-2 text-sm">
          <Row k="Signed in as" v={user?.email ?? "—"} />
          <Row k="Role"          v={user?.role ?? "—"} />
        </div>
      </SectionCard>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between border-b border-border/50 py-1.5"><span className="text-muted-foreground">{k}</span><span className="font-mono text-xs">{v}</span></div>;
}

// ---------------------------------------------------------------------------
// Audit Log
// ---------------------------------------------------------------------------
function Audit() {
  const { data: log, isLoading } = useAuditLog();
  return (
    <SectionCard title="System &amp; config changes">
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
      ) : (log ?? []).length === 0 ? (
        <div className="text-sm text-muted-foreground py-4 text-center">No changes logged yet.</div>
      ) : (
      <div className="divide-y divide-border">
        {(log ?? []).map((a) => (
          <div key={a.id} className="py-2.5 flex items-start gap-4 text-sm">
            <span className="font-mono text-xs text-muted-foreground w-40 shrink-0">{new Date(a.timestamp).toLocaleString("en-IN")}</span>
            <span className="font-mono text-xs text-primary w-32 shrink-0 truncate">{a.actor}</span>
            <span className="flex-1">{a.action}</span>
          </div>
        ))}
      </div>
      )}
    </SectionCard>
  );
}
