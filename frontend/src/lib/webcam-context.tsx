import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type WebcamState = "idle" | "requesting" | "live" | "denied" | "unavailable" | "off";

type WebcamCtx = {
  state: WebcamState;
  stream: MediaStream | null;
  start: () => Promise<void>;
  stop: () => void;
};

const Ctx = createContext<WebcamCtx | null>(null);

// Mounted once at the app layout level (not inside the Live Feed page), so the
// camera stays live across navigation instead of stopping every time you leave
// /cameras — it only ever stops when explicitly turned off (Settings toggle
// or the Stop button on the feed itself).
export function WebcamProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WebcamState>("idle");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  async function start() {
    setState("requesting");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = s;
      setStream(s);
      setState("live");
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      setState(name === "NotFoundError" ? "unavailable" : "denied");
    }
  }

  function stop() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    setState("off");
  }

  // Auto-start as soon as the authenticated app shell mounts — i.e. right
  // when you log in / open the site, not when you happen to visit Live Feed.
  useEffect(() => {
    start();
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  return <Ctx.Provider value={{ state, stream, start, stop }}>{children}</Ctx.Provider>;
}

export function useWebcam() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWebcam must be used within WebcamProvider");
  return ctx;
}
