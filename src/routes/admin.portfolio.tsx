import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { lazyWithReload } from "@/lib/lazyWithReload";
import { X } from "lucide-react";
import { usePortfolio } from "@/context/PortfolioProvider";
import { getParcelInsight } from "@/lib/investorEngine";
import { mapCommand } from "@/lib/agentViz";
import { AREA_AR, AREAS, DEAL_AR, LAND_AR, type Area, type DealType, type LandType } from "@/data/types";
import { fmt } from "@/components/admin/charts";
import { ChipGroup } from "@/components/admin/chartKit";

const ChatMap = lazyWithReload(() => import("@/components/chat/ChatMap"));

export const Route = createFileRoute("/admin/portfolio")({
  validateSearch: (s: Record<string, unknown>): { focus?: string } => (typeof s['focus'] === "string" && /^SRE-\d+$/.test(s['focus']) ? { focus: s['focus'] } : {}),
  head: () => ({
    meta: [
      { title: "المحفظة — لوحة فريق سرج" },
      { name: "description", content: "أراضي محفظة سرج على الخريطة مع فلاتر المنطقة والنوع وتفاصيل الأراضي والبيانات المعزولة." },
      { property: "og:title", content: "المحفظة — لوحة فريق سرج" },
      { property: "og:description", content: "الأراضي، الركود، والبيانات المعزولة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "stylesheet", href: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" }],
  }),
  component: Portfolio,
});

const STATUS_AR: Record<string, string> = { available: "متاحة", reserved: "محجوزة", sold: "مباعة", leased: "مؤجرة" };
type Key = "parcel_id" | "days_on_market" | "price_per_sqm_sar" | "area_sqm";

