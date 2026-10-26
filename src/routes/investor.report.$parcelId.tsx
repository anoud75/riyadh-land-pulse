import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { usePortfolio } from "@/context/PortfolioProvider";
import { AREA_AR, DEAL_AR, LAND_AR } from "@/data/types";
import overture from "@/data/overturePlaces.json";
import geoRaw from "@/data/riyadhDistricts.json";
import logo from "@/assets/sarj_logo.png.asset.json";
import { buildLandReport } from "@/lib/landReport";
import { findDistrict, type DistrictCollection } from "@/lib/districtStats";
import { districtPopulation2026 } from "@/lib/districtPopulation";
import { projectPopulationTo2026 } from "@/lib/portfolioEngine";
import { GASTAT_POP } from "@/data/districtSeries";
import type { OpenPlacesFile } from "@/lib/openPlaces";
import { ParcelSnapshot } from "@/components/investor/ParcelSnapshot";
import { sar } from "@/components/investor/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/investor/report/$parcelId")({
  head: ({ params }) => ({
    meta: [
      { title: `تقرير ذكاء الموقع ${params.parcelId} — سرج` },
      { name: "description", content: `تقرير بيانات الأرض ${params.parcelId}: السعر والسكان والخدمات وملاءمة الموقع.` },
      { property: "og:title", content: `تقرير الأرض ${params.parcelId} — سرج` },
      { property: "og:description", content: "الأرض في سياقها، بقرار أوضح." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Report,
});

const STATUS_AR: Record<string, string> = { available: "متاحة", reserved: "محجوزة", sold: "مباعة", leased: "مؤجرة" };
const GEO = geoRaw as unknown as DistrictCollection;

function Report() {
  const { parcelId } = Route.useParams();
  const { parcels } = usePortfolio();
  const r = useMemo(() => {
    const p = parcels.find((x) => x.parcel_id === parcelId);
    let pop: { district: number; riyadh: number } | null = null;
    if (p) {
      const f = findDistrict(GEO, p.district_ar) ?? findDistrict(GEO, p.district_en);
      const d = f ? districtPopulation2026(GEO).find((x) => x.id === f.properties.id) : null;
      if (d) pop = { district: d.population, riyadh: projectPopulationTo2026(GASTAT_POP[2022]!.riyadh) };
    }
    return buildLandReport(parcels, parcelId, overture as unknown as OpenPlacesFile, pop);
  }, [parcels, parcelId]);

  if (!r) return <p>لم نجد هذه الأرض. <Link to="/investor" className="text-primary">عودة إلى الأراضي</Link></p>;
  const p = r.parcel;
  const today = useToday();
  const maxPpm = Math.max(p.price_per_sqm_sar ?? 0, r.segmentMedianPpm ?? 0) * 1.15 || 1;

  return (
    <div className="report-root">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link to="/investor/parcels/$parcelId" params={{ parcelId: p.parcel_id }} className="text-sm text-muted-foreground hover:text-foreground">‹ عودة إلى الأرض</Link>
        <Button onClick={() => window.print()} className="gap-2"><Download className="h-4 w-4" />تحميل التقرير PDF</Button>
      </div>

      <article className="report-page mx-auto max-w-[960px] overflow-hidden rounded-2xl border bg-background">
        <header className="report-header flex items-center justify-between px-10 py-8">
          <div className="flex items-center gap-5">
            <img src={logo.url} alt="سرج" className="h-12 w-auto brightness-0 invert" />
            <span className="h-10 w-px bg-white/25" />
            <div className="text-sm leading-6 text-white/90">تقرير ذكاء<br />الموقع</div>
          </div>
          <div className="text-left text-xs leading-6 text-white/80">
            <div>رمز الأرض <span className="font-mono text-white">{p.parcel_id}</span></div>
            <div>{today}</div>
          </div>
        </header>

        <div className="space-y-5 p-10">
          <div className="border-b pb-5">
            <div className="text-xs text-primary">تقرير الأرض / LAND INTELLIGENCE</div>
            <h1 className="mt-2 text-3xl font-bold">الأرض في سياقها، بقرار أوضح.</h1>
            <p className="mt-2 text-sm text-muted-foreground">حي {p.district_ar}، {AREA_AR[p.area_of_city]} الرياض / قراءة أولية للفرصة والمحيط</p>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {[["العملية", DEAL_AR[p.listing_type]], ["الاستخدام", LAND_AR[p.land_type]], ["الحالة", STATUS_AR[p.status] ?? p.status], ["المنطقة", AREA_AR[p.area_of_city]]].map(([k, v]) => (
              <span key={k} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" />{k} <b className="font-medium">{v}</b></span>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi label="مساحة الأرض" value={sar(p.area_sqm)} unit="م²" note="مساحة القطعة" />
            <Kpi label={p.listing_type === "sale" ? "السعر المطلوب" : "الإيجار المطلوب"} value={p.total_price_sar ? sar(p.total_price_sar) : "—"} unit="ر.س" note="السعر الإجمالي المعلن" />
            <Kpi label="سعر المتر" value={p.price_per_sqm_sar ? sar(p.price_per_sqm_sar) : "—"} unit="ر.س" note={r.priceDeltaPct == null ? "لا وسيط كافٍ للمقارنة" : r.priceDeltaPct < 0 ? "أقل من وسيط الشريحة" : "أعلى من وسيط الشريحة"} />
            <Kpi label="عرض الشارع" value={String(p.street_width_m)} unit="م" note={p.street_width_m >= 30 ? "واجهة على شارع رئيسي" : "واجهة على شارع فرعي"} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card n="01" title="بيانات الأرض وحالتها" badge={STATUS_AR[p.status]}>
              <dl className="grid grid-cols-2 gap-x-6 text-sm">
                {[["الحي / المدينة", `${p.district_ar} / الرياض`], ["رمز الأرض", p.parcel_id], ["الاستخدام", LAND_AR[p.land_type]], ["نوع العملية", DEAL_AR[p.listing_type]], ["تاريخ العرض", p.listed_date], ["أيام في السوق", `${p.days_on_market} يومًا`]].map(([k, v]) => (
                  <div key={k} className="border-b py-2.5"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="mt-1 font-medium">{v}</dd></div>
                ))}
              </dl>
            </Card>
            <Card title="الموقع في لمحة" badge={AREA_AR[p.area_of_city]}>
              <div className="overflow-hidden rounded-xl border"><ParcelSnapshot parcel={p} size="card" className="aspect-[2/1] w-full" /></div>
              <p className="mt-2 text-[11px] text-muted-foreground">{p.lat.toFixed(5)}، {p.lng.toFixed(5)} · خريطة Mapbox</p>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card n="02" title="السكان في الحي" badge="تقدير">
              {r.population ? (
                <>
                  <div className="flex items-baseline gap-3"><span className="text-5xl font-semibold">{sar(r.population.value)}</span><span className="text-sm text-muted-foreground">نسمة · نحو {r.population.shareOfRiyadhPct}% من سكان الرياض</span></div>
                  <div className="mt-4 space-y-2 text-sm">
                    {[["0–14", 0.2451], ["15–34", 0.387], ["35–54", 0.2901], ["+55", 0.0779]].map(([b, s]) => (
                      <div key={b as string} className="flex items-center gap-3">
                        <span className="w-12 font-mono text-xs">{b}</span>
                        <div className="h-2 flex-1 rounded-full bg-secondary"><div className="h-2 rounded-full bg-primary" style={{ width: `${(s as number) * 100 * 2}%` }} /></div>
                        <span className="w-10 text-left font-mono text-xs">{Math.round((s as number) * 100)}%</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] text-muted-foreground">GASTAT 2022 · نمو 2.5% سنويًا · موزع حسب مساحة الحي</p>
                </>
              ) : <p className="text-sm text-muted-foreground">لا تتوفر حدود هذا الحي في البيانات، فلا نعرض تقديرًا لسكانه.</p>}
            </Card>
            <Card n="03" title="ملاءمة الموقع للسكن" badge="مؤشر تجريبي">
              <div className="flex items-center gap-5">
                <div className="flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-primary bg-primary/5">
                  <span className="text-4xl font-semibold text-primary">{r.suitability.score ?? "—"}</span><span className="text-xs text-muted-foreground">من 100</span>
                </div>
                <div className="text-sm"><div className="font-semibold">{r.suitability.label}</div><p className="mt-1 leading-6 text-muted-foreground">يوازن المؤشر زمن الوصول إلى الخدمات الأساسية مع سعر الشريحة مقارنة بوسيط الرياض.</p></div>
              </div>
            </Card>
          </div>

          <Card n="04" title="سعر المتر مقارنة بوسيط شريحة الحي" badge={r.priceDeltaPct == null ? undefined : `${r.priceDeltaPct > 0 ? "+" : ""}${r.priceDeltaPct}%`}>
            {r.insufficientSample || !p.price_per_sqm_sar ? (
              <p className="text-sm text-muted-foreground">عينة غير كافية: أُغلقت {r.segmentClosed} صفقة فقط في هذه الشريحة، فلا نعرض لها وسيطًا.</p>
            ) : (
              <>
                <div className="relative h-3 rounded-full bg-secondary">
                  <div className="h-3 rounded-full bg-primary" style={{ width: `${(p.price_per_sqm_sar / maxPpm) * 100}%` }} />
                  <div className="absolute -top-1.5 h-6 w-0.5 bg-foreground" style={{ right: `${((r.segmentMedianPpm ?? 0) / maxPpm) * 100}%` }} />
                </div>
                <div className="mt-3 flex justify-between text-sm">
                  <span>هذه الأرض <b className="text-primary">{sar(p.price_per_sqm_sar)}</b> ر.س/م²</span>
                  <span>وسيط {r.segmentClosed} صفقات مغلقة <b>{sar(r.segmentMedianPpm)}</b> ر.س/م²</span>
                </div>
              </>
            )}
          </Card>

          <Card n="05" title="الخدمات المحيطة ونقاط الوصول" badge="زمن قيادة تقديري">
            <table className="w-full text-sm">
              <thead><tr className="bg-primary/10 text-primary"><th className="p-2 text-right font-medium">الخدمة</th><th className="p-2 text-right font-medium">أقرب وجهة</th><th className="p-2 text-right font-medium">المسافة</th><th className="p-2 text-right font-medium">خلال 10 دقائق</th><th className="p-2 text-left font-medium">بالسيارة</th></tr></thead>
              <tbody>
                {r.services.map((s) => (
                  <tr key={s.category} className="border-b">
                    <td className="p-2">{s.label_ar}</td>
                    <td className="p-2 text-muted-foreground">{s.name ?? "غير متوفر"}</td>
                    <td className="p-2 font-mono text-xs">{s.km == null ? "—" : `${s.km} كم`}</td>
                    <td className="p-2 font-mono text-xs">{s.within10}</td>
                    <td className="p-2 text-left font-mono text-primary">{s.minutes == null ? "—" : `${s.minutes} د`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="report-insight rounded-2xl p-6">
            <div className="font-semibold">قراءة أولية للفرصة</div>
            <p className="mt-2 text-sm leading-7 opacity-85">
              {r.priceDeltaPct == null ? "لا نملك وسيطًا كافيًا لتقييم السعر في هذه الشريحة." : r.priceDeltaPct < 0 ? `سعر المتر أقل من وسيط الشريحة بنسبة ${Math.abs(r.priceDeltaPct)}%.` : `سعر المتر أعلى من وسيط الشريحة بنسبة ${r.priceDeltaPct}%.`}
              {r.domMultiplier != null && r.domMultiplier > 1 ? ` بقيت الأرض في السوق ${r.domMultiplier} ضعف مدة الإغلاق المعتادة، فهامش التفاوض أوسع.` : ""}
              {" "}قبل القرار، تحقّق من الاستخدام النظامي وواجهات الأرض والمعاينة الميدانية.
            </p>
          </div>

          <footer className="border-t pt-3 text-[11px] leading-5 text-muted-foreground">
            المصادر: بيانات محفظة سرج للأرض والأسعار؛ GASTAT للسكان (تقدير)؛ {(overture as unknown as OpenPlacesFile).source} للخدمات؛ Mapbox للخريطة. أزمنة القيادة تقديرية من المسافة المباشرة.
          </footer>
        </div>
      </article>
    </div>
  );
}

function Kpi({ label, value, unit, note }: { label: string; value: string; unit: string; note: string }) {
  return (
    <div className="report-card rounded-2xl border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-baseline gap-1.5"><span className="text-2xl font-semibold">{value}</span><span className="text-xs text-muted-foreground">{unit}</span></div>
      <div className="mt-1 text-[11px] text-muted-foreground">{note}</div>
      <div className="mt-3 h-0.5 rounded-full bg-primary" />
    </div>
  );
}

function Card({ n, title, badge, children }: { n?: string; title: string; badge?: string | undefined; children: React.ReactNode }) {
  return (
    <section className="report-card rounded-2xl border p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>{n && <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-xs text-primary">{n}</span>}<h2 className="mt-2 text-lg font-semibold">{title}</h2></div>
        {badge && <span className="rounded-md bg-secondary px-2 py-1 text-xs">{badge}</span>}
      </div>
      {children}
    </section>
  );
}

function useToday() {
  const [d, setD] = useState("");
  useEffect(() => { setD(new Date().toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { day: "numeric", month: "long", year: "numeric" })); }, []);
  return d;
}
