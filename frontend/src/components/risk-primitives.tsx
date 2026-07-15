
export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded bg-[var(--panel-elevated)] ${className}`}
      style={{
        backgroundImage:
          "linear-gradient(90deg, color-mix(in oklab, var(--panel-elevated) 100%, transparent) 0%, color-mix(in oklab, var(--muted-foreground) 12%, transparent) 50%, color-mix(in oklab, var(--panel-elevated) 100%, transparent) 100%)",
        backgroundSize: "200% 100%",
        ...style,
      }}
    />
  );
}

import type { Severity } from "@/lib/mock-data";
import { severityVar } from "@/lib/mock-data";
import { FileText, Radio, Activity, Users, Video, HardHat } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function SeverityPill({ s, label }: { s: Severity; label?: string }) {
  const map: Record<Severity, string> = {
    critical: "Critical", high: "High", medium: "Elevated", low: "Low", normal: "Normal",
  };
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium font-mono uppercase tracking-wider border"
      style={{
        color: severityVar(s),
        backgroundColor: `color-mix(in oklab, ${severityVar(s)} 15%, transparent)`,
        borderColor: `color-mix(in oklab, ${severityVar(s)} 40%, transparent)`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: severityVar(s) }} />
      {label ?? map[s]}
    </span>
  );
}

const SIGNAL_META: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  permit: { icon: FileText, color: "var(--signal-permit)", label: "Permit" },
  sensor: { icon: Radio,    color: "var(--signal-sensor)", label: "Sensor" },
  scada:  { icon: Activity, color: "var(--signal-scada)",  label: "SCADA" },
  shift:  { icon: Users,    color: "var(--signal-shift)",  label: "Shift" },
  camera: { icon: Video,    color: "var(--signal-camera)", label: "CCTV" },
  ppe:    { icon: HardHat,  color: "var(--signal-ppe)",    label: "PPE" },
};

export function SignalChips({ signals }: { signals: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {signals.map((sig) => {
        const meta = SIGNAL_META[sig];
        if (!meta) return null;
        const Icon = meta.icon;
        return (
          <span
            key={sig}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border"
            style={{
              color: meta.color,
              borderColor: `color-mix(in oklab, ${meta.color} 35%, transparent)`,
              backgroundColor: `color-mix(in oklab, ${meta.color} 10%, transparent)`,
            }}
          >
            <Icon className="h-3 w-3" /> {meta.label}
          </span>
        );
      })}
    </div>
  );
}

export function Sparkline({ data, color = "var(--primary)", height = 32, width = 120 }: { data: number[]; color?: string; height?: number; width?: number }) {
  if (!data.length) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1 || 1);
  const points = data.map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 4) - 2}`).join(" ");
  const areaPoints = `0,${height} ${points} ${width},${height}`;
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polygon points={areaPoints} fill={color} opacity={0.12} />
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={(data.length - 1) * step} cy={height - ((data[data.length - 1] - min) / range) * (height - 4) - 2} r={2.5} fill={color} />
    </svg>
  );
}

export function RiskGauge({ value, severity, size = 96 }: { value: number; severity: Severity; size?: number }) {
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value)) / 100;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--border)" strokeWidth={5} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={severityVar(severity)} strokeWidth={5} fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-xl font-display font-semibold font-mono" style={{ color: severityVar(severity) }}>{value}</div>
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Risk</div>
      </div>
    </div>
  );
}

export function StackedLineChart({ series, height = 140 }: { series: { name: string; color: string; data: number[] }[]; height?: number }) {
  const width = 600;
  const all = series.flatMap((s) => s.data);
  const min = Math.min(...all), max = Math.max(...all);
  const range = max - min || 1;
  const step = width / (Math.max(...series.map((s) => s.data.length)) - 1 || 1);
  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1={0} x2={width} y1={height * g} y2={height * g} stroke="var(--grid-line)" />
        ))}
        {series.map((s) => {
          const pts = s.data.map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 8) - 4}`).join(" ");
          return <polyline key={s.name} points={pts} fill="none" stroke={s.color} strokeWidth={1.6} strokeLinejoin="round" />;
        })}
      </svg>
      <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-muted-foreground">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-sm" style={{ background: s.color }} /> {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}
