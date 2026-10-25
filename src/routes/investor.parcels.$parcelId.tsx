import { createFileRoute, Link } from "@tanstack/react-router";
import { usePortfolio } from "@/context/PortfolioProvider";
import { AREA_AR, DEAL_AR, LAND_AR } from "@/data/types";
import { getNearbyParcels, getParcelInsight } from "@/lib/investorEngine";
import { PriceLine } from "@/components/investor/ParcelCard";
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
        <p className="mt-4 leading-8 text-foreground/90">
          أرض {LAND_AR[p.land_type]} {p.listing_type === "sale" ? "للبيع" : "للإيجار"} في حي {p.district_ar} ب{AREA_AR[p.area_of_city]} الرياض،
          مساحتها {sar(p.area_sqm)} م² وتطل على شارع بعرض {p.street_width_m} م
          {p.street_width_m >= 30 ? " (واجهة على شارع رئيسي)" : ""}.
          {p.missingPrice ? " السعر غير مسجل بعد." : ` سعر المتر ${sar(p.price_per_sqm_sar)} ريال.`}
          {" "}معروضة منذ {p.listed_date} ({p.days_on_market} يومًا في السوق).
        </p>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border">
        <ParcelSnapshot parcel={p} size="wide" className="aspect-[21/9] w-full" />
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-semibold">قراءة السوق والتفاوض</h2>
          {s.insufficientSample ? (
            <p className="mt-3 text-sm text-muted-foreground">عينة غير كافية: أُغلقت {s.closedDeals} صفقة فقط في شريحة {segLabel}، فلا يُعرض لها وسيط.</p>
          ) : (
            <ul className="mt-4 space-y-4 text-sm">
              <li>
                <div className="font-mono text-2xl text-primary">{pct(ins.priceDeltaPct) ?? "—"}</div>
                <div className="text-muted-foreground">
                  {ins.priceDeltaPct == null ? "لا سعر مسجل للمقارنة." : `عن وسيط ${sar(s.medianPricePerSqm)} ريال للمتر من ${s.closedDeals} صفقات مغلقة في الشريحة.`}
                </div>
              </li>
              <li>
                <div className="font-mono text-2xl text-primary">×{ins.domMultiplier}</div>
                <div className="text-muted-foreground">
                  مدة العرض مقارنة بوسيط الإغلاق ({s.medianClosingDays} يومًا).
                  {ins.domMultiplier != null && ins.domMultiplier > 1 ? " بقاؤها أطول من المعتاد يعني هامش تفاوض أوسع." : " ما زالت ضمن المدة المعتادة للإغلاق."}
                </div>
              </li>
            </ul>
          )}
        </section>
        <ParcelHighlights parcel={p} />
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
