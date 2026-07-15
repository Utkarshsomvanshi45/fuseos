import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { WS_BASE } from "./api";
import { invalidateRiskDerived } from "./queries";
import { toast } from "./toast";

// Connects to the backend's /ws/live socket once (mounted from AppLayout, so
// it's alive on every authenticated page) and invalidates the relevant React
// Query caches whenever the fusion engine broadcasts a new risk event or a
// status change — this is what makes the dashboard/alerts feel "live" without
// polling being the only mechanism.
export function useLiveSocket(enabled: boolean) {
  const queryClient = useQueryClient();
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (cancelled) return;
      const ws = new WebSocket(`${WS_BASE}/ws/live`);
      socketRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "risk_event") {
            invalidateRiskDerived(queryClient);
            const sev = msg.data?.severity;
            if (sev === "critical" || sev === "high") {
              toast(`New ${sev} risk event: ${msg.data?.risk_type ?? msg.data?.id}`, sev === "critical" ? "error" : "warn");
            }
          } else if (msg.type === "status_update") {
            invalidateRiskDerived(queryClient);
          }
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = () => {
        if (!cancelled) retryTimer = setTimeout(connect, 5000);
      };
      ws.onerror = () => ws.close();
    }

    connect();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      socketRef.current?.close();
    };
  }, [enabled, queryClient]);
}
