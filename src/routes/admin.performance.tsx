import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { usePortfolio } from "@/context/PortfolioProvider";
import { getMonthlyClosings, getSegmentVelocity } from "@/lib/adminEngine";
import { isClosed, type SegmentStats } from "@/lib/portfolioEngine";
import { MonthBars, VelocityBubbles, fmt, segKey, segLabel } from "@/components/admin/charts";
import { ChartCard, ChipGroup } from "@/components/admin/chartKit";
import { AREA_AR, AREAS, type Area } from "@/data/types";

export const Route = createFileRoute("/admin/performance")({
  head: () => ({
    meta: [
      { title: "الأداء — لوحة فريق سرج" },
      { name: "description", content: "الصفقات المغلقة شهريًا، وأي الشرائح تُباع أسرع وبأي سعر." },
      { property: "og:title", content: "الأداء — لوحة فريق سرج" },
      { property: "og:description", content: "الصفقات المغلقة وسرعة البيع حسب الشريحة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Performance,
});

function Performance() {
  const { parcels } = usePortfolio();
  const months = getMonthlyClosings(parcels);
  const total = months.reduce((s, m) => s + m.n, 0);
  const [area, setArea] = useState<Area | "all">("all");
  const all = getSegmentVelocity(parcels).filter((s) => area === "all" || s.area === area);
  const [sel, setSel] = useState<SegmentStats | null>(null);
  const thin = all.filter((s) => s.insufficientSample);
  const selParcels = sel ? parcels.filter((p) => p.area_of_city === sel.area && p.land_type === sel.landType && p.listing_type === sel.dealType) : [];
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">الأداء</h1>
      <ChartCard
        title={`الصفقات المغلقة — ${total} صفقة`}
        howTo="عدد الأراضي التي بيعت أو أُجّرت في كل شهر. الخط المتقطع هو متوسط الشهر. مرّر على أي عمود لترى الرقم."
        source="سجلّ سرج · لا يحتوي تاريخ الإغلاق، لذلك جمعنا الصفقات حسب شهر إدراج الأرض"
      >
        <MonthBars rows={months} />
      </ChartCard>
      <ChartCard
        title="سرعة البيع حسب الشريحة"
        howTo="الشريحة = المنطقة + نوع الأرض + نوع الصفقة (مثل: شمال · سكني · بيع). كل فقاعة شريحة: كلما اتجهت يمينًا تأخّر إغلاقها، وكلما ارتفعت غلا سعر مترها، وحجمها والرقم داخلها = عدد الصفقات المغلقة. اضغط فقاعة لترى أراضيها."
        legend={[{ label: "سكني", className: "bg-chart-blue/60" }, { label: "تجاري", className: "bg-primary/60" }, { label: "إيجار (حدّ متقطع)", className: "border-foreground/50", shape: "ring" }]}
        filters={<ChipGroup value={area} onChange={(v) => { setArea(v); setSel(null); }} options={AREAS.map((a) => [a, AREA_AR[a]])} allLabel="كل المناطق" />}
        source="الوسطاء من الصفقات المغلقة في سجلّ سرج"
      >
        <VelocityBubbles segs={all} selected={sel ? segKey(sel) : null} onPick={setSel} />
        {sel && (
          <div className="mt-4 rounded-2xl border bg-background p-4 text-sm">
            <div className="flex flex-wrap justify-between gap-2"><b>{segLabel(sel)}</b><span className="text-muted-foreground">{sel.closedDeals} صفقات مغلقة · تُغلق خلال {sel.medianClosingDays} يومًا · {fmt(sel.medianPricePerSqm ?? 0)} ريال/م²</span></div>
            <ul className="mt-3 grid gap-1 sm:grid-cols-2">
              {selParcels.map((p) => (
                <li key={p.parcel_id}><Link to="/admin/portfolio" search={{ focus: p.parcel_id }} className="flex justify-between gap-2 rounded-lg px-2 py-1 hover:bg-secondary"><span>{p.district_ar} <span className="font-mono text-xs text-muted-foreground">{p.parcel_id}</span></span><span className="text-xs text-muted-foreground">{isClosed(p) ? "أُغلقت" : "متاحة"} · {p.days_on_market} يومًا</span></Link></li>
              ))}
            </ul>
          </div>
        )}
        {thin.length > 0 && (
          <div className="mt-5 rounded-2xl border border-dashed p-4">
            <div className="text-sm font-medium">شرائح لم تُرسم: أقل من 3 صفقات مغلقة</div>
            <p className="mt-1 text-xs text-muted-foreground">صفقة أو صفقتان لا تكفيان لحساب سعر أو مدة يُعتمد عليها، فلا نعرض لها وسيطًا.</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {thin.map((s) => <span key={segKey(s)} className="rounded-full bg-secondary px-3 py-1">{segLabel(s)} · {s.closedDeals === 1 ? "صفقة واحدة" : "صفقتان"}</span>)}
            </div>
          </div>
        )}
      </ChartCard>
    </div>
  );
}
