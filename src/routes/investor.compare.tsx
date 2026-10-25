import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { usePortfolio } from "@/context/PortfolioProvider";
import { AREA_AR, DEAL_AR, LAND_AR } from "@/data/types";
import { compareParcels, type ParcelInsight } from "@/lib/investorEngine";
import { pct, sar } from "@/components/investor/format";

export const Route = createFileRoute("/investor/compare")({
  head: () => ({
    meta: [
      { title: "المقارنة — سرج" },
      { name: "description", content: "قارن بين أراضٍ مختارة بسعر المتر وأيام السوق ووسيط الشريحة." },
      { property: "og:title", content: "المقارنة — سرج" },
      { property: "og:description", content: "مقارنة الأراضي جنبًا إلى جنب." },
    ],
  }),
  component: Compare,
});

type Row = { label: string; value: (i: ParcelInsight) => ReactNode; best?: (i: ParcelInsight) => number | null; dir?: 1 | -1 };

const ROWS: Row[] = [
  { label: "المنطقة والنوع", value: (i) => `${AREA_AR[i.parcel.area_of_city]} · ${LAND_AR[i.parcel.land_type]} · ${DEAL_AR[i.parcel.listing_type]}` },
  { label: "السعر", value: (i) => (i.parcel.missingPrice ? "غير مسجل" : `${sar(i.parcel.total_price_sar)} ريال`) },
  { label: "سعر المتر", value: (i) => (i.parcel.missingPrice ? "غير مسجل" : `${sar(i.parcel.price_per_sqm_sar)} ريال`), best: (i) => i.parcel.price_per_sqm_sar, dir: -1 },
  { label: "المساحة", value: (i) => `${sar(i.parcel.area_sqm)} م²` },
  { label: "عرض الشارع", value: (i) => `${i.parcel.street_width_m} م`, best: (i) => i.parcel.street_width_m, dir: 1 },
  { label: "أيام في السوق", value: (i) => `${i.parcel.days_on_market} يومًا` },
  { label: "صفقات مغلقة في الشريحة", value: (i) => i.segment.closedDeals },
  { label: "وسيط سعر المتر", value: (i) => (i.segment.insufficientSample ? "عينة غير كافية" : `${sar(i.segment.medianPricePerSqm)} ريال`) },
  { label: "الفرق عن الوسيط", value: (i) => (i.segment.insufficientSample ? "عينة غير كافية" : pct(i.priceDeltaPct) ?? "—"), best: (i) => i.priceDeltaPct, dir: -1 },
  { label: "أيام السوق ÷ وسيط الإغلاق", value: (i) => (i.domMultiplier == null ? "عينة غير كافية" : `×${i.domMultiplier}`), best: (i) => i.domMultiplier, dir: 1 },
];

function Compare() {
  const { parcels, compareIds, toggleCompare } = usePortfolio();
  const items = compareParcels(parcels, compareIds);
  if (!items.length)
    return <p className="text-muted-foreground">لم تضيفي أرضًا للمقارنة بعد. <Link to="/investor" className="text-primary">تصفّحي الأراضي</Link></p>;

  const bestOf = (r: Row) => {
    if (!r.best) return null;
    const vals = items.map((i) => r.best!(i)).filter((v): v is number => v != null);
    if (vals.length < 2) return null;
    return r.dir === 1 ? Math.max(...vals) : Math.min(...vals);
  };
  const insufficient = items.filter((i) => i.segment.insufficientSample);
  const room = items.filter((i) => i.domMultiplier != null).sort((a, b) => b.domMultiplier! - a.domMultiplier!)[0];

  return (
    <div>
      <h1 className="text-3xl font-bold">المقارنة</h1>
      <p className="mt-2 text-muted-foreground">{items.length} أراضٍ. الصفوف التي يصحّ فيها ترتيب أفضل تحمل علامة.</p>
      <div className="mt-6 overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-4" />
              {items.map((i) => (
                <th key={i.parcel.parcel_id} className="p-4 text-right align-top">
                  <Link to="/investor/parcels/$parcelId" params={{ parcelId: i.parcel.parcel_id }} className="text-lg font-semibold hover:text-primary">{i.parcel.district_ar}</Link>
                  <div className="font-mono text-xs text-muted-foreground">{i.parcel.parcel_id}</div>
                  <button onClick={() => toggleCompare(i.parcel.parcel_id)} className="mt-1 text-xs text-muted-foreground hover:text-destructive">إزالة</button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => {
              const b = bestOf(r);
              return (
                <tr key={r.label} className="border-b last:border-0">
                  <td className="p-4 text-muted-foreground">{r.label}</td>
                  {items.map((i) => {
                    const isBest = b != null && r.best!(i) === b;
                    return (
                      <td key={i.parcel.parcel_id} className={`p-4 font-mono ${isBest ? "text-primary" : ""}`}>
                        {r.value(i)} {isBest && <span className="font-sans text-xs">● الأفضل</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <section className="mt-8 rounded-2xl border bg-accent p-6 text-accent-foreground">
        <h2 className="font-semibold">الخطوة التالية</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {room && <li>أوسع هامش تفاوض في {room.parcel.district_ar} ({room.parcel.parcel_id}): معروضة منذ {room.parcel.days_on_market} يومًا، ×{room.domMultiplier} من وسيط إغلاق شريحتها. ابدئي التفاوض من وسيط {sar(room.segment.medianPricePerSqm)} ريال للمتر.</li>}
          {insufficient.length > 0 && <li>{insufficient.map((i) => i.parcel.district_ar).join(" و")}: شريحتها أغلقت أقل من 3 صفقات، فلا وسيط يُبنى عليه. اطلبي من فريق سرج آخر عروض المنطقة قبل تقديم سعر.</li>}
          <li>الاستخدام النظامي وحدود القطع لم يُتحقق منها لدى الأمانة بعد.</li>
        </ul>
      </section>
    </div>
  );
}
