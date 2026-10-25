import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChartCard } from "@/components/admin/chartKit";
import { AREA_AR, LAND_AR } from "@/data/types";
import { isAvailable, type GapCell } from "@/lib/portfolioEngine";
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
  const nav = useNavigate();
  const [cell, setCell] = useState<GapCell | null>(gaps.find((g) => g.area === "North" && g.landType === "commercial") ?? null);
  const cellKey = cell ? `${cell.area}|${cell.landType}` : null;
  const cellBuyers = cell ? inquiries.filter((i) => i.area_of_city_wanted === cell.area && i.land_type_wanted === cell.landType && i.status !== "closed") : [];
  const cellParcels = cell ? parcels.filter((p) => isAvailable(p) && p.area_of_city === cell.area && p.land_type === cell.landType) : [];
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
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="أين يزيد الطلب عن المعروض؟"
          howTo="لكل منطقة ونوع أرض: عدد الأراضي المتاحة ناقص عدد الاستفسارات المفتوحة. الأحمر يعني مشترين ينتظرون بلا أرض، والأزرق يعني أراضي أكثر من الطلب. اضغط أي شريط لترى المشترين والأراضي خلفه."
          legend={[{ label: "عجز — نحتاج أراضي", className: "bg-destructive/80", shape: "bar" }, { label: "فائض سكني", className: "bg-chart-blue", shape: "bar" }, { label: "فائض تجاري", className: "bg-primary", shape: "bar" }]}
          source="المحفظة والاستفسارات · لقطة 11 أغسطس 2026"
        >
          <GapDiverging gaps={gaps} selected={cellKey} onPick={setCell} />
          {cell && (
            <div className="mt-5 rounded-2xl border bg-background p-4 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <b>{AREA_AR[cell.area]} · {LAND_AR[cell.landType]}</b>
                <span className="text-muted-foreground">{cell.availableParcels} أرض متاحة · {cell.openInquiries} استفسار مفتوح</span>
              </div>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">المشترون المنتظرون</div>
                  {cellBuyers.length ? <ul className="space-y-1">{cellBuyers.slice(0, 6).map((i) => <li key={i.inquiry_id} className="flex justify-between gap-2"><span className="truncate">{i.investor_name}</span><span className="font-mono text-xs text-muted-foreground">{i.budget_sar ? M(i.budget_sar) : "بلا ميزانية"}</span></li>)}</ul> : <p className="text-muted-foreground">لا يوجد مشترون مفتوحون.</p>}
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">الأراضي المتاحة</div>
                  {cellParcels.length ? <ul className="space-y-1">{cellParcels.slice(0, 6).map((p) => <li key={p.parcel_id}><Link to="/admin/portfolio" search={{ focus: p.parcel_id }} className="flex justify-between gap-2 hover:text-primary"><span className="truncate">{p.district_ar}</span><span className="font-mono text-xs">{p.parcel_id}</span></Link></li>)}</ul> : <p className="text-destructive">لا توجد أرض واحدة متاحة هنا.</p>}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {cellParcels.length === 0 ? <Link to="/admin/add" className="rounded-full bg-ink px-4 py-1.5 text-xs text-ink-foreground">أضف أرضًا لهذه الشريحة</Link> : <Link to="/admin/offer" className="rounded-full bg-ink px-4 py-1.5 text-xs text-ink-foreground">اعرض أرضًا على مشترٍ</Link>}
                <Link to="/admin/inquiries" className="rounded-full border px-4 py-1.5 text-xs">كل الاستفسارات</Link>
              </div>
            </div>
          )}
        </ChartCard>
        <ChartCard
          title="الأراضي الأطول بقاءً في السوق"
          howTo={`أكثر عشر أراضٍ متاحة تأخّر بيعها. الخط الأسود هو المدة المعتادة للإغلاق (${st.median} يومًا)، والأحمر لما تجاوز ضعفها. اضغط أي أرض لتفتحها في المحفظة.`}
          legend={[{ label: "ضمن ضعف المعتاد", className: "bg-primary/70", shape: "bar" }, { label: "أكثر من ضعف المعتاد", className: "bg-destructive/80", shape: "bar" }, { label: `المعتاد ${st.median} يومًا`, className: "bg-foreground", shape: "line" }]}
          source="الأراضي المتاحة · الوسيط من الصفقات المغلقة"
        >
          <StagnantBars rows={st.rows} median={st.median} onPick={(id) => nav({ to: "/admin/portfolio", search: { focus: id } })} />
        </ChartCard>
      </div>
    </div>
  );
}
