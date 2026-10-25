import { createFileRoute, Link } from "@tanstack/react-router";
import { usePortfolio } from "@/context/PortfolioProvider";
import { getActionCards, getKpis, getStagnantBars } from "@/lib/adminEngine";
import { getSupplyDemandGaps } from "@/lib/portfolioEngine";
import { GapDiverging, StagnantBars, fmt } from "@/components/admin/charts";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "اليوم — لوحة فريق سرج" },
      { name: "description", content: "أولويات اليوم مرتبة بالإيراد: فجوات الطلب، الأراضي الراكدة والاستفسارات المطابقة." },
      { property: "og:title", content: "اليوم — لوحة فريق سرج" },
      { property: "og:description", content: "أولويات اليوم مرتبة بالإيراد." },
    ],
  }),
  component: Today,
});

const M = (n: number) => `${(n / 1e6).toFixed(1)} مليون`;

function Today() {
  const { parcels, inquiries } = usePortfolio();
  const a = getActionCards(parcels, inquiries);
  const k = getKpis(parcels, inquiries);
  const gaps = getSupplyDemandGaps(parcels, inquiries);
  const st = getStagnantBars(parcels);
  const card = "rounded-2xl border bg-card p-5";
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">صباح الخير — هذه أولويات اليوم</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <div className={card}>
          <div className="text-xs text-muted-foreground">١ · أعلى إيراد</div>
          <h2 className="mt-1 text-lg font-semibold">اشترِ تجارياً في الشمال</h2>
          <p className="mt-2 text-sm text-muted-foreground">{a.buyNorth.buyers} مشترين ينتظرون، والمخزون المتاح {a.buyNorth.supply}. أعلى ميزانية {M(a.buyNorth.maxBudget)} ريال.</p>
          <Link to="/admin/add" className="mt-4 inline-block rounded-full bg-ink px-4 py-1.5 text-sm text-ink-foreground">أضف أرضاً</Link>
        </div>
        <div className={card}>
          <div className="text-xs text-muted-foreground">٢ · رأس مال معطّل</div>
          <h2 className="mt-1 text-lg font-semibold">راجع سعر {a.reprice.length === 1 ? "أرض شمالية" : `${a.reprice.length} أراضٍ شمالية`}</h2>
          <p className="mt-2 text-sm text-muted-foreground">أكثر من 140 يومًا وسعر المتر أعلى من الوسيط بأكثر من 20%:</p>
          <ul className="mt-2 space-y-1 text-sm">{a.reprice.map((r) => <li key={r.id}>{r.district} <span className="font-mono text-xs">{r.id}</span> · {r.days} يومًا · +{r.delta}%</li>)}</ul>
          <Link to="/admin/portfolio" className="mt-4 inline-block rounded-full border px-4 py-1.5 text-sm">افتح المحفظة</Link>
        </div>
        <div className={card}>
          <div className="text-xs text-muted-foreground">٣ · جاهز للإغلاق</div>
          <h2 className="mt-1 text-lg font-semibold">{a.matchToday.count} استفساراً تطابقه أرض اليوم</h2>
          <p className="mt-2 text-sm text-muted-foreground">مجموع ميزانياتهم {M(a.matchToday.totalBudget)} ريال، وكلهم بلا رد.</p>
          <Link to="/admin/offer" className="mt-4 inline-block rounded-full border px-4 py-1.5 text-sm">اعرض أرضاً</Link>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          ["أراضٍ متاحة", fmt(k.available)],
          ["استفسارات بلا رد", fmt(k.unanswered)],
          ["أراضٍ راكدة", fmt(k.stagnantCount)],
          ["قيمة الراكد", M(k.stagnantValue)],
          ["وسيط الإغلاق", `${k.medianClosingDays} يومًا`],
        ].map(([l, v]) => (
          <div key={l} className="rounded-2xl border bg-card p-4"><div className="text-xs text-muted-foreground">{l}</div><div className="mt-1 font-mono text-2xl">{v}</div></div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className={card}><h2 className="mb-4 font-semibold">صافي العرض مقابل الطلب</h2><GapDiverging gaps={gaps} /></section>
        <section className={card}><h2 className="mb-4 font-semibold">أطول الأراضي بقاءً في السوق</h2><StagnantBars rows={st.rows} median={st.median} /></section>
      </div>
    </div>
  );
}
