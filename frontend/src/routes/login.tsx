import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Zap, Lock, KeyRound, ArrowRight, Info, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — FUSE.OS" }, { name: "robots", content: "noindex" }] }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("ananya.rao@ris.gov.in");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      nav({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-10 border-r border-border grid-bg overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent pointer-events-none" />
        <Link to="/" className="flex items-center gap-2.5 relative">
          <div className="h-9 w-9 rounded-md bg-primary/15 border border-primary/40 flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="font-display font-bold text-lg tracking-tight">FUSE<span className="text-primary">.OS</span></div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Risk Fusion Engine</div>
          </div>
        </Link>
        <div className="relative">
          <div className="text-xs font-mono uppercase tracking-[0.18em] text-primary mb-4 pulse-dot">Live plant · Rourkela Steelworks</div>
          <h2 className="text-3xl font-display font-bold leading-tight max-w-md">
            "We saw the benzene + line-break combination <span className="text-primary">27 minutes</span> before it would have breached."
          </h2>
          <p className="mt-4 text-sm text-muted-foreground max-w-md">— Shift Superintendent, Coke &amp; Chemicals</p>
        </div>
        <div className="relative text-[11px] font-mono uppercase tracking-wider text-muted-foreground">© 2026 FUSE.OS</div>
      </div>

      {/* Right panel */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex items-center gap-2">
            <div className="h-9 w-9 rounded-md bg-primary/15 border border-primary/40 flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary" strokeWidth={2.5} />
            </div>
            <div className="font-display font-bold tracking-tight">FUSE<span className="text-primary">.OS</span></div>
          </div>

          <h1 className="text-2xl font-display font-bold tracking-tight">Sign in to your plant</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Continue to the operations console.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            {error && (
              <div className="rounded-md border border-[color:var(--sev-critical)]/40 bg-[color:var(--sev-critical)]/10 px-3 py-2 text-xs text-[color:var(--sev-critical)]">
                {error}
              </div>
            )}
            <Field label="Email or username">
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="input" autoComplete="username" />
            </Field>
            <Field label="Password" right={<button type="button" className="text-[11px] text-primary hover:underline">Forgot?</button>}>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" autoComplete="current-password" />
            </Field>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" defaultChecked className="accent-[color:var(--primary)]" />
              Remember me on this workstation
            </label>
            <button disabled={submitting} className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium inline-flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-60">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign in <ArrowRight className="h-4 w-4" /></>}
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative text-center text-[11px] uppercase tracking-wider text-muted-foreground bg-background px-2 w-fit mx-auto">or</div>
            </div>
            <button type="button" className="w-full h-10 rounded-md border border-border bg-[var(--panel)] font-medium inline-flex items-center justify-center gap-2 hover:bg-[var(--panel-elevated)]">
              <KeyRound className="h-4 w-4" /> Continue with SSO
            </button>
          </form>

          <div className="mt-8 rounded-md border border-border bg-[var(--panel)]/60 p-3 flex gap-2.5 text-xs text-muted-foreground">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span>Accounts are created by your plant administrator. There is no public sign-up — contact your Safety Officer for access.</span>
          </div>
          <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <Lock className="h-3 w-3" /> Encrypted session · On-prem SSO available
          </div>
        </div>
      </div>

      <style>{`.input{width:100%;height:40px;border-radius:0.375rem;border:1px solid var(--border);background:var(--panel);padding:0 0.75rem;font-size:0.875rem;outline:none;transition:border-color .15s} .input:focus{border-color:var(--primary)}`}</style>
    </div>
  );
}

function Field({ label, right, children }: { label: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        {right}
      </div>
      {children}
    </label>
  );
}
