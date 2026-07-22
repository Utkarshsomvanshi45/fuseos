import { useEffect, useRef, useState } from "react";
import { MessageSquare, X, Send, Sparkles, GripVertical } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import type { CopilotAsk } from "@/lib/copilot-bus";

const SUGGESTIONS: Record<string, string[]> = {
  "/dashboard":  ["What's driving Z-B1 critical?", "Any permits at risk right now?", "Summarize the shift so far"],
  "/monitor":    ["Which zones trending up?", "Show offline sensors", "Compare Z-A1 vs Z-A2 CO trend"],
  "/permits":    ["Which permits have conflicts?", "Explain PTW-221 conflict", "Any upcoming hot-work?"],
  "/alerts":     ["Explain RX-8841", "Group today's alerts by signal type", "What's our avg lead-time today?"],
  "/zones":      ["Highest-risk zone this shift?", "Zones with permit + sensor combo", "Coverage gaps?"],
  "default":     ["What compound risks are active?", "Explain the highest-severity alert", "How is the plant trending vs yesterday?"],
};

const CANNED = "Based on live fusion: Z-B1 is critical because line-break permit PTW-226 opened at 09:12 while benzene GS-2301 reads 4.8 ppm (96% of 5 ppm threshold). Rule R4 (line break + adjacent VOC) triggered with 94% confidence. Recommended: pause permit and force ventilation cycle before continuing.";

type Pos = { x: number; y: number };
const BTN_W = 150, BTN_H = 48, PANEL_W = 380, PANEL_H = 520;

function clampToViewport(p: Pos, w: number, h: number): Pos {
  const maxX = Math.max(0, window.innerWidth - w - 8);
  const maxY = Math.max(0, window.innerHeight - h - 8);
  return { x: Math.min(Math.max(8, p.x), maxX), y: Math.min(Math.max(8, p.y), maxY) };
}

export function AICopilot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<{ role: "user" | "ai"; text: string }[]>([
    { role: "ai", text: "Copilot online. I can correlate permits, sensors, SCADA and shift data. Ask about any zone, permit or alert." },
  ]);
  // Default position: bottom-left so it never overlaps bottom-right action buttons.
  const [pos, setPos] = useState<Pos>(() => ({ x: 20, y: (typeof window !== "undefined" ? window.innerHeight : 800) - 72 }));
  const dragRef = useRef<{ dx: number; dy: number; w: number; h: number } | null>(null);
  const movedRef = useRef(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const key = Object.keys(SUGGESTIONS).find((k) => path.startsWith(k)) ?? "default";

  useEffect(() => {
    function onResize() {
      setPos((p) => clampToViewport(p, open ? PANEL_W : BTN_W, open ? PANEL_H : BTN_H));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open]);

  // The default/remembered position is calculated for the small collapsed
  // button (BTN_H=48), not the full panel (PANEL_H=520). Without this, opening
  // the panel from near the bottom of the screen renders most of it below the
  // visible viewport — this re-clamps to the panel's real size the moment it opens.
  useEffect(() => {
    if (open) setPos((p) => clampToViewport(p, PANEL_W, PANEL_H));
  }, [open]);

  // Lets other components (e.g. a dashboard insight card's "Ask AI" button)
  // open this panel pre-loaded with a real question/answer instead of firing
  // a toast that just repeats the same text and disappears.
  useEffect(() => {
    function onAsk(e: Event) {
      const detail = (e as CustomEvent<CopilotAsk>).detail;
      if (!detail) return;
      setOpen(true);
      setMsgs((m) => [...m, { role: "user", text: detail.question }, { role: "ai", text: detail.answer }]);
    }
    window.addEventListener("fuse:copilot-ask", onAsk);
    return () => window.removeEventListener("fuse:copilot-ask", onAsk);
  }, []);

  function onPointerDown(e: React.PointerEvent, w: number, h: number) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y, w, h };
    movedRef.current = false;
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const next = clampToViewport({ x: e.clientX - d.dx, y: e.clientY - d.dy }, d.w, d.h);
    if (Math.abs(next.x - pos.x) + Math.abs(next.y - pos.y) > 2) movedRef.current = true;
    setPos(next);
  }
  function onPointerUp(e: React.PointerEvent) {
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
    dragRef.current = null;
  }

  function send(text: string) {
    if (!text.trim()) return;
    setMsgs((m) => [...m, { role: "user", text }, { role: "ai", text: CANNED }]);
    setInput("");
  }

  if (!open) {
    return (
      <button
        style={{ left: pos.x, top: pos.y }}
        onPointerDown={(e) => onPointerDown(e, BTN_W, BTN_H)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={() => { if (!movedRef.current) setOpen(true); }}
        className="fixed z-40 h-12 pl-2 pr-4 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:brightness-110 flex items-center gap-1.5 font-medium text-sm select-none touch-none cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 opacity-70" />
        <Sparkles className="h-4 w-4" /> Ask Copilot
      </button>
    );
  }

  return (
    <div
      style={{ left: pos.x, top: pos.y, width: PANEL_W, height: PANEL_H }}
      className="fixed z-40 rounded-xl border border-border bg-[var(--panel-elevated)] shadow-2xl flex flex-col overflow-hidden"
    >
      <header
        onPointerDown={(e) => onPointerDown(e, PANEL_W, PANEL_H)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="flex items-center justify-between px-4 py-3 border-b border-border bg-[var(--panel)] cursor-grab active:cursor-grabbing select-none touch-none"
      >
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <div className="h-7 w-7 rounded-md bg-primary/15 border border-primary/40 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">FUSE Copilot</div>
            <div className="text-[10px] uppercase tracking-wider text-primary pulse-dot">connected to fusion</div>
          </div>
        </div>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground"
        ><X className="h-4 w-4" /></button>
      </header>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {msgs.map((m, i) => (
          <div key={i} className={`text-sm ${m.role === "user" ? "ml-auto max-w-[85%] bg-primary text-primary-foreground rounded-lg px-3 py-2" : "max-w-[92%] text-foreground/90"}`}>
            {m.role === "ai" && <div className="text-[10px] text-primary uppercase tracking-wider mb-1">Copilot</div>}
            {m.text}
          </div>
        ))}
      </div>

      <div className="px-3 pb-2 flex flex-wrap gap-1.5">
        {SUGGESTIONS[key].map((s) => (
          <button key={s} onClick={() => send(s)} className="text-[11px] px-2 py-1 rounded-md border border-border bg-[var(--panel)] text-muted-foreground hover:text-foreground hover:border-primary/50">
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="border-t border-border p-2 flex items-center gap-2 bg-[var(--panel)]"
      >
        <MessageSquare className="h-4 w-4 text-muted-foreground ml-1" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about zones, permits, alerts…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <button type="submit" className="h-8 w-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center hover:brightness-110">
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}
