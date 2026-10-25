import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { usePortfolio } from "@/context/PortfolioProvider";
import { getHeadline, getSegmentStats, MIN_SAMPLE } from "@/lib/portfolioEngine";
import { SECTORS, getStagnant } from "@/lib/sectors";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "سرج العقارية — تحويل القرارات العقارية إلى نتائج قابلة للقياس" },
      { name: "description", content: "سرج تقرأ محفظة الأراضي وطلب السوق في نموذج واحد في الرياض." },
      { property: "og:title", content: "سرج العقارية" },
      { property: "og:description", content: "محفظة الأراضي وطلب السوق في نموذج واحد." },
    ],
  }),
  component: Home,
});

const fmt = (n: number | null) => (n == null ? "—" : n.toLocaleString("en-US"));

function Home() {
  const { parcels, inquiries } = usePortfolio();
  const h = getHeadline(parcels, inquiries);
  const stagnant = getStagnant(parcels);
  const eastCom = getSegmentStats(parcels, "East", "commercial", "sale");
  const northRes = getSegmentStats(parcels, "North", "residential", "sale");
  const unanswered = Math.round((inquiries.filter((i) => i.status === "new").length / inquiries.length) * 100);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="grid-bg relative overflow-hidden bg-ink text-ink-foreground">
        <div className="pointer-events-none absolute -left-40 -top-40 size-[640px] rounded-full border border-primary/30" />
        <div className="relative mx-auto max-w-6xl px-6 pt-28">
          <h1 className="max-w-2xl text-4xl font-bold leading-tight md:text-5xl">
            تحويل القرارات العقارية إلى نتائج استثمارية قابلة للقياس.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
            تقرأ سرج محفظة الأراضي وطلب السوق في نموذج واحد، فتعرف لماذا تقف أرض ولماذا تُباع أخرى، وأي مشترٍ ينتظر ما لا تملكه بعد.
          </p>
          <div className="mt-10 flex gap-3">
            <Link to="/who" className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90">ادخل إلى المنصة</Link>
            <Link to="/who" className="rounded-full border border-ink-muted/40 px-6 py-3 text-sm hover:bg-ink-line">اعرض لوحة الفريق</Link>
          </div>
          <div className="mt-24 grid grid-cols-2 border-t border-ink-line md:grid-cols-4">
            {[
              [h.parcels, `أرضًا في ${h.districts} حيًّا`],
              [h.inquiries, "استفسارًا مرتبطًا بها"],
              [h.closed, "صفقة مغلقة في 2026"],
              [h.medianClosingDays, "يومًا وسيط الإغلاق", true],
            ].map(([v, l, hi], i) => (
              <div key={i} className="border-ink-line py-8 md:border-l md:px-8 md:first:pr-0 md:last:border-l-0">
                <div className={`font-mono text-4xl font-semibold ${hi ? "text-primary-soft" : ""}`}>{fmt(v as number)}</div>
                <div className="mt-2 text-sm text-ink-muted">{l as string}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="text-3xl font-bold">النموذج السياقي للمحفظة: الحلقة المفقودة في الاستثمار العقاري</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
          تعرف كل منصّة مساحة الأرض وسعرها، ولا تعرف من يصل إليها. يحسب النموذج السياقي ما يقع داخل نطاق وصول الأرض على شبكة الطرق — سكّانًا ومنشآت منافسة وزمن وصول — ويضع ذلك بجوار سعرها.
        </p>
        <div className="mt-12 grid gap-8 md:grid-cols-[1.4fr_1fr]">
          <ReachDiagram />
          <div className="divide-y border-y">
            {[
              ["340,941", "نسمة داخل النطاق التقديري · 15 دقيقة"],
              ["2", "منشأة منافسة داخل النطاق نفسه"],
              ["14", "دقيقة إلى الطريق الدائري الشمالي"],
              ["86 / 100", "درجة الملاءمة لمنشأة صحية"],
            ].map(([v, l]) => (
              <div key={l} className="py-6">
                <div className="font-mono text-3xl font-semibold">{v}</div>
                <div className="mt-1 text-sm text-muted-foreground">{l}</div>
              </div>
            ))}
            <p className="py-4 text-xs text-muted-foreground">مثال توضيحي. الاستخدام النظامي وحدود القطعة يُتحقَّق منهما لدى الجهة المختصة.</p>
          </div>
        </div>
      </section>

      <section className="border-t bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="text-3xl font-bold">يختلف معنى «الأرض المناسبة» باختلاف ما تُبنى عليه</h2>
          <p className="mt-3 text-muted-foreground">لذلك يتغيّر وزن كل معيار بحسب القطاع، لا بحسب تفضيل عام.</p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {SECTORS.map((s) => (
              <div key={s.key} className="flex flex-col rounded-2xl border bg-card p-6">
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                <dl className="mt-6 space-y-1 border-t pt-4 text-sm">
                  <div className="flex justify-between"><dt className="text-muted-foreground">الوزن الأعلى</dt><dd>{s.weight}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">أراضٍ مطابقة</dt><dd className="font-mono">{parcels.filter(s.match).length} من {parcels.length}</dd></div>
                </dl>
                <Link to="/contextual-model" className="mt-4 text-sm text-primary hover:underline">اعرض تحليل الشرائح</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="text-3xl font-bold">ما الذي يصير قابلًا للقياس</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">أربعة أرقام لم تكن تُحسب قبل ربط المحفظة بالطلب، تُحسب مباشرة من السجل.</p>
        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border bg-border md:grid-cols-4">
          {[
            [`${(stagnant.total / 1e6).toFixed(1)}M`, `ريالًا معطّلة في ${stagnant.count} أرضًا تجاوزت وسيط شريحتها`],
            [String(h.unmetSegments), "شرائح يطلبها السوق ولا تملك المحفظة فيها شيئًا"],
            [fmt(eastCom.medianClosingDays), `يومًا تبيع الشريحة التجارية الشرقية، مقابل ${fmt(northRes.medianClosingDays)} في الشمال السكني`],
            [`${unanswered}%`, "من الاستفسارات لم تحصل على أول رد بعد"],
          ].map(([v, l]) => (
            <div key={l} className="bg-card p-6">
              <div className="font-mono text-3xl font-semibold text-primary">{v}</div>
              <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-24 md:grid-cols-[1fr_1.5fr]">
          <div>
            <h2 className="text-3xl font-bold">حدود التحليل، مكتوبة</h2>
            <p className="mt-3 text-muted-foreground">لا تُخفي المنصة ما لا تعرفه، ولا تملأ الفراغ بتقدير يبدو رقمًا.</p>
          </div>
          <ul className="space-y-5 text-sm leading-relaxed">
            <li>الأرض التي لا سعر لها تبقى ظاهرة في البحث، ولا تدخل أي ترتيب بالسعر ولا أي وسيط. لا يُخمَّن سعرها.</li>
            <li>الشريحة التي أُغلقت فيها أقل من {MIN_SAMPLE} صفقات لا يُعرض لها وسيط. الرقم المحسوب من صفقة واحدة يبدو معلومة، وليس كذلك.</li>
            <li>الإحداثيات المقلوبة تُصحَّح تلقائيًا ويُعلَّم عليها، ولا تُخفى.</li>
            <li>نطاق الوصول تقدير على شبكة الطرق في ظروف سير معتادة، ويتغيّر بتغيّر ساعة اليوم.</li>
          </ul>
        </div>
      </section>

      <section className="grid-bg bg-ink text-ink-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-20 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold">اعرض محفظتك، ونُريك أين يقف رأس مالك</h2>
            <p className="mt-3 text-ink-muted">جلسة واحدة على بيانات محفظتك الفعلية، ومخرجها تقرير بالفجوات والأراضي الراكدة.</p>
          </div>
          <Link to="/portfolio-request" className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">تحدّث مع فريقنا</Link>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function ReachDiagram() {
  return (
    <div className="grid-bg relative aspect-[4/3] overflow-hidden rounded-2xl bg-ink text-ink-foreground">
      <svg viewBox="0 0 400 300" className="absolute inset-0 size-full">
        <line x1="0" y1="140" x2="400" y2="60" stroke="currentColor" strokeOpacity=".25" />
        <line x1="320" y1="0" x2="280" y2="300" stroke="currentColor" strokeOpacity=".25" />
        <path d="M200 50 C290 50 320 110 310 170 C300 240 240 260 190 255 C120 250 90 200 95 150 C100 90 140 50 200 50Z" fill="var(--primary)" fillOpacity=".15" stroke="var(--primary-soft)" strokeOpacity=".4" />
        <path d="M200 85 C260 85 280 130 270 175 C260 215 220 225 190 220 C145 215 125 185 130 150 C135 110 160 85 200 85Z" fill="var(--primary)" fillOpacity=".2" stroke="var(--primary-soft)" strokeOpacity=".5" />
        <path d="M200 120 C235 120 245 145 240 170 C235 195 215 200 198 198 C172 195 160 178 163 160 C166 138 180 120 200 120Z" fill="var(--primary)" fillOpacity=".35" />
        <circle cx="200" cy="160" r="6" fill="var(--primary-soft)" />
        <text x="200" y="185" textAnchor="middle" fontSize="11" fill="currentColor">الملقا</text>
        <circle cx="285" cy="60" r="4" fill="currentColor" />
        <circle cx="110" cy="210" r="4" fill="currentColor" />
      </svg>
      <div className="absolute bottom-4 right-4 flex gap-4 text-xs text-ink-muted">
        <span>5 دقائق</span><span>10 دقائق</span><span>15 دقيقة</span>
      </div>
    </div>
  );
}
