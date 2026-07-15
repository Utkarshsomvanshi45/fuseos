// Plant-floor SVG layout for the Zone Risk Map / Live Risk Monitor pages.
// This is presentation-only data (pixel positions, short descriptions) that
// has no backend equivalent — the backend only knows about risk, not floor
// geometry — so it stays static here, keyed by zone id, and gets merged with
// live `ZoneOut` data from the API at render time.
export const ZONE_LAYOUT: Record<string, { x: number; y: number; w: number; h: number; desc: string }> = {
  "Z-A1": { x: 40, y: 60, w: 220, h: 120, desc: "Hot-work zone, elevated CO drift" },
  "Z-A2": { x: 280, y: 60, w: 220, h: 120, desc: "Nominal, gas trending up" },
  "Z-B1": { x: 40, y: 200, w: 180, h: 140, desc: "Benzene sensor spike + active permit" },
  "Z-B2": { x: 240, y: 200, w: 180, h: 140, desc: "Nominal" },
  "Z-B3": { x: 440, y: 200, w: 160, h: 140, desc: "NH3 leak trend, confined-space permit" },
  "Z-C1": { x: 620, y: 60, w: 200, h: 140, desc: "Slag runner temp elevated" },
  "Z-C2": { x: 620, y: 220, w: 200, h: 120, desc: "Stable" },
  "Z-D1": { x: 40, y: 360, w: 260, h: 100, desc: "Purge in progress" },
  "Z-D2": { x: 320, y: 360, w: 260, h: 100, desc: "Oxygen line maintenance" },
  "Z-D3": { x: 600, y: 360, w: 220, h: 100, desc: "Stable, all sensors online" },
};

export function zoneLayout(id: string) {
  return ZONE_LAYOUT[id] ?? { x: 40, y: 60, w: 200, h: 120, desc: "" };
}
