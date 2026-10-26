import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { usePortfolio } from "@/context/PortfolioProvider";
import { getHeadline, getSupplyDemandGaps, MIN_SAMPLE } from "@/lib/portfolioEngine";
import { getStagnant } from "@/lib/sectors";
import { AnimatedList, CountUp, DottedRiyadhMap, KineticHeadline, NoiseOverlay, Reveal } from "@/components/landing/Landing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "سرج — ذكاء مكاني لقرارات الأراضي في الرياض" },
      { name: "description", content: "سرج تربط محفظة الأراضي بطلب السوق وتحوّلها إلى قرارات استثمارية واضحة بالذكاء الاصطناعي." },
      { property: "og:title", content: "سرج — ذكاء مكاني لقرارات الأراضي" },
      { property: "og:description", content: "محفظة الأراضي وطلب السوق في نموذج واحد، بمساعد ذكي للمستثمر والفريق." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

const AREA_AR: Record<string, string> = { North: "الشمال", South: "الجنوب", East: "الشرق", West: "الغرب", Central: "الوسط" };
const TYPE_AR: Record<string, string> = { residential: "السكني", commercial: "التجاري" };

function Home() {
  const { parcels, inquiries } = usePortfolio();
  const h = getHeadline(parcels, inquiries);
  const stagnant = getStagnant(parcels);
  const gaps = getSupplyDemandGaps(parcels, inquiries);
  const shortage = [...gaps].sort((a, b) => a.netGap - b.netGap)[0]!;
  const surplus = [...gaps].sort((a, b) => b.netGap - a.netGap)[0]!;
  const unanswered = inquiries.filter((i) => i.status === "new").length;

  const signals = [
    { title: `${shortage.openInquiries} مشترين ينتظرون أرضًا في ${AREA_AR[shortage.area]} ${TYPE_AR[shortage.landType]}`, meta: `المعروض المتاح: ${shortage.availableParcels} أرض` },
    { title: `${stagnant.count} أرضًا تجاوزت وسيط شريحتها في السوق`, meta: `${(stagnant.total / 1e6).toFixed(1)} مليون ريال قيد المراجعة` },
    { title: `فائض في ${AREA_AR[surplus.area]} ${TYPE_AR[surplus.landType]}`, meta: `${surplus.availableParcels} أرض مقابل ${surplus.openInquiries} طلبات` },
    { title: `${unanswered} استفسارًا بانتظار أول رد`, meta: "يرتّبها المساعد حسب الجاهزية والقيمة" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-ink text-ink-foreground">
        <NoiseOverlay />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 md:grid-cols-[1.15fr_1fr] md:py-32">
          <div>
            <p className="text-xs tracking-[0.2em] text-ink-muted">ذكاء مكاني · الرياض</p>
            <KineticHeadline
              text="قرارات الأراضي، مقروءة قبل أن تُتّخذ."
              className="mt-6 text-4xl font-semibold leading-[1.15] md:text-6xl"
            />
            <Reveal delay={600}>
              <p className="mt-6 max-w-md text-base leading-relaxed text-ink-muted">
                تجمع سرج المحفظة وطلب السوق في نموذج واحد، ومساعد ذكي يشرح لماذا تقف أرض، ومن ينتظر ما لا تملكه بعد.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link to="/who/name" className="inline-flex items-center gap-2 rounded-full bg-ink-foreground px-6 py-3 text-sm font-medium text-ink hover:opacity-90">
                  ادخل كمستثمر <ArrowLeft className="size-4" />
                </Link>
                <Link to="/who" className="rounded-full border border-ink-line px-6 py-3 text-sm hover:bg-ink-foreground/5">ادخل كفريق</Link>
              </div>
            </Reveal>
          </div>
          <Reveal delay={300} className="mx-auto aspect-square w-full max-w-md text-ink-foreground">
            <DottedRiyadhMap parcels={parcels} />
          </Reveal>
        </div>
      </section>

      {/* Numbers */}
      <section className="border-b">
        <div className="mx-auto grid max-w-6xl grid-cols-2 px-6 md:grid-cols-4">
          {[
            [h.parcels, `أرض في ${h.districts} حيًّا`],
            [h.inquiries, "استفسار مرتبط بالمحفظة"],
            [h.closed, "صفقة مغلقة"],
            [h.medianClosingDays, "يومًا وسيط الإغلاق"],
          ].map(([v, l], i) => (
            <Reveal key={i} delay={i * 100} className="border-s py-12 ps-6 first:border-s-0 first:ps-0">
              <div className="font-mono text-4xl font-medium tracking-tight"><CountUp value={v as number} /></div>
              <div className="mt-2 text-sm text-muted-foreground">{l as string}</div>
            </Reveal>
          ))}
        </div>
        <p className="mx-auto max-w-6xl px-6 pb-6 text-xs text-muted-foreground">
          لا يُعرض وسيط لشريحة أقل من {MIN_SAMPLE} صفقات، ولا يُخمَّن سعر أرض بلا سعر.
        </p>
      </section>

      {/* AI */}
      <section className="relative overflow-hidden bg-ink text-ink-foreground">
        <NoiseOverlay />
        <div className="relative mx-auto grid max-w-6xl gap-16 px-6 py-28 md:grid-cols-2">
          <Reveal>
            <p className="text-xs tracking-[0.2em] text-ink-muted">الذكاء الاصطناعي</p>
            <h2 className="mt-5 text-3xl font-semibold leading-snug md:text-4xl">لا يخمّن. يقرأ السجل، ثم يشرح.</h2>
            <p className="mt-5 max-w-md leading-relaxed text-ink-muted">
              كل رقم يقوله المساعد محسوب من بيانات المحفظة، ويُسأل عن الميزانية والمساحة قبل أن يرشّح أرضًا.
            </p>
          </Reveal>
          <AnimatedList items={signals} />
        </div>
      </section>

      {/* Two paths */}
      <section className="mx-auto max-w-6xl px-6 py-28">
        <Reveal>
          <h2 className="text-3xl font-semibold">مساران، أداة لكل منهما</h2>
        </Reveal>
        <div className="mt-12 grid gap-px overflow-hidden rounded-3xl border bg-border md:grid-cols-2">
          {[
            { t: "المستثمر", d: "ابحث عن أرض تناسب مشروعك.", pts: ["خريطة الأراضي والأحياء", "مقارنة بأوزان تحددها أنت", "مستشار مواقع بزمن الوصول والخدمات"], to: "/who/name" as const, cta: "ادخل كمستثمر" },
            { t: "فريق سرج", d: "اقرأ الطلب والمعروض في صفحة واحدة.", pts: ["أولويات اليوم حسب القيمة", "مطابقة المشترين المنتظرين", "أداء الشرائح والتسعير"], to: "/who" as const, cta: "ادخل كفريق" },
          ].map((c, i) => (
            <Reveal key={c.t} delay={i * 150} className="flex h-full flex-col bg-card p-10">
              <h3 className="text-xl font-semibold">{c.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.d}</p>
              <ul className="mt-8 flex-1 space-y-3 text-sm">
                {c.pts.map((p) => (
                  <li key={p} className="flex items-center gap-3"><span className="size-1 rounded-full bg-primary" />{p}</li>
                ))}
              </ul>
              <Link to={c.to} className="mt-10 inline-flex items-center gap-2 text-sm font-medium hover:text-primary">
                {c.cta} <ArrowLeft className="size-4" />
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-20 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-semibold">اعرض محفظتك، ونُريك أين يقف رأس مالك.</h2>
          <Link to="/portfolio-request" className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background hover:opacity-90">تحدّث مع فريقنا</Link>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
