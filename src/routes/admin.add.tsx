import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { lazyWithReload } from "@/lib/lazyWithReload";
import { Check, Copy, MapPin, Send } from "lucide-react";
import { usePortfolio } from "@/context/PortfolioProvider";
import { boundsCheck, nearestDistrict, previewParcelImpact, RIYADH_RADIUS_KM, totalPrice } from "@/lib/adminEngine";
import { nextId } from "@/lib/portfolioEngine";
import { AREA_AR, AREAS, LAND_AR, DEAL_AR, SNAPSHOT_DATE, type Area, type DealType, type LandType } from "@/data/types";
import { fmt } from "@/components/admin/charts";

const PinMap = lazyWithReload(() => import("@/components/admin/PinMap"));

export const Route = createFileRoute("/admin/add")({
  head: () => ({
    meta: [
      { title: "أضف أرضاً — لوحة فريق سرج" },
      { name: "description", content: "أضف أرضًا خطوة بخطوة: البيانات، ثم الموقع بدبوس على الخريطة أو بطلب من المالك، ثم المراجعة." },
      { property: "og:title", content: "أضف أرضاً — لوحة فريق سرج" },
      { property: "og:description", content: "إضافة أرض بدبوس على الخريطة مع معاينة الأثر." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "stylesheet", href: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" }],
  }),
  component: AddParcel,
});

const STEPS = ["بيانات الأرض", "الموقع", "المراجعة والحفظ"] as const;

function AddParcel() {
  const { parcels, inquiries, addParcel, requestLocation, locationRequests } = usePortfolio();
  const id = nextId([...parcels.map((p) => p.parcel_id), ...locationRequests.map((r) => r.parcel_id)], "SRE");
  const [step, setStep] = useState(0);
  const [f, setF] = useState({
    district_ar: "النرجس", district_en: "Al Narjis", area_of_city: "North" as Area, land_type: "commercial" as LandType,
    listing_type: "sale" as DealType, area_sqm: 1500, price_per_sqm_sar: 2400, street_width_m: 30, lat: 24.4102, lng: 46.9931,
  });
  const [saved, setSaved] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const total = totalPrice(f.price_per_sqm_sar, f.area_sqm);
  const geo = boundsCheck(f.lat, f.lng);
  const near = nearestDistrict(parcels, f.lat, f.lng);
  const impact = previewParcelImpact(parcels, inquiries, { ...f, total_price_sar: total });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((s) => ({ ...s, [k]: typeof s[k] === "number" ? Number(e.target.value) : e.target.value }));
  const inp = "mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm";
  const draft = { ...f, price_basis: f.listing_type === "sale" ? "total purchase" : "annual lease", total_price_sar: total, status: "available" as const, listed_date: SNAPSHOT_DATE, days_on_market: 0 };
  const save = () => setSaved(addParcel({ ...draft, parcel_id: id }).parcel_id);
  const ask = () => {
    const { lat: _a, lng: _b, ...rest } = draft;
    const token = requestLocation(id, rest);
    setLink(`${window.location.origin}/locate/${token}`);
  };
  const dataOk = f.district_ar.trim() && f.area_sqm > 0 && f.price_per_sqm_sar > 0 && f.street_width_m > 0;

  if (saved) return (
    <div className="mx-auto max-w-xl space-y-4 rounded-2xl border bg-card p-8 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="size-6" /></span>
      <h1 className="text-2xl font-bold">أُضيفت {saved} إلى المحفظة</h1>
      <p className="text-sm text-muted-foreground">تظهر الآن للفريق وللمستثمرين، وتدخل في المطابقة مباشرة.</p>
      <div className="flex justify-center gap-2"><Link to="/admin/portfolio" search={{ focus: saved }} className="rounded-full bg-ink px-5 py-2 text-sm text-ink-foreground">افتحها في المحفظة</Link><Link to="/admin/offer" className="rounded-full border px-5 py-2 text-sm">اعرضها على مشترٍ</Link></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-bold">أضف أرضاً <span className="font-mono text-lg text-muted-foreground">{id}</span></h1>
        <ol className="flex items-center gap-2 text-sm">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <button onClick={() => (i <= step || dataOk) && setStep(i)} className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${i === step ? "bg-ink text-ink-foreground" : i < step ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"}`}>
                <span className="font-mono">{i < step ? "✓" : i + 1}</span>{s}
              </button>
              {i < STEPS.length - 1 && <span className="text-muted-foreground">←</span>}
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="rounded-2xl border bg-card p-5">
          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">الحي<input value={f.district_ar} onChange={set("district_ar")} className={inp} /></label>
              <label className="text-sm">المنطقة<select value={f.area_of_city} onChange={set("area_of_city")} className={inp}>{AREAS.map((a) => <option key={a} value={a}>{AREA_AR[a]}</option>)}</select></label>
              <label className="text-sm">نوع الأرض<select value={f.land_type} onChange={set("land_type")} className={inp}><option value="residential">سكني</option><option value="commercial">تجاري</option></select></label>
              <label className="text-sm">نوع الصفقة<select value={f.listing_type} onChange={set("listing_type")} className={inp}><option value="sale">بيع</option><option value="lease">إيجار سنوي</option></select></label>
              <label className="text-sm">المساحة (م²)<input type="number" min={1} value={f.area_sqm} onChange={set("area_sqm")} className={inp} /></label>
              <label className="text-sm">سعر المتر (ريال)<input type="number" min={1} value={f.price_per_sqm_sar} onChange={set("price_per_sqm_sar")} className={inp} /></label>
              <label className="text-sm">عرض الشارع (م)<input type="number" min={1} value={f.street_width_m} onChange={set("street_width_m")} className={inp} /></label>
              <div className="text-sm">السعر الإجمالي <span className="text-xs text-muted-foreground">(يُحسب تلقائيًا)</span>
                <div className="mt-1 rounded-xl border bg-muted/40 px-3 py-2 font-mono">{fmt(f.price_per_sqm_sar)} × {fmt(f.area_sqm)} = <b>{fmt(total)}</b> ريال</div>
              </div>
              <div className="flex justify-end sm:col-span-2"><button disabled={!dataOk} onClick={() => setStep(1)} className="rounded-full bg-ink px-6 py-2 text-sm text-ink-foreground disabled:opacity-40">التالي: حدّد الموقع</button></div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">اضغط على الخريطة لوضع الدبوس، أو اسحبه لتعديل الموقع. إن لم تعرف الموقع بالضبط، اطلبه من المالك.</p>
              <div className="h-[420px] overflow-hidden rounded-xl border">
                <ClientOnly fallback={<div className="grid h-full place-items-center text-sm text-muted-foreground">يحمّل الخريطة…</div>}>
                  <Suspense fallback={<div className="grid h-full place-items-center text-sm text-muted-foreground">يحمّل الخريطة…</div>}>
                    <PinMap lat={f.lat} lng={f.lng} onChange={(lat, lng) => setF((s) => ({ ...s, lat, lng }))} parcels={parcels} radiusKm={RIYADH_RADIUS_KM} />
                  </Suspense>
                </ClientOnly>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">خط العرض<input type="number" step="0.0001" value={f.lat} onChange={set("lat")} className={inp} /></label>
                <label className="text-sm">خط الطول<input type="number" step="0.0001" value={f.lng} onChange={set("lng")} className={inp} /></label>
              </div>
              {geo.outOfBounds ? (
                <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">الدبوس خارج نطاق الرياض بنحو {geo.beyondKm} كم ({geo.fromCenterKm} كم عن المركز، والنطاق {RIYADH_RADIUS_KM} كم). تأكّد من الموقع قبل الحفظ.</div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border bg-primary/5 p-3 text-sm"><MapPin className="size-4 text-primary" />داخل نطاق الرياض · {geo.fromCenterKm} كم عن المركز</div>
              )}
              {near && (near.district_ar !== f.district_ar || near.area_of_city !== f.area_of_city) && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm">
                  <span>أقرب حي للدبوس: <b>{near.district_ar}</b> ({AREA_AR[near.area_of_city]}) على بُعد {near.km} كم. أدخلتَ «{f.district_ar}».</span>
                  <button onClick={() => setF((s) => ({ ...s, district_ar: near.district_ar, district_en: near.district_en, area_of_city: near.area_of_city }))} className="rounded-full border px-3 py-1 text-xs hover:bg-secondary">استخدم {near.district_ar}</button>
                </div>
              )}
              <div className="rounded-xl border border-dashed p-4 text-sm">
                <div className="font-medium">لا تعرف الموقع؟ اطلبه من المالك</div>
                <p className="mt-1 text-xs text-muted-foreground">ننشئ رابطًا ترسله للمالك (واتساب أو رسالة)، فيضع الدبوس بنفسه، وتُضاف الأرض تلقائيًا بعدها.</p>
                {link ? (
                  <div className="mt-3 flex items-center gap-2"><code className="min-w-0 flex-1 truncate rounded-lg bg-secondary px-3 py-2 text-xs" dir="ltr">{link}</code>
                    <button onClick={() => { void navigator.clipboard.writeText(link); setCopied(true); }} className="flex items-center gap-1 rounded-lg border px-3 py-2 text-xs">{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? "نُسخ" : "انسخ"}</button>
                    <a href={`https://wa.me/?text=${encodeURIComponent(`مرحبًا، نرجو تحديد موقع أرضكم في ${f.district_ar} على الخريطة: ${link}`)}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-lg bg-ink px-3 py-2 text-xs text-ink-foreground"><Send className="size-3.5" />واتساب</a>
                  </div>
                ) : <button onClick={ask} className="mt-3 rounded-full border px-4 py-1.5 text-xs hover:bg-secondary">أنشئ رابط طلب الموقع</button>}
              </div>
              <div className="flex justify-between"><button onClick={() => setStep(0)} className="rounded-full border px-5 py-2 text-sm">رجوع</button><button onClick={() => setStep(2)} className="rounded-full bg-ink px-6 py-2 text-sm text-ink-foreground">التالي: راجع</button></div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-2xl border p-4">
                <div className="flex items-start justify-between"><div><div className="text-lg font-semibold">{f.district_ar}</div><div className="font-mono text-xs text-muted-foreground">{id} · {LAND_AR[f.land_type]}</div></div><span className="rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground">{DEAL_AR[f.listing_type]}</span></div>
                <div className="mt-3 text-2xl font-bold">{fmt(total)} <span className="text-xs font-normal text-muted-foreground">ريال</span></div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-sm">{[[fmt(f.area_sqm), "م²"], [fmt(f.price_per_sqm_sar), "ريال/م²"], [f.street_width_m, "عرض الشارع"], [AREA_AR[f.area_of_city], "المنطقة"]].map(([v, l]) => <div key={l}><div className="font-mono font-semibold">{v}</div><div className="text-xs text-muted-foreground">{l}</div></div>)}</div>
                <p className="mt-3 text-xs text-muted-foreground">هكذا ستظهر للمستثمرين.</p>
              </div>
              {geo.outOfBounds && <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">تنبيه: الموقع ما زال خارج نطاق الرياض بـ {geo.beyondKm} كم.</div>}
              <div className="flex justify-between"><button onClick={() => setStep(1)} className="rounded-full border px-5 py-2 text-sm">رجوع</button><button onClick={save} className="rounded-full bg-ink px-6 py-2 text-sm text-ink-foreground">احفظ وأضِف إلى المحفظة</button></div>
            </div>
          )}
        </section>

        <aside className="space-y-4 rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">ماذا تغيّر هذه الأرض؟</h2>
          <div className="text-sm text-muted-foreground">الفجوة في {AREA_AR[f.area_of_city]} · {LAND_AR[f.land_type]}</div>
          <div className="font-mono text-3xl"><span className={impact.gapBefore < 0 ? "text-destructive" : ""}>{impact.gapBefore}</span> ← <span className="text-primary">{impact.gapAfter}</span></div>
          <p className="text-xs text-muted-foreground">سالب = مشترون أكثر من الأراضي.</p>
          <div className="text-sm">تناسب <b>{impact.matched.length}</b> من {impact.buyers} مشترين في الشريحة (نفس الصفقة وضمن الميزانية):</div>
          <ul className="space-y-1 text-sm">{impact.matched.map((i) => <li key={i.inquiry_id} className="flex justify-between"><span>{i.investor_name}</span><span className="font-mono text-xs">{fmt(i.budget_sar ?? 0)}</span></li>)}</ul>
          {locationRequests.length > 0 && (
            <div className="border-t pt-3 text-sm">
              <div className="mb-1 text-xs text-muted-foreground">بانتظار الموقع من المالك</div>
              {locationRequests.map((r) => <div key={r.token} className="flex justify-between"><span>{r.draft.district_ar} <span className="font-mono text-xs">{r.parcel_id}</span></span><span className={`text-xs ${r.done ? "text-primary" : "text-muted-foreground"}`}>{r.done ? "وصل الموقع" : "بانتظار المالك"}</span></div>)}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
