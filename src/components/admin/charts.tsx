import type { GapCell, SegmentStats } from "@/lib/portfolioEngine";
import { AREA_AR, AREAS, DEAL_AR, LAND_AR } from "@/data/types";

import { useTip } from "./chartKit";
import { Button } from "@/components/ui/button";

const fmt = (n: number) => n.toLocaleString("en-US");

/** Net supply − demand per area & land type. Shortage left (red), surplus right. Click a row to drill down. */
export function GapDiverging({ gaps, selected, onPick }: { gaps: GapCell[]; selected?: string | null | undefined; onPick?: ((g: GapCell) => void) | undefined }) {
  const max = Math.max(1, ...gaps.map((g) => Math.abs(g.netGap))) * 1.25;
  const { show, setTip, layer } = useTip();
  return (
    <div className="relative space-y-3" onMouseLeave={() => setTip(null)} onBlur={() => setTip(null)}>
      <div className="grid grid-cols-[3.5rem_1fr] text-[11px] text-muted-foreground"><span /><div dir="ltr" className="flex justify-between"><span>← عجز: مشترون بلا أرض</span><span>فائض: أراضٍ بلا مشترين →</span></div></div>
      {AREAS.map((a) => (
        <div key={a} className="grid grid-cols-[3.5rem_1fr] items-center gap-3">
          <div className="text-sm font-medium">{AREA_AR[a]}</div>
          <div className="space-y-1.5">
            {gaps.filter((g) => g.area === a).map((g) => {
              const w = (Math.abs(g.netGap) / max) * 50;
              const neg = g.netGap < 0;
              const key = `${g.area}|${g.landType}`;
              const on = selected === key;
              return (
                <Button variant="ghost" type="button" key={g.landType} onClick={() => onPick?.(g)}
                  aria-label={`${AREA_AR[g.area]} · ${LAND_AR[g.landType]}`} aria-pressed={on}
                  onMouseEnter={(e) => show(e, <><b>{AREA_AR[g.area]} · {LAND_AR[g.landType]}</b><div>{g.availableParcels} أرض متاحة · {g.openInquiries} استفسار مفتوح</div><div>{g.netGap < 0 ? `عجز ${Math.abs(g.netGap)} أراضٍ` : g.netGap > 0 ? `فائض ${g.netGap} أراضٍ` : "العرض يساوي الطلب"}</div></>)}
                  onFocus={(e) => show(e, <><b>{AREA_AR[g.area]} · {LAND_AR[g.landType]}</b><div>{g.availableParcels} أرض متاحة · {g.openInquiries} استفسار مفتوح</div></>)}
                  className={`relative block h-8 w-full rounded-md px-0 text-right transition ${on ? "bg-accent ring-1 ring-primary" : "bg-muted/40 hover:bg-muted"}`} dir="ltr">
                  <span className="absolute inset-y-1 left-1/2 w-px bg-foreground/30" />
                  {g.netGap !== 0 && <span className={`absolute inset-y-1 rounded ${neg ? "bg-destructive/80" : g.landType === "residential" ? "bg-chart-blue" : "bg-primary"}`} style={neg ? { left: `${50 - w}%`, width: `${w}%` } : { left: "50%", width: `${w}%` }} />}
                  <span className={`absolute inset-y-0 flex items-center gap-1 px-2 text-[11px] ${neg ? "right-0" : "left-0"}`} dir="rtl">
                    <b className="font-mono">{g.netGap > 0 ? `+${g.netGap}` : g.netGap}</b><span className="text-muted-foreground">{LAND_AR[g.landType]}</span>
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      ))}
      {layer}
    </div>
  );
}

/** Longest-listed available parcels with the median-closing line. Click opens the parcel. */
export function StagnantBars({ rows, median, onPick }: { rows: { id: string; district: string; days: number }[]; median: number; onPick?: ((id: string) => void) | undefined }) {
  const max = Math.max(1, median, ...rows.map((r) => r.days)) * 1.08;
  const { show, setTip, layer } = useTip();
  return (
    <div className="relative space-y-2" onMouseLeave={() => setTip(null)} onBlur={() => setTip(null)}>
      {rows.map((r) => {
        const late = r.days > median * 2;
        return (
          <Button variant="ghost" type="button" key={r.id} onClick={() => onPick?.(r.id)}
            aria-label={`${r.district} ${r.id}`}
            onMouseEnter={(e) => show(e, <><b>{r.district} · {r.id}</b><div>{r.days} يومًا في السوق</div><div>وسيط الإغلاق {median} يومًا</div><div>{Math.round(r.days / Math.max(median, 1) * 10) / 10} ضعف المدة المعتادة</div></>)}
            onFocus={(e) => show(e, <><b>{r.district} · {r.id}</b><div>{r.days} يومًا في السوق · الوسيط {median} يومًا</div></>)}
            className="grid h-9 w-full grid-cols-[6.5rem_1fr_3.5rem] items-center gap-2 rounded-md px-1 py-0.5 text-right text-sm hover:bg-secondary">
            <span className="truncate">{r.district} <span className="font-mono text-[11px] text-muted-foreground">{r.id}</span></span>
            <span className="relative h-5 rounded bg-muted/40" dir="ltr">
              <span className={`absolute inset-y-0 left-0 rounded ${late ? "bg-destructive/80" : "bg-primary/70"}`} style={{ width: `${(r.days / max) * 100}%` }} />
              <span className="absolute -inset-y-1 w-0.5 bg-foreground" style={{ left: `${(median / max) * 100}%` }} />
            </span>
            <span className="font-mono text-xs">{r.days} يوم</span>
          </Button>
        );
      })}
      {layer}
    </div>
  );
}

export type ScatterPt = { id: string; district: string; days: number; delta: number; stagnant: boolean };
/** Price-per-m² gap to segment median (y) vs days on market (x). Top-right shaded = overpriced & stagnant. */
export function DeltaScatter({ points, stagnantDays, selected, onPick }: { points: ScatterPt[]; stagnantDays: number; selected?: string | null | undefined; onPick?: ((id: string) => void) | undefined }) {
  const W = 720, H = 380, L = 56, R = 16, T = 20, B = 44;
  const maxD = Math.ceil((Math.max(stagnantDays * 2, ...points.map((p) => p.days)) * 1.05) / 30) * 30;
  const ext = Math.ceil((Math.max(20, ...points.map((p) => Math.abs(p.delta))) * 1.1) / 10) * 10;
  const x = (d: number) => L + (d / maxD) * (W - L - R);
  const y = (v: number) => T + ((ext - v) / (2 * ext)) * (H - T - B);
  const { setTip, layer } = useTip();
  const xt = Array.from({ length: maxD / 30 + 1 }, (_, i) => i * 30);
  const yt = [-ext, -ext / 2, 0, ext / 2, ext];
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" direction="ltr" role="img" aria-label="فرق سعر المتر عن الوسيط مقابل أيام العرض" onMouseLeave={() => setTip(null)}>
        <rect x={x(stagnantDays)} y={T} width={x(maxD) - x(stagnantDays)} height={y(0) - T} className="fill-destructive/10" />
        <text x={x(maxD) - 8} y={T + 18} textAnchor="end" className="fill-destructive text-[12px] font-semibold">أغلى من السوق وراكدة</text>
        <text x={x(maxD) - 8} y={T + 34} textAnchor="end" className="fill-destructive/80 text-[11px]">تحتاج مراجعة سعر</text>
        <text x={L + 8} y={H - B - 10} className="fill-muted-foreground text-[11px]">أرخص من السوق وتتحرك</text>
        {yt.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className={v === 0 ? "stroke-foreground/40" : "stroke-border"} strokeDasharray={v === 0 ? undefined : "2 4"} />
            <text x={L - 8} y={y(v) + 4} textAnchor="end" className="fill-muted-foreground font-mono text-[11px]">{v > 0 ? "+" : ""}{v}%</text>
          </g>
        ))}
        {xt.map((d) => <text key={d} x={x(d)} y={H - B + 18} textAnchor="middle" className="fill-muted-foreground font-mono text-[11px]">{d}</text>)}
        <line x1={x(stagnantDays)} x2={x(stagnantDays)} y1={T} y2={H - B} className="stroke-destructive/60" strokeDasharray="5 4" />
        <text x={x(stagnantDays) + 4} y={H - B - 6} className="fill-destructive text-[10px]">حد الركود {stagnantDays} يومًا</text>
        <text x={(L + W - R) / 2} y={H - 6} textAnchor="middle" className="fill-muted-foreground text-[12px]">أيام العرض في السوق →</text>
        <text x={14} y={(T + H - B) / 2} textAnchor="middle" transform={`rotate(-90 14 ${(T + H - B) / 2})`} className="fill-muted-foreground text-[12px]">فرق سعر المتر عن الوسيط</text>
        {points.map((p) => {
          const on = selected === p.id;
          return (
            <circle key={p.id} cx={x(p.days)} cy={y(p.delta)} r={on ? 9 : p.stagnant ? 6 : 5}
              className={`cursor-pointer transition ${p.stagnant ? "fill-destructive" : "fill-chart-blue/70"} ${on ? "stroke-foreground" : "stroke-card"}`} strokeWidth={on ? 3 : 1.5}
              onMouseEnter={() => setTip({ x: (x(p.days) / W) * 100, y: (y(p.delta) / H) * 100, body: <><b>{p.district} · {p.id}</b><div>{p.days} يومًا في السوق</div><div>سعر المتر {p.delta > 0 ? "أعلى" : "أقل"} من الوسيط بـ {Math.abs(p.delta)}%</div></> })}
              onClick={() => onPick?.(p.id)} />
          );
        })}
      </svg>
      {layer}
    </div>
  );
}

export function AgingDots({ rows }: { rows: { id: string; status: string; days: number; name: string }[] }) {
  const W = 640, H = 150, P = 24;
  const max = Math.max(...rows.map((r) => r.days), 1);
  const lanes = ["new", "contacted", "negotiating"];
  const laneAr: Record<string, string> = { new: "بلا رد", contacted: "تواصل", negotiating: "تفاوض" };
  const { show, setTip, layer } = useTip();
  return (
    <div className="relative" onMouseLeave={() => setTip(null)} onBlur={() => setTip(null)}>
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" direction="ltr" role="img" aria-label="عمر الاستفسارات">
      {lanes.map((l, li) => {
        const yy = P + li * 40;
        return (
          <g key={l}>
            <text x={W - 4} y={yy + 4} textAnchor="end" className="fill-muted-foreground text-[11px]">{laneAr[l]}</text>
            <line x1={P} x2={W - 60} y1={yy} y2={yy} className="stroke-border" />
            {rows.filter((r) => r.status === l).map((r) => (
              <circle key={r.id} cx={P + (r.days / max) * (W - 60 - P)} cy={yy} r={6} tabIndex={0} aria-label={`${r.name} · ${r.days} يومًا`}
                onMouseEnter={(e) => show(e, <><b>{r.name} · {r.id}</b><div>{laneAr[l]} · ينتظر {r.days} يومًا</div></>)}
                onFocus={(e) => show(e, <><b>{r.name} · {r.id}</b><div>{laneAr[l]} · ينتظر {r.days} يومًا</div></>)}
                className={`cursor-pointer stroke-card stroke-2 hover:stroke-foreground ${l === "new" && r.days > 30 ? "fill-destructive" : l === "new" ? "fill-primary" : "fill-chart-blue/60"}`}>
                <title>{`${r.id} · ${r.name} · ${r.days} يومًا`}</title>
              </circle>
            ))}
          </g>
        );
      })}
      <text x={P} y={H - 6} className="fill-muted-foreground font-mono text-[10px]">0</text>
      <text x={W - 60} y={H - 6} textAnchor="end" className="fill-muted-foreground font-mono text-[10px]">{max} يومًا</text>
    </svg>
    {layer}
    </div>
  );
}

export function Funnel({ steps }: { steps: { key: string; label: string; n: number }[] }) {
  const max = Math.max(1, steps[0]?.n ?? 1);
  const { show, setTip, layer } = useTip();
  return (
    <div className="relative space-y-3" onMouseLeave={() => setTip(null)} onBlur={() => setTip(null)}>
      {steps.map((s) => (
        <div key={s.key} tabIndex={0} className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onMouseEnter={(e) => show(e, <><b>{s.label}</b><div>{s.n} استفسارًا</div><div>{Math.round(s.n / max * 100)}% مقارنة بالمرحلة الأولى</div></>)}
          onFocus={(e) => show(e, <><b>{s.label}</b><div>{s.n} استفسارًا</div></>)}>
          <span className="w-20 text-sm">{s.label}</span>
          <div className="h-7 flex-1"><div className="flex h-7 items-center rounded-lg bg-primary/80 px-2 font-mono text-xs text-primary-foreground transition-all" style={{ width: `${Math.max(6, (s.n / max) * 100)}%` }}>{s.n}</div></div>
        </div>
      ))}
      {layer}
    </div>
  );
}

export function MonthBars({ rows }: { rows: { month: string; n: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  const avg = rows.reduce((s, r) => s + r.n, 0) / Math.max(rows.length, 1);
  const { show, setTip, layer } = useTip();
  const label = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { month: "short", year: "2-digit", timeZone: "UTC" });
  return (
    <div className="relative" onMouseLeave={() => setTip(null)} onBlur={() => setTip(null)}>
      <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-foreground/30" style={{ bottom: `${24 + (avg / max) * 180}px` }}><span className="absolute -top-4 left-0 text-[10px] text-muted-foreground">المتوسط {Math.round(avg * 10) / 10}</span></div>
      <div className="flex items-end gap-2" style={{ height: 210 }}>
        {rows.map((r) => (
          <div key={r.month} tabIndex={0} aria-label={`${label(r.month)}: ${r.n} صفقة`} className="group flex min-w-0 flex-1 flex-col items-center gap-1 rounded-md outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onMouseEnter={(e) => show(e, <><b>{label(r.month)}</b><div>{r.n} صفقة مغلقة بحسب شهر الإدراج</div><div>المتوسط الشهري {Math.round(avg * 10) / 10}</div></>)}
            onFocus={(e) => show(e, <><b>{label(r.month)}</b><div>{r.n} صفقة مغلقة بحسب شهر الإدراج</div></>)}>
            <span className="font-mono text-xs font-semibold">{r.n}</span>
            <div className="w-full max-w-12 rounded-t-md bg-primary/80 transition group-hover:bg-primary" style={{ height: `${(r.n / max) * 180}px` }} />
            <span className="text-center text-[10px] leading-4 text-muted-foreground">{label(r.month)}</span>
          </div>
        ))}
      </div>
      {layer}
    </div>
  );
}

const segLabel = (s: SegmentStats) => `${AREA_AR[s.area]} · ${LAND_AR[s.landType]} · ${DEAL_AR[s.dealType]}`;
export const segKey = (s: Pick<SegmentStats, "area" | "landType" | "dealType">) => `${s.area}|${s.landType}|${s.dealType}`;

/** Segment = area · land type · deal. x = median closing days, y = median price/m², size = closed deals. */
export function VelocityBubbles({ segs, selected, onPick }: { segs: SegmentStats[]; selected?: string | null | undefined; onPick?: ((s: SegmentStats) => void) | undefined }) {
  const W = 720, H = 380, L = 64, R = 24, T = 24, B = 44;
  const solid = segs.filter((s) => !s.insufficientSample && s.medianClosingDays != null && s.medianPricePerSqm != null);
  const maxDays = Math.ceil((Math.max(60, ...solid.map((s) => (s.medianClosingDays ?? 0))) * 1.15) / 20) * 20;
  const maxPrice = Math.ceil((Math.max(1000, ...solid.map((s) => (s.medianPricePerSqm ?? 0))) * 1.15) / 500) * 500;
  const maxDeals = Math.max(3, ...solid.map((s) => s.closedDeals));
  const x = (d: number) => L + (d / maxDays) * (W - L - R);
  const y = (v: number) => H - B - (v / maxPrice) * (H - T - B);
  const r = (n: number) => 8 + Math.sqrt(n / maxDeals) * 22;
  const { setTip, layer } = useTip();
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" direction="ltr" role="img" aria-label="سرعة البيع حسب الشريحة" onMouseLeave={() => setTip(null)}>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={L} x2={W - R} y1={y(maxPrice * f)} y2={y(maxPrice * f)} className="stroke-border" strokeDasharray={f ? "2 4" : undefined} />
            <text x={L - 8} y={y(maxPrice * f) + 4} textAnchor="end" className="fill-muted-foreground font-mono text-[11px]">{fmt(Math.round(maxPrice * f))}</text>
            <text x={x(maxDays * f)} y={H - B + 18} textAnchor="middle" className="fill-muted-foreground font-mono text-[11px]">{Math.round(maxDays * f)}</text>
          </g>
        ))}
        <text x={(L + W - R) / 2} y={H - 6} textAnchor="middle" className="fill-muted-foreground text-[12px]">أيام حتى الإغلاق (الوسيط) — أبطأ →</text>
        <text x={16} y={(T + H - B) / 2} textAnchor="middle" transform={`rotate(-90 16 ${(T + H - B) / 2})`} className="fill-muted-foreground text-[12px]">سعر المتر (الوسيط، ريال) ← أغلى</text>
        {solid.sort((a, b) => b.closedDeals - a.closedDeals).map((s) => {
          const k = segKey(s), on = selected === k;
          const cx = x((s.medianClosingDays ?? 0)), cy = y((s.medianPricePerSqm ?? 0));
          return (
            <g key={k} tabIndex={0} role="button" aria-label={segLabel(s)} className="cursor-pointer outline-none" onClick={() => onPick?.(s)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick?.(s); } }}
              onFocus={() => setTip({ x: (cx / W) * 100, y: (cy / H) * 100, body: <><b>{segLabel(s)}</b><div>{s.closedDeals} صفقات · وسيط الإغلاق {s.medianClosingDays} يومًا</div></> })}
              onBlur={() => setTip(null)}
              onMouseEnter={() => setTip({ x: (cx / W) * 100, y: ((cy - r(s.closedDeals)) / H) * 100, body: <><b>{segLabel(s)}</b><div>{s.closedDeals} صفقات مغلقة</div><div>وسيط الإغلاق {s.medianClosingDays} يومًا</div><div>سعر المتر {fmt((s.medianPricePerSqm ?? 0))} ريال</div></> })}>
              <circle cx={cx} cy={cy} r={r(s.closedDeals)} className={`${s.landType === "residential" ? "fill-chart-blue/35 stroke-chart-blue" : "fill-primary/35 stroke-primary"}`} strokeWidth={on ? 3 : 1.5} strokeDasharray={s.dealType === "lease" ? "4 3" : undefined} />
              <text x={cx} y={cy + 4} textAnchor="middle" className="pointer-events-none fill-foreground font-mono text-[11px] font-semibold">{s.closedDeals}</text>
            </g>
          );
        })}
      </svg>
      {layer}
    </div>
  );
}

export { fmt, segLabel };
