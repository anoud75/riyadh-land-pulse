import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { usePortfolio } from "@/context/PortfolioProvider";
import { getScatter, STAGNANT_DAYS } from "@/lib/adminEngine";
import { AREA_AR, DEAL_AR, LAND_AR } from "@/data/types";
import { DeltaScatter, fmt } from "@/components/admin/charts";

export const Route = createFileRoute("/admin/portfolio")({
  head: () => ({
    meta: [
      { title: "المحفظة — لوحة فريق سرج" },
      { name: "description", content: "كل أراضي المحفظة مع رسم فرق السعر مقابل أيام العرض وبطاقات البيانات المعزولة." },
      { property: "og:title", content: "المحفظة — لوحة فريق سرج" },
      { property: "og:description", content: "الأراضي، الركود، والبيانات المعزولة." },
    ],
  }),
  component: Portfolio,
});

const STATUS_AR: Record<string, string> = { available: "متاحة", reserved: "محجوزة", sold: "مباعة", leased: "مؤجرة" };
type Key = "parcel_id" | "days_on_market" | "price_per_sqm_sar" | "area_sqm";

function Portfolio() {
  const { parcels } = usePortfolio();
  const sc = getScatter(parcels);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<{ k: Key; dir: 1 | -1 }>({ k: "parcel_id", dir: 1 });
  const rows = useMemo(() => {
    const t = q.trim();
    return parcels
      .filter((p) => (status === "all" || p.status === status) && (!t || p.parcel_id.includes(t.toUpperCase()) || p.district_ar.includes(t)))
      .sort((a, b) => {
        const va = a[sort.k] ?? -Infinity, vb = b[sort.k] ?? -Infinity; // unpriced parcels sort last
        return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
      });
  }, [parcels, q, status, sort]);
  const th = (k: Key, l: string) => (
    <th className="cursor-pointer p-2 text-start" onClick={() => setSort((s) => ({ k, dir: s.k === k ? (-s.dir as 1 | -1) : 1 }))}>{l}{sort.k === k ? (sort.dir === 1 ? " ↑" : " ↓") : ""}</th>
  );
  const q13 = parcels.find((p) => p.missingPrice);
  const q98 = parcels.find((p) => p.coordinatesCorrected);
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">المحفظة <span className="font-mono text-lg text-muted-foreground">{parcels.length}</span></h1>
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="font-semibold">فرق سعر المتر عن الوسيط مقابل أيام العرض</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          المنطقة المظللة: أكثر من {STAGNANT_DAYS} يومًا وسعر فوق الوسيط — <b className="text-destructive">{sc.stagnantCount} أراضٍ</b>. تظهر فقط الأراضي المتاحة المسعّرة في شرائح فيها 3 صفقات مغلقة على الأقل ({sc.points.length}).
        </p>
        <DeltaScatter points={sc.points} stagnantDays={STAGNANT_DAYS} />
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        {q13 && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
            <div className="text-xs text-destructive">معزولة · بلا سعر</div>
            <h3 className="mt-1 font-semibold">{q13.district_ar} {q13.parcel_id}</h3>
            <p className="mt-2 text-sm text-muted-foreground">السعر غير مسجل. تبقى في البحث، لكنها مستبعدة من الترتيب بالسعر والوسطاء والرسم. المطلوب: تسجيل سعر المتر.</p>
          </div>
        )}
        {q98 && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
            <div className="text-xs text-destructive">معزولة · إحداثيات مقلوبة</div>
            <h3 className="mt-1 font-semibold">{q98.district_ar} {q98.parcel_id}</h3>
            <p className="mt-2 text-sm text-muted-foreground">خط العرض والطول كانا مقلوبين وصُحّحا تلقائيًا إلى <span className="font-mono">{q98.lat}, {q98.lng}</span>. المطلوب: تأكيد الموقع من المالك.</p>
          </div>
        )}
      </section>
      <section className="rounded-2xl border bg-card p-5">
        <div className="mb-3 flex flex-wrap gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث برقم الأرض أو الحي" className="rounded-xl border bg-background px-3 py-1.5 text-sm" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border bg-background px-3 py-1.5 text-sm">
            <option value="all">كل الحالات</option>
            {Object.entries(STATUS_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <span className="self-center text-xs text-muted-foreground">{rows.length} أرضًا</span>
        </div>
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card text-xs text-muted-foreground"><tr>{th("parcel_id", "الرقم")}<th className="p-2 text-start">الحي</th><th className="p-2 text-start">الشريحة</th>{th("area_sqm", "المساحة")}{th("price_per_sqm_sar", "سعر المتر")}{th("days_on_market", "الأيام")}<th className="p-2 text-start">الحالة</th></tr></thead>
            <tbody className="divide-y">
              {rows.map((p) => (
                <tr key={p.parcel_id}>
                  <td className="p-2 font-mono text-xs">{p.parcel_id}</td>
                  <td className="p-2">{p.district_ar}</td>
                  <td className="p-2 text-muted-foreground">{AREA_AR[p.area_of_city]} · {LAND_AR[p.land_type]} · {DEAL_AR[p.listing_type]}</td>
                  <td className="p-2 font-mono">{fmt(p.area_sqm)}</td>
                  <td className="p-2 font-mono">{p.missingPrice ? <span className="text-destructive">غير مسجل</span> : fmt(p.price_per_sqm_sar!)}</td>
                  <td className="p-2 font-mono">{p.days_on_market}</td>
                  <td className="p-2">{STATUS_AR[p.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
