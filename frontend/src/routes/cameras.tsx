import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader, SectionCard } from "@/components/app-layout";
import { Skeleton } from "@/components/risk-primitives";
import { useEffect, useRef, useState } from "react";
import { Video, VideoOff, AlertTriangle, Plus, Search, CameraIcon } from "lucide-react";
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

// The only genuinely real video source in this system — everything else is
// status-only, since there's no actual camera hardware/RTSP to point at.
// This renders whatever camera the browser has access to on the device
// viewing the page (laptop webcam, USB cam, etc.) via getUserMedia().
function WebcamFeed() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<"idle" | "requesting" | "live" | "denied" | "unavailable">("idle");

  async function start() {
    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      setState("live");
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      setState(name === "NotFoundError" ? "unavailable" : "denied");
    }
  }

  // Auto-start as soon as this card mounts — no manual click needed.
  useEffect(() => {
    start();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // The <video> element only exists in the DOM once state === "live" (see
  // render below), so the stream can't be attached synchronously inside
  // start() — videoRef.current would still be null at that point. This runs
  // after React commits the "live" render, once the element is real.
  useEffect(() => {
    if (state === "live" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [state]);

  function stop() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setState("idle");
  }

  if (state === "live") {
    return (
      <>
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <button onClick={stop} className="absolute bottom-2 right-2 h-6 px-2 rounded bg-black/60 text-white text-[10px] font-mono uppercase tracking-wider">Stop</button>
      </>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 text-center px-4">
      <CameraIcon className="h-6 w-6 text-muted-foreground" />
      {(state === "idle" || state === "requesting") && (
        <span className="text-[11px] text-muted-foreground">{state === "requesting" ? "Requesting camera access…" : "Starting this device's camera…"}</span>
      )}
      {state === "denied" && (
        <>
          <span className="text-[11px] text-[color:var(--sev-medium)]">Camera access denied or blocked by the browser.</span>
          <button onClick={start} className="mt-1 h-7 px-3 rounded border border-border text-xs">Try again</button>
        </>
      )}
      {state === "unavailable" && <span className="text-[11px] text-[color:var(--sev-critical)]">No camera found on this device.</span>}
    </div>
  );
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
                <div className="aspect-video bg-[var(--panel)] border-b border-border relative flex items-center justify-center overflow-hidden">
                  {c.stream_source === "webcam" ? (
                    <WebcamFeed />
                  ) : c.status === "offline" ? (
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
