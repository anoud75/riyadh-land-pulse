import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { usePortfolio } from "@/context/PortfolioProvider";
import { AREAS, AREA_AR, LAND_AR, LAND_TYPES, DEAL_AR, type DealType } from "@/data/types";
import { getSegmentStats } from "@/lib/portfolioEngine";
import { SECTORS } from "@/lib/sectors";

export const Route = createFileRoute("/contextual-model")({
  head: () => ({
    meta: [
      { title: "النموذج السياقي والقطاعات — سرج" },
      { name: "description", content: "كيف يزن نموذج سرج كل معيار بحسب القطاع، ووسائط كل شريحة في الرياض." },
      { property: "og:title", content: "النموذج السياقي — سرج" },
      { property: "og:description", content: "أوزان القطاعات ووسائط الشرائح المحسوبة من الصفقات المغلقة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const { parcels } = usePortfolio();
  const deals: DealType[] = ["sale", "lease"];
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-20">
        <h1 className="text-4xl font-bold">النموذج السياقي للقطاعات</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          الأرض نفسها تكون مناسبة لمستودع وغير مناسبة لمستشفى. يتغيّر وزن كل معيار بحسب ما سيُبنى عليها.
        </p>

        <div id="sectors" className="mt-12 grid gap-5 md:grid-cols-3">
          {SECTORS.map((s) => (
            <div key={s.key} className="rounded-2xl border bg-card p-6">
              <h2 className="text-lg font-semibold">{s.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              <div className="mt-5 text-sm">الوزن الأعلى: <span className="text-primary">{s.weight}</span></div>
              <div className="mt-1 font-mono text-sm">{parcels.filter(s.match).length} أرضًا مطابقة</div>
            </div>
          ))}
        </div>

        <h2 className="mt-20 text-2xl font-bold">وسائط الشرائح</h2>
        <p className="mt-2 text-sm text-muted-foreground">محسوبة من الصفقات المغلقة وحدها. الشريحة بأقل من ثلاث صفقات تظهر «عينة غير كافية».</p>
        <div className="mt-6 overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-muted-foreground">
              <tr>
                {["الشريحة", "صفقات مغلقة", "وسيط سعر المتر", "وسيط أيام الإغلاق", "تنازل السعر"].map((h) => (
                  <th key={h} className="px-4 py-3 text-right font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AREAS.flatMap((a) =>
                LAND_TYPES.flatMap((l) =>
                  deals.map((d) => {
                    const s = getSegmentStats(parcels, a, l, d);
                    return (
                      <tr key={`${a}${l}${d}`} className="border-t">
                        <td className="px-4 py-3">{AREA_AR[a]} · {LAND_AR[l]} · {DEAL_AR[d]}</td>
                        <td className="px-4 py-3 font-mono">{s.closedDeals}</td>
                        {s.insufficientSample ? (
                          <td colSpan={3} className="px-4 py-3 text-muted-foreground">عينة غير كافية</td>
                        ) : (
                          <>
                            <td className="px-4 py-3 font-mono">{s.medianPricePerSqm?.toLocaleString("en-US")} ريال</td>
                            <td className="px-4 py-3 font-mono">{s.medianClosingDays} يومًا</td>
                            <td className="px-4 py-3 font-mono">{s.priceConcessionPct == null ? "—" : `${s.priceConcessionPct}%`}</td>
                          </>
                        )}
                      </tr>
                    );
                  }),
                ),
              )}
            </tbody>
          </table>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