function Portfolio() {
  const { parcels, inquiries } = usePortfolio();
  const { focus } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [area, setArea] = useState<Area | "all">("all");
  const [land, setLand] = useState<LandType | "all">("all");
  const [deal, setDeal] = useState<DealType | "all">("all");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<{ k: Key; dir: 1 | -1 }>({ k: "parcel_id", dir: 1 });
  const keep = (p: { area_of_city?: Area; area?: Area; land_type?: LandType; landType?: LandType; listing_type?: DealType; dealType?: DealType }) =>
    (area === "all" || (p.area ?? p.area_of_city) === area) && (land === "all" || (p.landType ?? p.land_type) === land) && (deal === "all" || (p.dealType ?? p.listing_type) === deal);
  const rows = useMemo(() => {
    const t = q.trim();
    return parcels
      .filter((p) => keep(p) && (status === "all" || p.status === status) && (!t || p.parcel_id.includes(t.toUpperCase()) || p.district_ar.includes(t)))
      .sort((a, b) => {
        const va = a[sort.k] ?? -Infinity, vb = b[sort.k] ?? -Infinity;
        return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parcels, q, status, sort, area, land, deal]);
  const pick = (id: string) => navigate({ search: { focus: id }, replace: true, resetScroll: false });
  const rowRef = useRef<HTMLTableRowElement>(null);
  useEffect(() => { rowRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }); }, [focus]);
  const sel = focus ? parcels.find((p) => p.parcel_id === focus) : null;
  const ins = sel ? getParcelInsight(parcels, sel.parcel_id) : null;
  const th = (k: Key, l: string) => (
    <th className="cursor-pointer p-2 text-start" onClick={() => setSort((s) => ({ k, dir: s.k === k ? (-s.dir as 1 | -1) : 1 }))}>{l}{sort.k === k ? (sort.dir === 1 ? " ↑" : " ↓") : ""}</th>
  );
  const q13 = parcels.find((p) => p.missingPrice);
  const q98 = parcels.find((p) => p.coordinatesCorrected);
  const filters = (
    <>
      <ChipGroup value={area} onChange={setArea} options={AREAS.map((a) => [a, AREA_AR[a]])} allLabel="كل المناطق" />
      <ChipGroup value={land} onChange={setLand} options={[["residential", "سكني"], ["commercial", "تجاري"]]} allLabel="كل الأنواع" />
      <ChipGroup value={deal} onChange={setDeal} options={[["sale", "بيع"], ["lease", "إيجار"]]} allLabel="بيع وإيجار" />
    </>
  );
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">المحفظة <span className="font-mono text-lg text-muted-foreground">{parcels.length}</span></h1>
      <section className="space-y-4" aria-label="خريطة المحفظة">
        <h2 className="text-lg font-semibold">خريطة الأراضي</h2>
        <div className="flex flex-wrap gap-2">{filters}</div>
        <div className={`grid gap-4 ${sel ? "lg:grid-cols-[1fr_16rem]" : ""}`}>
            <div className="h-[480px] overflow-hidden rounded-lg border">
              <ClientOnly fallback={<div className="grid h-full place-items-center text-sm text-muted-foreground">يحمّل الخريطة…</div>}>
                <Suspense fallback={<div className="grid h-full place-items-center text-sm text-muted-foreground">يحمّل الخريطة…</div>}>
                  <ChatMap command={mapCommand(rows, focus ? { parcel_ids: [focus] } : {})} parcels={rows} onPick={pick} inquiries={inquiries} />
                </Suspense>
              </ClientOnly>
            </div>
          {sel && <aside className="rounded-lg border bg-background p-4 text-sm">
            {sel ? (
              <>
                <div className="flex items-start justify-between"><div><b className="text-base">{sel.district_ar}</b><div className="font-mono text-xs text-muted-foreground">{sel.parcel_id}</div></div><button aria-label="إلغاء التحديد" onClick={() => navigate({ search: {}, replace: true, resetScroll: false })}><X className="size-4" /></button></div>
                <div className="mt-2 text-muted-foreground">{AREA_AR[sel.area_of_city]} · {LAND_AR[sel.land_type]} · {DEAL_AR[sel.listing_type]}</div>
                <dl className="mt-3 space-y-1.5">
                  <div className="flex justify-between"><dt>السعر</dt><dd className="font-mono">{sel.total_price_sar ? fmt(sel.total_price_sar) : "غير مسجل"}</dd></div>
                  <div className="flex justify-between"><dt>سعر المتر</dt><dd className="font-mono">{sel.price_per_sqm_sar ? fmt(sel.price_per_sqm_sar) : "—"}</dd></div>
                  <div className="flex justify-between"><dt>في السوق منذ</dt><dd className="font-mono">{sel.days_on_market} يومًا</dd></div>
                  <div className="flex justify-between"><dt>عن الوسيط</dt><dd className="font-mono">{ins?.priceDeltaPct != null ? `${ins.priceDeltaPct > 0 ? "+" : ""}${ins.priceDeltaPct}%` : "عينة غير كافية"}</dd></div>
                </dl>
                <Link to="/admin/offer" className="mt-4 block rounded-full bg-ink py-2 text-center text-xs text-ink-foreground">اعرضها على مشترٍ</Link>
              </>
            ) : (
              null
            )}
          </aside>}
        </div>
        <p className="text-xs text-muted-foreground">المصدر: سجلّ سرج · {rows.length} أرضًا حسب التصفية</p>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        {q13 && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
            <div className="text-xs text-destructive">معزولة · بلا سعر</div>
            <h3 className="mt-1 font-semibold">{q13.district_ar} {q13.parcel_id}</h3>
            <p className="mt-2 text-sm text-muted-foreground">لم يُسجَّل لها سعر. تظهر في البحث والخريطة، لكنها لا تدخل في الترتيب بالسعر ولا في الوسطاء. المطلوب: تسجيل سعر المتر.</p>
          </div>
        )}
        {q98 && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
            <div className="text-xs text-destructive">معزولة · إحداثيات مقلوبة</div>
            <h3 className="mt-1 font-semibold">{q98.district_ar} {q98.parcel_id}</h3>
            <p className="mt-2 text-sm text-muted-foreground">كان خطّا العرض والطول مقلوبين، فصحّحناهما تلقائيًا إلى <span className="font-mono">{q98.lat}, {q98.lng}</span>. المطلوب: تأكيد الموقع مع المالك.</p>
          </div>
        )}
      </section>
      <section className="rounded-2xl border bg-card p-5">
        <div className="mb-3 flex flex-wrap gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث برقم الأرض أو اسم الحي" className="rounded-xl border bg-background px-3 py-1.5 text-sm" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border bg-background px-3 py-1.5 text-sm">
            <option value="all">كل الحالات</option>
            {Object.entries(STATUS_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <span className="self-center text-xs text-muted-foreground">{rows.length} أرضًا حسب التصفية أعلاه</span>
        </div>
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full min-w-[660px] text-sm">
            <thead className="sticky top-0 bg-card text-xs text-muted-foreground"><tr>{th("parcel_id", "الرقم")}<th className="p-2 text-start">الحي</th><th className="p-2 text-start">الشريحة</th>{th("area_sqm", "المساحة م²")}{th("price_per_sqm_sar", "سعر المتر")}{th("days_on_market", "أيام العرض")}<th className="p-2 text-start">الحالة</th></tr></thead>
            <tbody className="divide-y">
              {rows.map((p) => {
                const on = p.parcel_id === focus;
                return (
                  <tr key={p.parcel_id} ref={on ? rowRef : undefined} onClick={() => pick(p.parcel_id)} className={`cursor-pointer ${on ? "bg-accent" : "hover:bg-secondary/60"}`}>
                    <td className="p-2 font-mono text-xs">{p.parcel_id}</td>
                    <td className="p-2">{p.district_ar}</td>
                    <td className="p-2 text-muted-foreground">{AREA_AR[p.area_of_city]} · {LAND_AR[p.land_type]} · {DEAL_AR[p.listing_type]}</td>
                    <td className="p-2 font-mono">{fmt(p.area_sqm)}</td>
                    <td className="p-2 font-mono">{p.missingPrice ? <span className="text-destructive">غير مسجل</span> : fmt(p.price_per_sqm_sar ?? 0)}</td>
                    <td className="p-2 font-mono">{p.days_on_market}</td>
                    <td className="p-2">{STATUS_AR[p.status]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
