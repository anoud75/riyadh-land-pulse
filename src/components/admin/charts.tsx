import type { GapCell, SegmentStats } from "@/lib/portfolioEngine";
import { AREA_AR, AREAS, DEAL_AR, LAND_AR } from "@/data/types";

const fmt = (n: number) => n.toLocaleString("en-US");

/** Net supply − demand per region, residential and commercial side by side, diverging from 0. */
export function GapDiverging({ gaps }: { gaps: GapCell[] }) {
  const max = Math.max(1, ...gaps.map((g) => Math.abs(g.netGap)));
  return (
    <div className="space-y-3">
      {AREAS.map((a) => (
        <div key={a} className="grid grid-cols-[4rem_1fr] items-center gap-3">
          <div className="text-sm">{AREA_AR[a]}</div>
          <div className="space-y-1">
            {gaps.filter((g) => g.area === a).map((g) => {
              const w = (Math.abs(g.netGap) / max) * 50;
              const neg = g.netGap < 0;
              return (
                <div key={g.landType} className="relative h-5 rounded bg-muted/40">
                  <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
                  <div
                    className={`absolute inset-y-0 rounded transition-all ${neg ? "bg-destructive/80" : g.landType === "residential" ? "bg-chart-blue" : "bg-primary"}`}
                    style={neg ? { left: `${50 - w}%`, width: `${w}%` } : { left: "50%", width: `${w}%` }}
                  />
                  <span className={`absolute top-0 text-[11px] font-mono leading-5`} style={neg ? { left: `${Math.max(1, 50 - w - 9)}%` } : { left: `${Math.min(88, 50 + w + 1)}%` }}>
                    {LAND_AR[g.landType]} {g.netGap > 0 ? `+${g.netGap}` : g.netGap}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex justify-between text-xs text-muted-foreground"><span>← عجز (طلب أكثر من العرض)</span><span>فائض (عرض أكثر من الطلب) →</span></div>
    </div>
  );
}

export function StagnantBars({ rows, median }: { rows: { id: string; district: string; days: number }[]; median: number }) {
  const max = Math.max(median, ...rows.map((r) => r.days)) * 1.05;
  return (
    <div className="relative space-y-1.5">
      {rows.map((r) => (
        <div key={r.id} className="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-2 text-sm">
          <span className="truncate">{r.district} <span className="font-mono text-xs text-muted-foreground">{r.id}</span></span>
          <div className="relative h-4 rounded bg-muted/40">
            <div className={`h-4 rounded ${r.days > median * 2 ? "bg-destructive/80" : "bg-primary/70"}`} style={{ width: `${(r.days / max) * 100}%` }} />
            <div className="absolute inset-y-[-3px] w-0.5 bg-foreground" style={{ left: `${(median / max) * 100}%` }} />
          </div>
          <span className="font-mono text-xs">{r.days}</span>
        </div>
      ))}
      <div className="pt-1 text-xs text-muted-foreground">الخط الأسود: وسيط أيام الإغلاق ({median} يومًا)</div>
    </div>
  );
}

export function DeltaScatter({ points, stagnantDays }: { points: { id: string; district: string; days: number; delta: number; stagnant: boolean }[]; stagnantDays: number }) {
  const W = 640, H = 340, P = 40;
  const maxD = Math.max(stagnantDays * 2, ...points.map((p) => p.days)) * 1.05;
  const ext = Math.max(20, ...points.map((p) => Math.abs(p.delta))) * 1.1;
  const x = (d: number) => P + (d / maxD) * (W - 2 * P);
  const y = (v: number) => H / 2 - (v / ext) * (H / 2 - P);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" dir="ltr" role="img" aria-label="فرق سعر المتر مقابل أيام العرض">
      <rect x={x(stagnantDays)} y={P / 2} width={x(maxD) - x(stagnantDays)} height={y(0) - P / 2} className="fill-destructive/10" />
      <text x={x(maxD) - 6} y={P / 2 + 16} textAnchor="end" className="fill-destructive text-[12px]">ربع الركود</text>
      <line x1={P} x2={W - P} y1={y(0)} y2={y(0)} className="stroke-border" />
      <line x1={x(stagnantDays)} x2={x(stagnantDays)} y1={P / 2} y2={H - P / 2} className="stroke-border" strokeDasharray="4 4" />
      {[0, 60, 120, 180].filter((d) => d < maxD).map((d) => (
        <text key={d} x={x(d)} y={H - 8} textAnchor="middle" className="fill-muted-foreground font-mono text-[10px]">{d}</text>
      ))}
      {[-ext * 0.8, 0, ext * 0.8].map((v) => (
        <text key={v} x={4} y={y(v) + 3} className="fill-muted-foreground font-mono text-[10px]">{v > 0 ? "+" : ""}{Math.round(v)}%</text>
      ))}
      {points.map((p) => (
        <circle key={p.id} cx={x(p.days)} cy={y(p.delta)} r={p.stagnant ? 5 : 4} className={p.stagnant ? "fill-destructive" : "fill-chart-blue/70"}>
          <title>{`${p.id} ${p.district} · ${p.days} يومًا · ${p.delta > 0 ? "+" : ""}${p.delta}%`}</title>
        </circle>
      ))}
      <text x={W / 2} y={H - 22} textAnchor="middle" className="fill-muted-foreground text-[10px]">أيام في السوق</text>
    </svg>
  );
}

export function AgingDots({ rows }: { rows: { id: string; status: string; days: number; name: string }[] }) {
  const W = 640, H = 150, P = 24;
  const max = Math.max(...rows.map((r) => r.days), 1);
  const lanes = ["new", "contacted", "negotiating"];
  const laneAr: Record<string, string> = { new: "بلا رد", contacted: "تواصل", negotiating: "تفاوض" };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" dir="ltr" role="img" aria-label="عمر الاستفسارات">
      {lanes.map((l, li) => {
        const yy = P + li * 40;
        return (
          <g key={l}>
            <text x={W - 4} y={yy + 4} textAnchor="end" className="fill-muted-foreground text-[11px]">{laneAr[l]}</text>
            <line x1={P} x2={W - 60} y1={yy} y2={yy} className="stroke-border" />
            {rows.filter((r) => r.status === l).map((r) => (
              <circle key={r.id} cx={P + (r.days / max) * (W - 60 - P)} cy={yy} r={5} className={l === "new" && r.days > 30 ? "fill-destructive" : l === "new" ? "fill-primary" : "fill-chart-blue/60"}>
                <title>{`${r.id} · ${r.name} · ${r.days} يومًا`}</title>
              </circle>
            ))}
          </g>
        );
      })}
      <text x={P} y={H - 6} className="fill-muted-foreground font-mono text-[10px]">0</text>
      <text x={W - 60} y={H - 6} textAnchor="end" className="fill-muted-foreground font-mono text-[10px]">{max} يومًا</text>
    </svg>
  );
}

export function Funnel({ steps }: { steps: { key: string; label: string; n: number }[] }) {
  const max = Math.max(1, steps[0]?.n ?? 1);
  return (
    <div className="space-y-2">
      {steps.map((s) => (
        <div key={s.key} className="flex items-center gap-3">
          <span className="w-20 text-sm">{s.label}</span>
          <div className="h-7 flex-1"><div className="flex h-7 items-center rounded-lg bg-primary/80 px-2 font-mono text-xs text-primary-foreground transition-all" style={{ width: `${Math.max(6, (s.n / max) * 100)}%` }}>{s.n}</div></div>
        </div>
      ))}
    </div>
  );
}

export function MonthBars({ rows }: { rows: { month: string; n: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div className="flex h-48 items-end gap-4" dir="ltr">
      {rows.map((r) => (
        <div key={r.month} className="flex flex-1 flex-col items-center gap-1">
          <span className="font-mono text-xs">{r.n}</span>
          <div className="w-full rounded-t bg-primary" style={{ height: `${(r.n / max) * 150}px` }} />
          <span className="font-mono text-[11px] text-muted-foreground">{r.month}</span>
        </div>
      ))}
    </div>
  );
}

export function VelocityBubbles({ segs }: { segs: SegmentStats[] }) {
  const W = 640, H = 320, P = 44;
  const solid = segs.filter((s) => !s.insufficientSample);
  const maxDays = Math.max(60, ...solid.map((s) => s.medianClosingDays ?? 0)) * 1.15;
  const maxPrice = Math.max(1000, ...solid.map((s) => s.medianPricePerSqm ?? 0)) * 1.15;
  const x = (d: number) => P + (d / maxDays) * (W - 2 * P);
  const y = (v: number) => H - P - (v / maxPrice) * (H - 2 * P);
  const thin = segs.filter((s) => s.insufficientSample);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" dir="ltr" role="img" aria-label="سرعة الشرائح">
        <line x1={P} x2={W - P} y1={H - P} y2={H - P} className="stroke-border" />
        <line x1={P} x2={P} y1={P} y2={H - P} className="stroke-border" />
        <text x={W / 2} y={H - 10} textAnchor="middle" className="fill-muted-foreground text-[10px]">وسيط أيام الإغلاق</text>
        <text x={8} y={P - 12} className="fill-muted-foreground text-[10px]">وسيط سعر المتر</text>
        {solid.map((s) => {
          const label = `${AREA_AR[s.area]} ${LAND_AR[s.landType]} ${DEAL_AR[s.dealType]}`;
          return (
            <g key={label}>
              <circle cx={x(s.medianClosingDays!)} cy={y(s.medianPricePerSqm!)} r={6 + s.closedDeals * 2} className={s.landType === "residential" ? "fill-chart-blue/40 stroke-chart-blue" : "fill-primary/40 stroke-primary"} />
              <text x={x(s.medianClosingDays!)} y={y(s.medianPricePerSqm!) - 10 - s.closedDeals * 2} textAnchor="middle" className="fill-foreground text-[10px]">{label} · {s.closedDeals}</text>
            </g>
          );
        })}
      </svg>
      {thin.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {thin.map((s) => (
            <span key={s.area + s.landType + s.dealType} className="rounded-full border border-dashed px-2 py-0.5 text-muted-foreground">
              {AREA_AR[s.area]} {LAND_AR[s.landType]} {DEAL_AR[s.dealType]} · {s.closedDeals} — عينة غير كافية
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export { fmt };
