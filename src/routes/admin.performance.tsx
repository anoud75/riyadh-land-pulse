import { createFileRoute } from "@tanstack/react-router";
import { usePortfolio } from "@/context/PortfolioProvider";
import { getMonthlyClosings, getSegmentVelocity } from "@/lib/adminEngine";
import { MonthBars, VelocityBubbles } from "@/components/admin/charts";

export const Route = createFileRoute("/admin/performance")({
  head: () => ({
    meta: [
      { title: "الأداء — لوحة فريق سرج" },
      { name: "description", content: "الصفقات المغلقة شهريًا وسرعة كل شريحة." },
      { property: "og:title", content: "الأداء — لوحة فريق سرج" },
      { property: "og:description", content: "الصفقات المغلقة وسرعة الشرائح." },
    ],
  }),
  component: Performance,
});

function Performance() {
  const { parcels } = usePortfolio();
  const months = getMonthlyClosings(parcels);
  const total = months.reduce((s, m) => s + m.n, 0);
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">الأداء</h1>
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="font-semibold">الصفقات المغلقة — {total} صفقة</h2>
        <p className="mb-4 text-xs text-muted-foreground">البيانات لا تحتوي تاريخ الإغلاق، لذلك جُمعت الصفقات حسب شهر الإدراج.</p>
        <MonthBars rows={months} />
      </section>
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="font-semibold">سرعة الشرائح</h2>
        <p className="mb-4 text-xs text-muted-foreground">حجم الفقاعة = عدد الصفقات المغلقة. الشرائح بأقل من 3 صفقات لا تُرسم بوسيط.</p>
        <VelocityBubbles segs={getSegmentVelocity(parcels)} />
      </section>
    </div>
  );
}
