import type { ChartSpec } from "@/lib/agentUi";

const fmt = (v: number) => (Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : Math.abs(v) >= 1e4 ? `${Math.round(v / 1000)}K` : v.toLocaleString("en-US"));

/** Inline chart rendered from a server-built spec. */
export function ChatChart({ spec, onPick }: { spec: ChartSpec; onPick?: (id: string) => void }) {
  return (
    <figure className="rounded-2xl border bg-surface p-4">
      <figcaption className="mb-3 flex items-baseline justify-between gap-2"><span className="font-semibold">{spec.title}</span><span className="text-xs text-muted-foreground">{spec.unit}</span></figcaption>
      {spec.series.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد بيانات كافية للرسم.</p> : spec.type === "scatter" ? <Scatter spec={spec} onPick={onPick} /> : <Bars spec={spec} onPick={onPick} />}
      <p className="mt-3 text-[11px] text-muted-foreground">المصدر: {spec.source}</p>
    </figure>
  );
}

function Bars({ spec, onPick }: { spec: ChartSpec; onPick?: (id: string) => void }) {
  const diverging = spec.type === "diverging" || spec.series.some((s) => s.value < 0);
  const max = Math.max(...spec.series.map((s) => Math.abs(s.value)), 1);
  return (
    <div className="space-y-2">
      {spec.series.map((s, i) => {
        const w = (Math.abs(s.value) / max) * (diverging ? 50 : 100);
        const neg = s.value < 0;
        return (
          <button type="button" key={i} onClick={() => s.id && onPick?.(s.id)} className="grid w-full grid-cols-[minmax(0,9rem)_1fr_4.5rem] items-center gap-3 text-right text-xs">
            <span className="truncate">{s.label}</span>
            <span className="relative h-5 rounded-md bg-secondary/60">
              {diverging && <span className="absolute inset-y-0 right-1/2 w-px bg-border" />}
              <span
                className={`absolute inset-y-0 rounded-md ${neg ? "bg-destructive/80" : "bg-primary"}`}
                style={diverging ? (neg ? { left: "50%", width: `${w}%` } : { right: "50%", width: `${w}%` }) : { right: 0, width: `${w}%` }}
              />
            </span>
            <b className="font-mono">{s.value > 0 && diverging ? "+" : ""}{fmt(s.value)}</b>
          </button>
        );
      })}
      {diverging && <div className="flex justify-between pt-1 text-[11px] text-muted-foreground"><span>فائض ←</span><span>→ عجز</span></div>}
    </div>
  );
}

function Scatter({ spec, onPick }: { spec: ChartSpec; onPick?: (id: string) => void }) {
  const W = 520, H = 240, P = 32;
  const xs = spec.series.map((s) => s.value), ys = spec.series.map((s) => s.value2 ?? 0);
  const x0 = 0, x1 = Math.max(...xs, 1), y0 = Math.min(...ys, -5), y1 = Math.max(...ys, 5);
  const sx = (v: number) => W - P - ((v - x0) / (x1 - x0)) * (W - 2 * P); // RTL: more days to the left
  const sy = (v: number) => H - P - ((v - y0) / (y1 - y0)) * (H - 2 * P);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={spec.title}>
      <line x1={P} x2={W - P} y1={sy(0)} y2={sy(0)} stroke="var(--border)" />
      {spec.series.map((s, i) => (
        <circle key={i} cx={sx(s.value)} cy={sy(s.value2 ?? 0)} r={5} fill={(s.value2 ?? 0) > 0 && s.value > 90 ? "var(--primary)" : "var(--muted-foreground)"} fillOpacity={0.75} className="cursor-pointer" onClick={() => s.id && onPick?.(s.id)}>
          <title>{`${s.label}: ${s.value} يومًا · ${s.value2}%`}</title>
        </circle>
      ))}
      <text x={W - P} y={H - 8} fontSize="11" fill="var(--muted-foreground)" textAnchor="end">{spec.xLabel} ←</text>
      <text x={P} y={14} fontSize="11" fill="var(--muted-foreground)">{spec.yLabel}</text>
    </svg>
  );
}
