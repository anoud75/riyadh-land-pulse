import { Link } from "@tanstack/react-router";
import { ArrowDown } from "lucide-react";
import { useTip } from "./chartKit";
import type { AreaClosingRow, FunnelStep, PricingReviewRow, SegmentTimeRow } from "@/lib/adminEngine";

const fmt = (n: number) => n.toLocaleString("en-US");
const dealCount = (n: number) => (n === 1 ? "صفقة واحدة" : n === 2 ? "صفقتان" : n <= 10 ? `${n} صفقات` : `${n} صفقة`);
/** One accent, shaded by how strong the value is — no new colors. */
const tint = (pct: number) => `color-mix(in oklab, var(--primary) ${Math.round(Math.max(18, Math.min(100, pct)))}%, white)`;
const striped = { backgroundImage: "repeating-linear-gradient(45deg, color-mix(in oklab, var(--primary) 35%, transparent) 0 5px, transparent 5px 10px)" };

/** Step-down funnel: each stage is a share of the one before it, with what the hand-off lost. */
export function FunnelSteps({ steps, note, noteStrong }: { steps: FunnelStep[]; note: string; noteStrong: string }) {
  const max = Math.max(1, steps[0]?.n ?? 1);
  const { show, setTip, layer } = useTip();
  return (
    <div className="relative" onMouseLeave={() => setTip(null)} onBlur={() => setTip(null)}>
      {steps.map((s, i) => (
        <div key={s.key}>
          <div
            tabIndex={0}
            onMouseEnter={(e) => show(e, <><b>{s.label}</b><div>{s.n} استفسارًا · {Math.round((s.n / max) * 100)}% من الوارد</div>{i > 0 && steps[i - 1]!.n > 0 && <div>{Math.round((s.n / steps[i - 1]!.n) * 100)}% ممّن سبقوه</div>}</>)}
            onFocus={(e) => show(e, <><b>{s.label}</b><div>{s.n} استفسارًا</div></>)}
            className={`flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-primary-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring ${i === 0 ? "bg-primary" : i === 1 ? "bg-primary/80" : "bg-primary/60"}`}
            style={{ width: `${Math.max(38, (s.n / max) * 100)}%` }}
          >
            <span className="text-sm font-medium">{s.label}</span>
            <span className="font-mono text-2xl font-bold leading-none">{s.n}</span>
          </div>
          {s.lost > 0 && (
            <div className="flex items-center gap-1.5 py-1.5 pr-5 text-xs text-muted-foreground">
              <ArrowDown className="size-3.5 shrink-0" />
              <span>سقط {s.lost}{s.lostNote ? ` — ${s.lostNote}` : ""}</span>
            </div>
          )}
        </div>
      ))}
      <p className="mt-3 border-t pt-3 text-xs leading-6 text-muted-foreground">
        {note} <b className="font-semibold text-destructive">{noteStrong}</b>
      </p>
      {layer}
    </div>
  );
}

/** Share of each area's own holdings that reached a closed deal, with the closing speed beside it. */
export function ClosingRateBars({ rows, note }: { rows: AreaClosingRow[]; note: string }) {
  const max = Math.max(1, ...rows.map((r) => r.rate));
  const { show, setTip, layer } = useTip();
  return (
    <div className="relative" onMouseLeave={() => setTip(null)} onBlur={() => setTip(null)}>
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div
            key={r.area} tabIndex={0}
            onMouseEnter={(e) => show(e, <><b>{r.label}</b><div>{r.closed} مغلقة من {r.total} — {r.rate}%</div><div>{r.medianDays != null ? `وسيط الإغلاق ${r.medianDays} يومًا` : "لا صفقات مغلقة بعد"}</div></>)}
            onFocus={(e) => show(e, <><b>{r.label}</b><div>{r.rate}% إغلاق</div></>)}
            className="grid grid-cols-[3.5rem_minmax(0,1fr)_8rem] items-center gap-3 rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <span className="text-sm font-medium">{r.label}</span>
            <div className="h-7 rounded-full bg-muted">
              <div className="flex h-7 items-center rounded-full px-2.5 text-[11px] font-semibold text-primary-foreground transition-all" style={{ width: `${Math.max(9, (r.rate / max) * 100)}%`, background: tint(40 + 60 * (r.rate / max)) }}>
                <span className="font-mono">{r.rate}%</span>
              </div>
            </div>
            <span className="text-left font-mono text-[11px] text-muted-foreground">{r.closed}/{r.total} · {r.medianDays ?? "—"} يومًا</span>
          </div>
        ))}
      </div>
      <p className="mt-4 border-t pt-3 text-xs leading-6 text-muted-foreground">{note}</p>
      {layer}
    </div>
  );
}

