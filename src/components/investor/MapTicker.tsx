import type { Parcel } from "@/data/types";
import { getTickerStats } from "@/lib/mapStats";

export function MapTicker({ parcels }: { parcels: Parcel[] }) {
  const t = getTickerStats(parcels);
  const items = [
    { v: String(t.available), l: "أرضًا متاحة", hot: false },
    { v: `${t.saleValueM} مليون`, l: "قيمة المعروض للبيع", hot: false },
    { v: `${t.leaseValueM} مليون`, l: "إيجار سنوي", hot: false },
    { v: String(t.medianClosingDays ?? "—"), l: "يومًا وسيط الإغلاق", hot: false },
    { v: String(t.stagnant), l: "أرضًا راكدة", hot: true },
  ];
  return (
    <div className="pointer-events-auto flex divide-x divide-x-reverse rounded-2xl border bg-surface px-2 py-3 shadow-lg">
      {items.map((it) => (
        <div key={it.l} className="px-4 text-center sm:px-5">
          <div className={`font-mono text-lg font-bold sm:text-xl ${it.hot ? "text-destructive" : ""}`}>{it.v}</div>
          <div className="text-[11px] text-muted-foreground sm:text-xs">{it.l}</div>
        </div>
      ))}
    </div>
  );
}
