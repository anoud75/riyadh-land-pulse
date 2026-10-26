import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpLeft, Clock3, Inbox, Landmark, Wallet, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChartCard } from "@/components/admin/chartKit";
import { AREA_AR, LAND_AR } from "@/data/types";
import { isAvailable, type GapCell } from "@/lib/portfolioEngine";
import { usePortfolio } from "@/context/PortfolioProvider";
import { getActionCards, getKpis } from "@/lib/adminEngine";
import { getSupplyDemandGaps } from "@/lib/portfolioEngine";
import { TodaySmartVisuals } from "@/components/admin/TodaySmartVisuals";
import { GapDiverging, fmt } from "@/components/admin/charts";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "اليوم — لوحة فريق سرج" },
      { name: "description", content: "أولويات اليوم مرتبة بالإيراد: فجوات الطلب، الأراضي الراكدة والاستفسارات المطابقة." },
      { property: "og:title", content: "اليوم — لوحة فريق سرج" },
      { property: "og:description", content: "أولويات اليوم مرتبة بالإيراد." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  const card = "flex min-w-0 flex-col rounded-lg border bg-card p-4";
  const [cell, setCell] = useState<GapCell | null>(null);
  const cellKey = cell ? `${cell.area}|${cell.landType}` : null;
  const cellBuyers = cell ? inquiries.filter((i) => i.area_of_city_wanted === cell.area && i.land_type_wanted === cell.landType && i.status !== "closed") : [];
  const cellParcels = cell ? parcels.filter((p) => isAvailable(p) && p.area_of_city === cell.area && p.land_type === cell.landType) : [];
  return (
    <div className="space-y-8">
      <div><div className="mb-1 text-xs font-medium text-muted-foreground">لوحة فريق سرج</div><h1 className="text-3xl font-bold">اليوم</h1><p className="mt-1 text-sm text-muted-foreground">أولويات المتابعة، حركة الطلب، والأراضي التي تحتاج قرارًا.</p></div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className={`${card} bg-ink text-ink-foreground`}>
          <div className="text-xs text-ink-muted">١ · فرصة استحواذ</div>
          <h2 className="mt-1 text-lg font-semibold">أرض تجارية في الشمال مطلوبة</h2>
          <p className="mt-2 text-sm leading-6 text-ink-muted">{a.buyNorth.buyers} مشترين ينتظرون، والمخزون المتاح {a.buyNorth.supply}. أعلى ميزانية {M(a.buyNorth.maxBudget)} ريال.</p>
          <div className="mt-auto pt-4"><Button asChild size="sm" variant="secondary"><Link to="/admin/add">أضف أرضاً <ArrowUpLeft /></Link></Button></div>
        </div>
        <div className={card}>
          <div className="text-xs text-muted-foreground">٢ · رأس مال معطّل</div>
          <h2 className="mt-1 text-lg font-semibold">راجع سعر {a.reprice.length === 1 ? "أرض شمالية" : `${a.reprice.length} أراضٍ شمالية`}</h2>
          <p className="mt-2 text-sm text-muted-foreground">أكثر من 140 يومًا وسعر المتر أعلى من الوسيط بأكثر من 20%:</p>
          <ul className="mt-2 space-y-1 text-sm">{a.reprice.map((r) => <li key={r.id}>{r.district} <span className="font-mono text-xs">{r.id}</span> · {r.days} يومًا · +{r.delta}%</li>)}</ul>
          <div className="mt-auto pt-4"><Button asChild variant="outline" size="sm"><Link to="/admin/portfolio">راجع التسعير <ArrowUpLeft /></Link></Button></div>
        </div>
        <div className={card}>
          <div className="text-xs text-muted-foreground">٣ · جاهز للإغلاق</div>
          <h2 className="mt-1 text-lg font-semibold">{a.matchToday.count} استفساراً تطابقه أرض اليوم</h2>
          <p className="mt-2 text-sm text-muted-foreground">مجموع ميزانياتهم {M(a.matchToday.totalBudget)} ريال، وكلهم بلا رد.</p>
          <div className="mt-auto pt-4"><Button asChild variant="outline" size="sm"><Link to="/admin/offer">جهّز عرضًا <ArrowUpLeft /></Link></Button></div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: "أراضٍ متاحة", value: fmt(k.available), icon: Landmark },
          { label: "استفسارات بلا رد", value: fmt(k.unanswered), icon: Inbox },
          { label: "أراضٍ راكدة", value: fmt(k.stagnantCount), icon: Clock3 },
          { label: "قيمة الراكد", value: M(k.stagnantValue), icon: Wallet },
          { label: "وسيط الإغلاق", value: `${k.medianClosingDays} يومًا`, icon: Timer },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="min-w-0 bg-card p-4"><div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{label}</span><Icon className="size-4 shrink-0" /></div><div className="mt-2 text-xl font-semibold tabular-nums">{value}</div></div>
        ))}
      </div>
      <TodaySmartVisuals parcels={parcels} inquiries={inquiries} />
      <div className="grid items-start gap-4">
        <ChartCard
          title="أين يزيد الطلب عن المعروض؟"
          howTo="الفارق بين الأراضي المتاحة والاستفسارات المفتوحة، حسب المنطقة ونوع الأرض."
          legend={[{ label: "عجز — نحتاج أراضي", className: "bg-destructive/80", shape: "bar" }, { label: "فائض سكني", className: "bg-chart-blue", shape: "bar" }, { label: "فائض تجاري", className: "bg-primary", shape: "bar" }]}
          source="المحفظة والاستفسارات · لقطة 11 أغسطس 2026"
        >
          <GapDiverging gaps={gaps} selected={cellKey} onPick={setCell} />

        </ChartCard>
      </div>
      {cell && (
            <div className="rounded-lg border-t pt-4 text-sm">
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
    </div>
  );
}