/** Median days to close per land type × deal type; segments under three deals stay visibly unproven. */
export function SegmentTimeBars({ rows, note }: { rows: SegmentTimeRow[]; note: string }) {
  const max = Math.max(1, ...rows.filter((r) => r.sufficient).map((r) => r.medianDays ?? 0));
  const { show, setTip, layer } = useTip();
  return (
    <div className="relative" onMouseLeave={() => setTip(null)} onBlur={() => setTip(null)}>
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div
            key={`${r.landType}|${r.dealType}`} tabIndex={0}
            onMouseEnter={(e) => show(e, <><b>{r.label}</b><div>{dealCount(r.n)} مغلقة</div><div>{r.sufficient ? `وسيط الإغلاق ${r.medianDays} يومًا` : "عينة غير كافية — لا يُبنى عليها حكم"}</div></>)}
            onFocus={(e) => show(e, <><b>{r.label}</b><div>{dealCount(r.n)} مغلقة</div></>)}
            className="grid grid-cols-[6.5rem_minmax(0,1fr)_8.5rem] items-center gap-3 rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <span className="text-sm font-medium">{r.label}</span>
            <div className="h-6 rounded-full bg-muted">
              {r.sufficient ? (
                <div className="h-6 rounded-full transition-all" style={{ width: `${Math.max(6, ((r.medianDays ?? 0) / max) * 100)}%`, background: tint(78) }} />
              ) : (
                <div className="h-6 w-full rounded-full" style={striped} />
              )}
            </div>
            <span className="text-left font-mono text-[11px] text-muted-foreground">{r.sufficient ? `${r.medianDays} يومًا` : `${dealCount(r.n)} — غير كافية`}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 border-t pt-3 text-xs leading-6 text-muted-foreground">{note}</p>
      {layer}
    </div>
  );
}

/** Lands that are both priced above their segment median and slower than its median close. */
export function PricingReviewTable({ rows, note }: { rows: PricingReviewRow[]; note: string }) {
  const maxDelta = Math.max(1, ...rows.map((r) => r.deltaPct));
  const { show, setTip, layer } = useTip();
  return (
    <div className="relative" onMouseLeave={() => setTip(null)} onBlur={() => setTip(null)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-sm">
          <thead>
            <tr className="text-right text-[11px] text-muted-foreground">
              <th className="pb-2 font-medium">الأرض</th>
              <th className="pb-2 font-medium">الشريحة</th>
              <th className="w-[30%] pb-2 font-medium">فوق وسيط المنطقة</th>
              <th className="pb-2 font-medium">مدة العرض</th>
              <th className="pb-2 text-left font-medium">الضعف</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id} tabIndex={0}
                onMouseEnter={(e) => show(e, <><b>{r.district} · {r.id}</b><div>{r.segment}</div><div>سعر المتر {fmt(r.pricePerSqm)} ريال مقابل وسيط {fmt(r.medianPricePerSqm)}</div><div>{r.days} يومًا في السوق مقابل {r.medianDays} يومًا وسيطًا · {fmt(r.totalPrice)} ريال</div></>)}
                onFocus={(e) => show(e, <><b>{r.district}</b><div>+{r.deltaPct}% فوق وسيط الشريحة</div></>)}
                className="border-t outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <td className="py-2 pl-2">
                  <Link to="/admin/portfolio" search={{ focus: r.id }} className="flex flex-col rounded-md px-1 py-0.5 hover:bg-secondary">
                    <span className="font-medium">{r.district}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{r.id}</span>
                  </Link>
                </td>
                <td className="whitespace-nowrap py-2 text-xs text-muted-foreground">{r.segment}</td>
                <td className="py-2">
                  <div className="h-5 rounded-full bg-muted">
                    <div className="flex h-5 items-center rounded-full px-1.5 text-[10px] font-semibold text-primary-foreground" style={{ width: `${Math.max(16, (r.deltaPct / maxDelta) * 100)}%`, background: tint(45 + 55 * (r.deltaPct / maxDelta)) }}>
                      <span className="font-mono">+{r.deltaPct}%</span>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap py-2 font-mono text-xs">{r.days} مقابل {r.medianDays} يومًا</td>
                <td className="py-2 text-left font-mono text-xs">x{r.domMultiplier}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 border-t pt-3 text-xs leading-6 text-muted-foreground">{note}</p>
      {layer}
    </div>
  );
}
