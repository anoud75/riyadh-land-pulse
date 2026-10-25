import { createFileRoute, Link } from "@tanstack/react-router";
import { usePortfolio } from "@/context/PortfolioProvider";
import { AREA_AR, LAND_AR } from "@/data/types";
import { sar, STATUS_AR } from "@/components/investor/format";

export const Route = createFileRoute("/investor/inquiries")({
  head: () => ({
    meta: [
      { title: "استفساراتي — سرج" },
      { name: "description", content: "استفساراتك المرسلة لفريق سرج وحالتها." },
      { property: "og:title", content: "استفساراتي — سرج" },
      { property: "og:description", content: "حالة استفساراتك." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Mine,
});

function Mine() {
  const { myInquiries, parcels } = usePortfolio();
  return (
    <div>
      <h1 className="text-3xl font-bold">استفساراتي</h1>
      <div className="mt-6 space-y-3">
        {myInquiries.map((i) => {
          const p = parcels.find((x) => x.parcel_id === i.parcel_id);
          return (
            <div key={i.inquiry_id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{p ? `أرض ${p.district_ar}` : i.wants_to}</span>
                  <span className="font-mono text-xs text-muted-foreground">{i.sample ? "مثال" : i.inquiry_id}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {AREA_AR[i.area_of_city_wanted]} · {LAND_AR[i.land_type_wanted]} · ميزانية {i.missingBudget ? "غير محددة" : `${sar(i.budget_sar)} ريال`} · {i.date}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-secondary px-3 py-1 text-xs">{STATUS_AR[i.status] ?? i.status}</span>
                {p && <Link to="/investor/parcels/$parcelId" params={{ parcelId: p.parcel_id }} className="text-sm text-primary">الأرض</Link>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
