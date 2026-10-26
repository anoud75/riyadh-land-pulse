import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Building2, Database, ShieldCheck, Sparkles, Stethoscope, Warehouse } from "lucide-react";
import { ClientOnly } from "@tanstack/react-router";
import { Suspense } from "react";
import { lazyWithReload } from "@/lib/lazyWithReload";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { usePortfolio } from "@/context/PortfolioProvider";
import { getHeadline, getSegmentStats, MIN_SAMPLE } from "@/lib/portfolioEngine";
import { SECTORS, getStagnant } from "@/lib/sectors";
import { CountUp, KineticHeadline, NoiseOverlay, Reveal } from "@/components/landing/Landing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "سرج — تحويل القرارات العقارية إلى نتائج قابلة للقياس" },
      { name: "description", content: "سرج تقرأ محفظة الأراضي وطلب السوق في نموذج واحد، وتضع نطاق الوصول بجوار السعر." },
      { property: "og:title", content: "سرج — النموذج السياقي للمحفظة" },
      { property: "og:description", content: "محفظة الأراضي وطلب السوق في نموذج واحد في الرياض." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

const MalqaMap = lazyWithReload(() => import("@/components/landing/MalqaMap"));
const ICONS = [Stethoscope, Warehouse, Building2];

function Home() {
  const { parcels, inquiries } = usePortfolio();
  const h = getHeadline(parcels, inquiries);
  const stagnant = getStagnant(parcels);
  const eastCom = getSegmentStats(parcels, "East", "commercial", "sale");
  const northRes = getSegmentStats(parcels, "North", "residential", "sale");
  const unanswered = Math.round((inquiries.filter((i) => i.status === "new").length / inquiries.length) * 100);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="grid-bg relative overflow-hidden bg-ink text-ink-foreground">
        <NoiseOverlay />
        <div className="landing-orbit pointer-events-none absolute -left-48 top-10 size-[620px] rounded-full border border-primary/25" />
        <div className="landing-orbit pointer-events-none absolute -left-24 top-36 size-[380px] rounded-full border border-primary/15" style={{ animationDelay: "-6s" }} />
        <div className="relative mx-auto max-w-6xl px-6 pt-28">
          <KineticHeadline
            text="تحويل القرارات العقارية إلى نتائج استثمارية قابلة للقياس."
            className="max-w-2xl text-4xl font-bold leading-tight md:text-5xl"
          />
          <Reveal delay={700}>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
              تقرأ سرج محفظة الأراضي وطلب السوق في نموذج واحد، فتعرف لماذا تقف أرض ولماذا تُباع أخرى، وأي مشترٍ ينتظر ما لا تملكه بعد.
            </p>
            <div className="mt-10 flex gap-3">
              <Link to="/who" className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:-translate-y-0.5 hover:opacity-90">ادخل إلى المنصة</Link>
              <Link to="/who" className="rounded-full border border-ink-muted/40 px-6 py-3 text-sm transition hover:bg-ink-line">اعرض لوحة الفريق</Link>
            </div>
          </Reveal>
          <div className="mt-24 grid grid-cols-2 border-t border-ink-line md:grid-cols-4">
            {[
              [h.parcels, `أرضًا في ${h.districts} حيًّا`],
              [h.inquiries, "استفسارًا مرتبطًا بها"],
              [h.closed, "صفقة مغلقة في 2026"],
              [h.medianClosingDays, "يومًا وسيط الإغلاق", true],
            ].map(([v, l, hi], i) => (
              <Reveal key={i} delay={900 + i * 120} className="border-ink-line py-8 md:border-l md:px-8 md:first:pr-0 md:last:border-l-0">
                <div className={`font-mono text-4xl font-semibold ${hi ? "text-primary-soft" : ""}`}><CountUp value={v as number} /></div>
                <div className="mt-2 text-sm text-ink-muted">{l as string}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Contextual model */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <Reveal>
          <h2 className="text-3xl font-bold">النموذج السياقي للمحفظة: الحلقة المفقودة في الاستثمار العقاري</h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
            تعرف كل منصّة مساحة الأرض وسعرها، ولا تعرف من يصل إليها. يحسب النموذج السياقي ما يقع داخل نطاق وصول الأرض على شبكة الطرق — سكّانًا ومنشآت منافسة وزمن وصول — ويضع ذلك بجوار سعرها.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-8 md:grid-cols-[1.4fr_1fr]">
          <Reveal>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-ink">
              <ReachDiagram />
              <ClientOnly fallback={null}>
                <Suspense fallback={null}><MalqaMap parcels={parcels} /></Suspense>
              </ClientOnly>
              <div className="pointer-events-none absolute right-4 top-4 rounded-full bg-ink/80 px-3 py-1 text-xs text-ink-foreground backdrop-blur">الملقا · شمال الرياض</div>
              <div className="pointer-events-none absolute bottom-4 right-4 flex gap-3 rounded-full bg-ink/80 px-3 py-1 text-xs text-ink-muted backdrop-blur"><span>5 دقائق</span><span>10 دقائق</span><span>15 دقيقة</span></div>
            </div>
          </Reveal>
          <div className="divide-y border-y">
            {[
              [340941, "نسمة داخل النطاق التقديري · 15 دقيقة"],
              [2, "منشأة منافسة داخل النطاق نفسه"],
              [14, "دقيقة إلى الطريق الدائري الشمالي"],
              [86, "درجة الملاءمة لمنشأة صحية", true],
            ].map(([v, l, hi], i) => (
              <Reveal key={l as string} delay={i * 120} className="py-6">
                <div className="font-mono text-3xl font-semibold">
                  <span className={hi ? "text-primary" : ""}><CountUp value={v as number} /></span>
                  {hi && <span className="text-lg text-muted-foreground"> / 100</span>}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{l as string}</div>
              </Reveal>
            ))}
            <p className="py-4 text-xs text-muted-foreground">تقديرات محسوبة من بيانات السكان المفتوحة وشبكة الطرق. الاستخدام النظامي وحدود القطعة يُتحقَّق منهما لدى الجهة المختصة.</p>
          </div>
        </div>
      </section>

      {/* AI + data */}
      <section className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Reveal>
            <h2 className="text-3xl font-bold">الذكاء الاصطناعي فوق بيانات حقيقية</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">المساعد لا يخترع أرقامًا؛ يقرأ من مصادر معروفة، ثم يشرح النتيجة بلغة واضحة.</p>
          </Reveal>
          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border bg-border md:grid-cols-3">
            {[
              [Database, "البيانات", `${parcels.length} أرضًا و${inquiries.length} استفسارًا، مع خرائط الأحياء وتقديرات السكان وأسعار العرض في السوق.`],
              [Sparkles, "التحليل", "يحسب الوسيط والفجوة بين العرض والطلب وزمن الوصول، ويقارن الأراضي بأوزانك أنت."],
              [ShieldCheck, "الثقة", "كل رقم معلَّم بمصدره، وبيانات المشترين لا تظهر للمستثمر."],
            ].map(([Icon, t, d], i) => {
              const I = Icon as typeof Database;
              return (
                <Reveal key={t as string} delay={i * 140} className="bg-card p-7">
                  <I className="size-5 text-primary" />
                  <h3 className="mt-4 font-semibold">{t as string}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d as string}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Sectors */}
      <section className="border-t bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Reveal>
            <h2 className="text-3xl font-bold">يختلف معنى «الأرض المناسبة» باختلاف ما تُبنى عليه</h2>
            <p className="mt-3 text-muted-foreground">لذلك يتغيّر وزن كل معيار بحسب القطاع، لا بحسب تفضيل عام.</p>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {SECTORS.map((s, i) => {
              const Icon = ICONS[i % ICONS.length]!;
              return (
                <Reveal key={s.key} delay={i * 150} className="h-full">
                  <div className="group flex h-full flex-col rounded-2xl border bg-card p-6 transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                    <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground"><Icon className="size-5" /></span>
                    <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                    <dl className="mt-6 space-y-2 border-t pt-4 text-sm">
                      <div className="flex justify-between"><dt className="text-muted-foreground">الوزن الأعلى</dt><dd className="font-medium">{s.weight}</dd></div>
                      <div className="flex justify-between"><dt className="text-muted-foreground">أراضٍ مطابقة</dt><dd className="font-mono">{parcels.filter(s.match).length} من {parcels.length}</dd></div>
                    </dl>
                    <Link to="/contextual-model" className="mt-5 inline-flex items-center gap-1 text-sm text-primary">
                      اعرض تحليل الشرائح <ArrowLeft className="size-3.5 transition group-hover:-translate-x-1" />
                    </Link>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Measurable */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 md:grid-cols-[1fr_1.3fr]">
        <Reveal>
          <h2 className="text-3xl font-bold">ما الذي يصير قابلًا للقياس</h2>
          <p className="mt-3 max-w-md leading-relaxed text-muted-foreground">أربعة أرقام لم تكن تُحسب قبل ربط المحفظة بالطلب. تقرأها إدارة سرج كل صباح، ويتغيّر قرار التسعير والشراء بناءً عليها.</p>
        </Reveal>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border">
          {[
            [<><CountUp value={Number((stagnant.total / 1e6).toFixed(1))} />M</>, `ريالًا معطّلة في ${stagnant.count} أرضًا تجاوزت وسيط شريحتها`],
            [<CountUp value={h.unmetSegments} />, "شرائح يطلبها السوق ولا تملك المحفظة فيها شيئًا"],
            [<CountUp value={eastCom.medianClosingDays} />, `يومًا تبيع الشريحة التجارية الشرقية، مقابل ${northRes.medianClosingDays ?? "—"} في الشمال السكني`],
            [<><CountUp value={unanswered} />%</>, "من الاستفسارات لم تحصل على أول رد بعد"],
          ].map(([v, l], i) => (
            <Reveal key={i} delay={i * 120} className="bg-card p-6 transition hover:bg-surface">
              <div className="font-mono text-3xl font-semibold text-primary">{v}</div>
              <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{l as string}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Limits */}
      <section className="relative overflow-hidden bg-ink text-ink-foreground">
        <NoiseOverlay />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-6 py-24 md:grid-cols-[1fr_1.5fr]">
          <Reveal>
            <h2 className="text-3xl font-bold">حدود التحليل، مكتوبة</h2>
            <p className="mt-3 text-ink-muted">لا تُخفي المنصة ما لا تعرفه، ولا تملأ الفراغ بتقدير يبدو رقمًا.</p>
          </Reveal>
          <ul className="divide-y divide-ink-line border-y border-ink-line text-sm leading-relaxed text-ink-muted">
            {[
              "الأرض التي لا سعر لها تبقى ظاهرة في البحث، ولا تدخل أي ترتيب بالسعر ولا أي وسيط. لا يُخمَّن سعرها.",
              `الشريحة التي أُغلقت فيها أقل من ${MIN_SAMPLE} صفقات لا يُعرض لها وسيط. الرقم المحسوب من صفقة واحدة يبدو معلومة، وليس كذلك.`,
              "الإحداثيات المقلوبة تُصحَّح تلقائيًا ويُعلَّم عليها، ولا تُخفى.",
              "نطاق الوصول تقدير على شبكة الطرق في ظروف سير معتادة، ويتغيّر بتغيّر ساعة اليوم.",
            ].map((t, i) => (
              <Reveal key={i} delay={i * 140} className="py-5">{t}</Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="grid-bg relative overflow-hidden border-t border-ink-line bg-ink text-ink-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-24 md:flex-row md:items-center md:justify-between">
          <Reveal>
            <h2 className="max-w-md text-4xl font-bold leading-tight">اعرض محفظتك، ونُريك أين يقف رأس مالك.</h2>
            <p className="mt-3 max-w-md text-ink-muted">جلسة واحدة على بيانات محفظتك الفعلية، ومخرجها تقرير بالفجوات والأراضي الراكدة.</p>
          </Reveal>
          <Reveal delay={200} className="flex gap-3">
            <Link to="/portfolio-request" className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:-translate-y-0.5">تحدّث مع فريقنا</Link>
            <Link to="/who" className="rounded-full border border-ink-muted/40 px-6 py-3 text-sm transition hover:bg-ink-line">جولة في المنصة</Link>
          </Reveal>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function ReachDiagram() {
  return (
    <div className="grid-bg absolute inset-0 text-ink-foreground">
      <svg viewBox="0 0 400 300" className="absolute inset-0 size-full">
        <line x1="0" y1="140" x2="400" y2="60" stroke="currentColor" strokeOpacity=".2" />
        <line x1="320" y1="0" x2="280" y2="300" stroke="currentColor" strokeOpacity=".2" />
        <g className="landing-ring" style={{ animationDelay: "0.6s" }}>
          <path d="M200 50 C290 50 320 110 310 170 C300 240 240 260 190 255 C120 250 90 200 95 150 C100 90 140 50 200 50Z" fill="var(--primary)" fillOpacity=".14" stroke="var(--primary-soft)" strokeOpacity=".4" />
        </g>
        <g className="landing-ring" style={{ animationDelay: "0.3s" }}>
          <path d="M200 85 C260 85 280 130 270 175 C260 215 220 225 190 220 C145 215 125 185 130 150 C135 110 160 85 200 85Z" fill="var(--primary)" fillOpacity=".2" stroke="var(--primary-soft)" strokeOpacity=".5" />
        </g>
        <g className="landing-ring">
          <path d="M200 120 C235 120 245 145 240 170 C235 195 215 200 198 198 C172 195 160 178 163 160 C166 138 180 120 200 120Z" fill="var(--primary)" fillOpacity=".35" />
        </g>
        <circle cx="200" cy="160" r="14" fill="var(--primary-soft)" className="landing-ping" />
        <circle cx="200" cy="160" r="6" fill="var(--primary-soft)" />
        <text x="200" y="185" textAnchor="middle" fontSize="11" fill="currentColor">الملقا</text>
        <circle cx="285" cy="60" r="4" fill="currentColor" className="landing-pulse" />
        <text x="276" y="64" textAnchor="start" fontSize="9" fill="currentColor" opacity=".7">منافس</text>
        <circle cx="110" cy="210" r="4" fill="currentColor" className="landing-pulse" style={{ animationDelay: "1.5s" }} />
        <text x="101" y="214" textAnchor="start" fontSize="9" fill="currentColor" opacity=".7">منافس</text>
      </svg>
      <div className="absolute bottom-4 right-4 flex gap-4 text-xs text-ink-muted">
        <span>5 دقائق</span><span>10 دقائق</span><span>15 دقيقة</span>
      </div>
    </div>
  );
}
