import { createFileRoute } from "@tanstack/react-router";
import { usePortfolio } from "@/context/PortfolioProvider";
import { getAreaClosing, getConversionFunnel, getPricingReview, getSegmentClosingTime } from "@/lib/adminEngine";
import { ChartCard } from "@/components/admin/chartKit";
import { ClosingRateBars, FunnelSteps, PricingReviewTable, SegmentTimeBars } from "@/components/admin/performanceVisuals";

const fmt = (n: number) => n.toLocaleString("en-US");

export const Route = createFileRoute("/admin/performance")({
  head: () => ({
    meta: [
      { title: "الأداء — لوحة فريق سرج" },
      { name: "description", content: "أين يتوقّف خط الاستفسارات، ونسبة الإغلاق وسرعته بالمنطقة، وقائمة مراجعة التسعير." },
      { property: "og:title", content: "الأداء — لوحة فريق سرج" },
      { property: "og:description", content: "قمع الاستفسارات، نسبة الإغلاق جغرافيًا، وسرعة التدوير، والتسعير الذي يحتاج تدخّلًا." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Performance,
});

function Performance() {
  const { parcels, inquiries } = usePortfolio();
  const funnel = getConversionFunnel(inquiries);
  const closing = getAreaClosing(parcels);
  const times = getSegmentClosingTime(parcels);
  const review = getPricingReview(parcels);
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        <ChartCard
          title="أين يتوقّف خط الاستفسارات"
          howTo="كل مرحلة نسبة ممّا قبلها. الفاقد الأكبر عند أوّل اتصال، لا عند التفاوض."
          source={`سجلّ استفسارات سرج — ${inquiries.length} استفسارًا`}
        >
          <FunnelSteps steps={funnel.steps} note={funnel.note} noteStrong={funnel.noteStrong} />
        </ChartCard>
        <ChartCard
          title="مدّة الإغلاق بالشريحة"
          howTo="وسيط الأيام حتى الإغلاق. الشريحة التي أُغلقت فيها أقل من ثلاث صفقات لا يُبنى عليها حكم."
          legend={[{ label: "عيّنة كافية — 3 صفقات فأكثر", className: "bg-primary" }, { label: "عيّنة غير كافية", className: "bg-primary/30" }]}
          source="القيم الوسيطة من الصفقات المغلقة في سجلّ سرج"
        >
          <SegmentTimeBars rows={times.rows} note={times.note} />
        </ChartCard>
      </div>
      <div className="min-w-0 space-y-4">
        <ChartCard
          title="نسبة الإغلاق بالمنطقة"
          howTo="الشريط نسبة ما أُغلق من أرضنا في كل منطقة، وإلى جانبه عدد الصفقات ووسيط أيامها."
          aside={<span className="shrink-0 text-xs text-muted-foreground">المغلق من إجمالي ما نملك</span>}
          source={`سجلّ سرج — ${parcels.length} أرضًا`}
        >
          <ClosingRateBars rows={closing.rows} note={closing.note} />
        </ChartCard>
        <ChartCard
          title="قائمة مراجعة التسعير"
          howTo="تدخلها الأرض حين يجتمع شرطان: سعر مترها فوق وسيط منطقتها لنفس النوع والصفقة، ومُدّتها تجاوزت وسيط الإغلاق في شريحتها."
          aside={<span className="shrink-0 text-xs text-muted-foreground">{review.count} أراضٍ · {fmt(review.totalValue)} ريال</span>}
          source="سجلّ سرج — الأراضي المتاحة فقط، ومقارنتها بوسيط شريحتها"
        >
          <PricingReviewTable rows={review.rows} note={review.note} />
        </ChartCard>
      </div>
    </div>
  );
}
