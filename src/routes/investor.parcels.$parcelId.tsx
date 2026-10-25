import { createFileRoute, Link } from "@tanstack/react-router";
import { usePortfolio } from "@/context/PortfolioProvider";
import { AREA_AR, DEAL_AR, LAND_AR } from "@/data/types";
import { getNearbyParcels, getParcelInsight } from "@/lib/investorEngine";
import { Fact, PriceLine } from "@/components/investor/ParcelCard";
import { pct, sar } from "@/components/investor/format";
import { MarketInsightCard } from "@/components/investor/MarketInsightCard";
import { ParcelSnapshot } from "@/components/investor/ParcelSnapshot";
import { buildMarketInsight } from "@/lib/marketEngine";
import { ParcelHighlights } from "@/components/investor/ParcelHighlights";

export const Route = createFileRoute("/investor/parcels/$parcelId")({
  head: ({ params }) => ({
    meta: [
      { title: `أرض ${params.parcelId} — سرج` },
      { name: "description", content: `تفاصيل الأرض ${params.parcelId} ومقارنتها بوسيط شريحتها.` },
      { property: "og:title", content: `أرض ${params.parcelId} — سرج` },
      { property: "og:description", content: "لماذا رُشّحت، وما لم يتحقق منه." },
    ],
  }),
  component: Detail,
});

function Detail() {
  const { parcelId } = Route.useParams();
  const { parcels } = usePortfolio();
  const ins = getParcelInsight(parcels, parcelId);
  if (!ins) return <p>لم نجد هذه الأرض. <Link to="/investor" className="text-primary">عودة إلى الأراضي</Link></p>;
  const { parcel: p, segment: s } = ins;
  const segLabel = `${AREA_AR[p.area_of_city]} · ${LAND_AR[p.land_type]} · ${DEAL_AR[p.listing_type]}`;
  const nearby = getNearbyParcels(parcels, parcelId);

  return (
    <div>
      <Link to="/investor" className="text-sm text-muted-foreground hover:text-foreground">‹ عودة إلى النتائج</Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">{p.district_ar}</h1>
          <div className="mt-1 text-muted-foreground">{segLabel} · <span className="font-mono">{p.parcel_id}</span></div>
        </div>
        <div className="flex gap-2">
          <Link to="/investor/inquire/$parcelId" params={{ parcelId: p.parcel_id }} className="rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground">استفسر عن هذه الأرض</Link>
        </div>
      </div>
      <div className="mt-6 rounded-2xl border bg-card p-6">
        <PriceLine p={p} />
        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm md:grid-cols-5">
          <Fact k="سعر المتر" v={p.missingPrice ? "غير مسجل" : `${sar(p.price_per_sqm_sar)} ريال`} />
          <Fact k="المساحة" v={`${sar(p.area_sqm)} م²`} />
          <Fact k="عرض الشارع" v={`${p.street_width_m} م`} />
          <Fact k="في السوق" v={`${p.days_on_market} يومًا`} />
          <Fact k="تاريخ العرض" v={p.listed_date} />
        </dl>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border">
        <ParcelSnapshot parcel={p} size="wide" className="aspect-[21/9] w-full" />
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-semibold">لماذا رُشّحت لك</h2>
          {s.insufficientSample ? (
            <p className="mt-3 text-sm text-muted-foreground">عينة غير كافية: أُغلقت {s.closedDeals} صفقة فقط في شريحة {segLabel}، فلا يُعرض لها وسيط.</p>
          ) : (
            <ul className="mt-4 space-y-4 text-sm">
              <li>
                <div className="font-mono text-2xl text-primary">{pct(ins.priceDeltaPct) ?? "—"}</div>
                <div className="text-muted-foreground">
                  {ins.priceDeltaPct == null ? "لا سعر مسجل للمقارنة." : `سعر المتر ${sar(p.price_per_sqm_sar)} ريال مقابل وسيط ${sar(s.medianPricePerSqm)} ريال من ${s.closedDeals} صفقات مغلقة في الشريحة نفسها.`}
                </div>
              </li>
              <li>
                <div className="font-mono text-2xl text-primary">{p.days_on_market} <span className="text-base text-muted-foreground">مقابل {s.medianClosingDays} يومًا</span></div>
                <div className="text-muted-foreground">أيام العرض مقابل وسيط أيام الإغلاق (×{ins.domMultiplier}). أرض واقفة فوق وسيطها بهذا القدر تعني هامش تفاوض أوسع.</div>
              </li>
            </ul>
          )}
        </section>
        <ParcelHighlights parcel={p} priceDeltaPct={s.insufficientSample ? null : ins.priceDeltaPct} />
      </div>
      {p.land_type === "residential" && <div className="mt-6"><MarketInsightCard insight={buildMarketInsight(p, parcels)} /></div>}

      <h2 className="mt-10 text-lg font-semibold">أراضٍ قريبة</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {nearby.map(({ parcel: n, km }) => (
          <Link key={n.parcel_id} to="/investor/parcels/$parcelId" params={{ parcelId: n.parcel_id }} className="rounded-2xl border bg-card p-4 hover:border-primary">
            <div className="flex justify-between"><span className="font-semibold">{n.district_ar}</span><span className="font-mono text-xs text-muted-foreground">{km} كم</span></div>
            <div className="text-xs text-muted-foreground">{AREA_AR[n.area_of_city]} · {LAND_AR[n.land_type]} · {DEAL_AR[n.listing_type]} · {n.parcel_id}</div>
            <div className="mt-2 text-sm"><PriceLine p={n} /></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
