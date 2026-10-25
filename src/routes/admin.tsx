import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { usePortfolio } from "@/context/PortfolioProvider";
import { AREA_AR, LAND_AR } from "@/data/types";
import { getHeadline, getSupplyDemandGaps } from "@/lib/portfolioEngine";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "لوحة الفريق — سرج" },
      { name: "description", content: "لوحة فريق سرج: فجوات العرض والطلب عبر مناطق الرياض." },
      { property: "og:title", content: "لوحة الفريق — سرج" },
      { property: "og:description", content: "فجوات العرض والطلب." },
    ],
  }),
  component: Page,
});

function Page() {
  const { parcels, inquiries } = usePortfolio();
  const h = getHeadline(parcels, inquiries);
  const gaps = getSupplyDemandGaps(parcels, inquiries);
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="text-4xl font-bold">المحفظة</h1>
        <p className="mt-3 text-muted-foreground">
          {h.parcels} أرضًا في {h.districts} حيًّا · {h.available} متاحة · {h.reserved} محجوزة · {h.closed} مباعة أو مؤجرة · {h.inquiries} استفسارًا
        </p>
        <h2 className="mt-12 text-xl font-semibold">فجوات العرض والطلب</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-5">
          {gaps.map((g) => (
            <div key={g.area + g.landType} className="rounded-2xl border bg-card p-4">
              <div className="text-sm text-muted-foreground">{AREA_AR[g.area]} · {LAND_AR[g.landType]}</div>
              <div className={`mt-2 font-mono text-2xl ${g.netGap < 0 ? "text-destructive" : "text-primary"}`}>{g.netGap > 0 ? `+${g.netGap}` : g.netGap}</div>
              <div className="text-xs text-muted-foreground">{g.availableParcels} أرض · {g.openInquiries} استفسار</div>
            </div>
          ))}
        </div>
        <h2 className="mt-12 text-xl font-semibold">أحدث الاستفسارات</h2>
        <div className="mt-4 divide-y rounded-2xl border bg-card">
          {[...inquiries].sort((a, b) => b.date.localeCompare(a.date) || b.inquiry_id.localeCompare(a.inquiry_id)).slice(0, 6).map((i) => (
            <div key={i.inquiry_id} className="flex flex-wrap justify-between gap-2 p-4 text-sm">
              <div><span className="font-mono text-muted-foreground">{i.inquiry_id}</span> · {i.investor_name} · {i.wants_to}</div>
              <div className="text-muted-foreground">{AREA_AR[i.area_of_city_wanted]} · {LAND_AR[i.land_type_wanted]} · {i.missingBudget ? "بلا ميزانية" : `${i.budget_sar?.toLocaleString("en-US")} ريال`} · {i.date}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
