import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/portfolio-request")({
  head: () => ({
    meta: [
      { title: "اعرض محفظتك — سرج العقارية" },
      { name: "description", content: "اطلب جلسة على بيانات محفظتك الفعلية واحصل على تقرير الفجوات والأراضي الراكدة." },
      { property: "og:title", content: "اعرض محفظتك — سرج" },
      { property: "og:description", content: "جلسة واحدة، وتقرير بالفجوات يبقى عندك." },
    ],
  }),
  component: Page,
});

const SIZES = ["أقل من 50 أرضًا", "50 إلى 300", "أكثر من 300", "لا أعرف بعد"];
const field = "w-full rounded-xl border bg-surface px-4 py-3 text-sm outline-none focus:border-primary";

function Page() {
  const [size, setSize] = useState(SIZES[1]);
  const [sent, setSent] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSent(true);
  };
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto grid max-w-6xl gap-16 px-6 py-20 md:grid-cols-[1.3fr_1fr]">
        <section>
          <h1 className="text-4xl font-bold leading-tight">اعرض محفظتك، ونُريك أين يقف رأس مالك.</h1>
          <p className="mt-4 text-muted-foreground">
            جلسة واحدة على بيانات محفظتك الفعلية، لا عرضًا تقديميًا. مخرجها تقرير بالفجوات والأراضي الراكدة، يبقى عندك سواء أكملنا أم لا.
          </p>
          {sent ? (
            <div className="mt-10 rounded-2xl border bg-accent p-8 text-accent-foreground">
              <h2 className="text-xl font-semibold">وصل طلبك.</h2>
              <p className="mt-2 text-sm">سنراسلك خلال يوم عمل لتحديد موعد الجلسة.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-10 space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">الاسم<input required className={field} placeholder="الاسم الأول واسم العائلة" /></label>
                <label className="space-y-2 text-sm">جهة العمل<input className={field} placeholder="اسم الشركة أو الصندوق" /></label>
                <label className="space-y-2 text-sm">البريد<input required type="email" dir="ltr" className={field} placeholder="name@company.com" /></label>
                <label className="space-y-2 text-sm">الجوال<input dir="ltr" className={field} placeholder="05XX XXX XXX" />
                  <span className="block text-xs text-muted-foreground">اختياري. نستخدمه إن تعذّر الوصول بالبريد.</span></label>
              </div>
              <fieldset className="space-y-2 text-sm">
                <legend>حجم المحفظة</legend>
                <div className="flex flex-wrap gap-2">
                  {SIZES.map((s) => (
                    <button type="button" key={s} onClick={() => setSize(s)} aria-pressed={size === s}
                      className={`rounded-full border px-4 py-2 ${size === s ? "border-primary bg-accent text-accent-foreground" : "bg-surface"}`}>
                      {s}
                    </button>
                  ))}
                </div>
                <span className="block text-xs text-muted-foreground">يحدّد هذا طول الجلسة وما نستطيع تحليله فيها.</span>
              </fieldset>
              <label className="block space-y-2 text-sm">ما الذي تريد معرفته عن محفظتك؟
                <textarea rows={4} className={field} placeholder="مثلًا: لدينا أراضٍ واقفة منذ أشهر ولا نعرف إن كانت المشكلة في السعر أم في الحي." />
              </label>
              <p className="text-xs text-muted-foreground">بياناتك تصل فريق سرج وحده، ولا تدخل المنصة ولا تظهر لأي مستثمر.</p>
              <button className="rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground">أرسل الطلب</button>
            </form>
          )}
        </section>
        <aside className="space-y-10">
          <div>
            <h2 className="text-lg font-semibold">ماذا يحدث بعد الإرسال</h2>
            <ol className="mt-5 space-y-5">
              {[
                ["نردّ خلال يوم عمل", "برسالة تحدّد موعدًا، لا بمكالمة مفاجئة."],
                ["تُرسل ملف محفظتك", "جدول فيه الحي والمساحة والسعر ونوع الصفقة يكفي."],
                ["جلسة واحدة، ساعة ونصف", "نعرض فيها محفظتك داخل المنصة، وتخرج بتقرير الفجوات."],
                ["تقرّر بعدها", "التقرير يبقى عندك في الحالتين."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="font-mono text-primary">{i + 1}</span>
                  <div><div className="font-medium">{t}</div><div className="text-sm text-muted-foreground">{d}</div></div>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-2xl border bg-card p-6 text-sm">
            <h3 className="font-semibold">تفضّل التواصل المباشر؟</h3>
            <p className="mt-3 font-mono" dir="ltr">team@sarj.ai</p>
            <p className="font-mono" dir="ltr">+966 11 000 0000</p>
            <p className="mt-3 text-muted-foreground">من الأحد إلى الخميس، 9 صباحًا إلى 5 مساءً.</p>
          </div>
          <p className="text-sm text-muted-foreground">
            إن كنت تبحث عن أرض لا عن المنصة، فالدخول من هنا أسرع: <Link to="/who" className="text-primary underline">تصفّح الأراضي</Link>
          </p>
        </aside>
      </main>
      <SiteFooter />
    </div>
  );
}
