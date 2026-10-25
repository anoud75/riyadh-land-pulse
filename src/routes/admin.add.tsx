import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { usePortfolio } from "@/context/PortfolioProvider";
import { boundsCheck, previewParcelImpact, RIYADH_RADIUS_KM, totalPrice } from "@/lib/adminEngine";
import { nextId } from "@/lib/portfolioEngine";
import { AREA_AR, AREAS, SNAPSHOT_DATE, type Area, type DealType, type LandType } from "@/data/types";
import { fmt } from "@/components/admin/charts";

export const Route = createFileRoute("/admin/add")({
  head: () => ({
    meta: [
      { title: "أضف أرضاً — لوحة فريق سرج" },
      { name: "description", content: "إضافة أرض جديدة مع حساب السعر تلقائيًا وفحص الموقع ومعاينة أثرها على الطلب." },
      { property: "og:title", content: "أضف أرضاً — لوحة فريق سرج" },
      { property: "og:description", content: "إضافة أرض مع معاينة الأثر." },
    ],
  }),
  component: AddParcel,
});

function AddParcel() {
  const { parcels, inquiries, addParcel } = usePortfolio();
  const id = nextId(parcels.map((p) => p.parcel_id), "SRE");
  const [f, setF] = useState({
    district_ar: "النرجس", district_en: "Al Narjis", area_of_city: "North" as Area, land_type: "commercial" as LandType,
    listing_type: "sale" as DealType, area_sqm: 1500, price_per_sqm_sar: 2400, street_width_m: 30, lat: 24.4102, lng: 46.9931,
  });
  const [saved, setSaved] = useState<string | null>(null);
  const total = totalPrice(f.price_per_sqm_sar, f.area_sqm);
  const geo = boundsCheck(f.lat, f.lng);
  const impact = previewParcelImpact(parcels, inquiries, { ...f, total_price_sar: total });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((s) => ({ ...s, [k]: typeof s[k] === "number" ? Number(e.target.value) : e.target.value }));
  const inp = "mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm";
  const save = () => {
    const p = addParcel({ ...f, parcel_id: id, price_basis: f.listing_type === "sale" ? "total purchase" : "annual lease", total_price_sar: total, status: "available", listed_date: SNAPSHOT_DATE, days_on_market: 0 });
    setSaved(p.parcel_id);
  };
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">أضف أرضاً <span className="font-mono text-lg text-muted-foreground">{id}</span></h1>
      {saved && <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 text-sm">أُضيفت {saved} وظهرت الآن في المحفظة وفي واجهة المستثمر.</div>}
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2">
          <label className="text-sm">الحي<input value={f.district_ar} onChange={set("district_ar")} className={inp} /></label>
          <label className="text-sm">المنطقة<select value={f.area_of_city} onChange={set("area_of_city")} className={inp}>{AREAS.map((a) => <option key={a} value={a}>{AREA_AR[a]}</option>)}</select></label>
          <label className="text-sm">نوع الأرض<select value={f.land_type} onChange={set("land_type")} className={inp}><option value="residential">سكني</option><option value="commercial">تجاري</option></select></label>
          <label className="text-sm">الصفقة<select value={f.listing_type} onChange={set("listing_type")} className={inp}><option value="sale">بيع</option><option value="lease">إيجار</option></select></label>
          <label className="text-sm">المساحة (م²)<input type="number" value={f.area_sqm} onChange={set("area_sqm")} className={inp} /></label>
          <label className="text-sm">سعر المتر (ريال)<input type="number" value={f.price_per_sqm_sar} onChange={set("price_per_sqm_sar")} className={inp} /></label>
          <div className="text-sm sm:col-span-2">السعر الإجمالي (يُحسب تلقائيًا ولا يُعدّل)
            <div className="mt-1 rounded-xl border bg-muted/40 px-3 py-2 font-mono">{fmt(f.price_per_sqm_sar)} × {fmt(f.area_sqm)} = {fmt(total)} ريال</div>
          </div>
          <label className="text-sm">عرض الشارع (م)<input type="number" value={f.street_width_m} onChange={set("street_width_m")} className={inp} /></label>
          <div />
          <label className="text-sm">خط العرض<input type="number" step="0.0001" value={f.lat} onChange={set("lat")} className={inp} /></label>
          <label className="text-sm">خط الطول<input type="number" step="0.0001" value={f.lng} onChange={set("lng")} className={inp} /></label>
          {geo.outOfBounds && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive sm:col-span-2">
              الموقع خارج نطاق الرياض بنحو {geo.beyondKm} كم ({geo.fromCenterKm} كم من المركز، والنطاق {RIYADH_RADIUS_KM} كم). تأكد من الإحداثيات — النرجس يقع شمال الرياض.
            </div>
          )}
          <button onClick={save} disabled={!!saved} className="rounded-full bg-ink px-5 py-2 text-sm text-ink-foreground disabled:opacity-50 sm:col-span-2">{saved ? "أُضيفت" : "احفظ الأرض"}</button>
        </section>
        <aside className="space-y-4 rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">أثر الإضافة قبل الحفظ</h2>
          <div className="text-sm text-muted-foreground">فجوة {AREA_AR[f.area_of_city]} {f.land_type === "commercial" ? "التجاري" : "السكني"}</div>
          <div className="font-mono text-3xl"><span className="text-destructive">{impact.gapBefore}</span> ← <span className="text-primary">{impact.gapAfter}</span></div>
          <div className="text-sm">تطابق <b>{impact.matched.length}</b> من {impact.buyers} مشترين في الشريحة (نفس الصفقة وضمن الميزانية):</div>
          <ul className="space-y-1 text-sm">{impact.matched.map((i) => <li key={i.inquiry_id} className="flex justify-between"><span>{i.investor_name}</span><span className="font-mono text-xs">{i.inquiry_id} · {fmt(i.budget_sar ?? 0)}</span></li>)}</ul>
        </aside>
      </div>
    </div>
  );
}
