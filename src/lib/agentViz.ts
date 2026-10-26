import type { Area, Inquiry, Parcel } from "@/data/types";
import { AREA_AR } from "@/data/types";
import { districtByName, districtCenter, pointInDistrict, type DistrictCollection } from "./districtStats";
import { getNegotiationCandidates, getSupplyDemandGaps, isAvailable } from "./portfolioEngine";
import { diagnoseRegion, getMarketContext, getStagnantCapitalReport } from "./sarjAgentTools";
import type { ChartSpec, MapCommand, ReportSection } from "./agentUi";
import geoRaw from "@/data/riyadhDistricts.json";

/** Pure builders for charts, reports and map commands. Every number comes from the engines. */
const GEO = geoRaw as unknown as DistrictCollection;

export const RIYADH_CENTER: [number, number] = [24.7136, 46.6753];
const SRC = "سجلّ سرج · لقطة 11 أغسطس 2026";
const r1 = (x: number) => Math.round(x * 10) / 10;

export type CompareMetric = "price_per_sqm" | "total_price" | "days_on_market" | "street_width" | "area";
const METRIC: Record<CompareMetric, { title: string; unit: string; get: (p: Parcel) => number | null }> = {
  price_per_sqm: { title: "سعر المتر", unit: "ريال/م²", get: (p) => p.price_per_sqm_sar },
  total_price: { title: "السعر الإجمالي", unit: "ريال", get: (p) => p.total_price_sar },
  days_on_market: { title: "أيام العرض", unit: "يوم", get: (p) => p.days_on_market },
  street_width: { title: "عرض الشارع", unit: "م", get: (p) => p.street_width_m },
  area: { title: "المساحة", unit: "م²", get: (p) => p.area_sqm },
};

export function buildComparisonChart(parcels: Parcel[], ids: string[], metric: CompareMetric): ChartSpec {
  const m = METRIC[metric];
  const series = ids
    .map((id) => parcels.find((p) => p.parcel_id === id.toUpperCase()))
    .filter((p): p is Parcel => !!p && m.get(p) != null)
    .map((p) => ({ label: `${p.district_ar} · ${p.parcel_id}`, value: m.get(p)!, id: p.parcel_id }));
  return { type: "bar", title: `مقارنة ${m.title}`, unit: m.unit, series, source: SRC };
}

/** Days on market vs price delta to segment median — investor-safe (parcels only). */
export function buildScatterChart(parcels: Parcel[], area: Area | null): ChartSpec {
  const series = getNegotiationCandidates(parcels)
    .filter((c) => c.priceDeltaPct != null && (!area || c.parcel.area_of_city === area))
    .map((c) => ({ label: `${c.parcel.district_ar} · ${c.parcel.parcel_id}`, value: c.parcel.days_on_market, value2: c.priceDeltaPct!, id: c.parcel.parcel_id }));
  return { type: "scatter", title: `أيام العرض مقابل فرق السعر عن الوسيط${area ? ` — ${AREA_AR[area]}` : ""}`, unit: "%", xLabel: "أيام العرض", yLabel: "فرق السعر %", series, source: `${SRC} · الوسيط من الشرائح ذات 3 صفقات مغلقة فأكثر` };
}

/** Supply − demand per region/type. Team only: uses inquiries. */
export function buildGapChart(parcels: Parcel[], inquiries: Inquiry[]): ChartSpec {
  const series = getSupplyDemandGaps(parcels, inquiries).map((g) => ({ label: `${AREA_AR[g.area]} · ${g.landType === "commercial" ? "تجاري" : "سكني"}`, value: g.netGap }));
  return { type: "diverging", title: "صافي العرض ناقص الطلب", unit: "أرض", series, source: `${SRC} · سالب = طلب بلا مخزون` };
}

export function buildMarketReport(parcels: Parcel[], area: Area | null): { title: string; sections: ReportSection[] } {
  const ctx = getMarketContext(parcels, { area_of_city: area });
  const avail = parcels.filter((p) => isAvailable(p) && (!area || p.area_of_city === area));
  const segs = ctx.segments.filter((s) => s.closedDeals > 0);
  return {
    title: `تقرير السوق — ${area ? AREA_AR[area] : "الرياض"}`,
    sections: [
      { heading: "الملخّص", text: `${avail.length} أرضًا متاحة في ${ctx.districts_available.length} حيًا. الوسائط تُعرض فقط للشرائح التي فيها 3 صفقات مغلقة فأكثر.` },
      { heading: "وسائط الشرائح", text: "سعر المتر وأيام الإغلاق من الصفقات المغلقة.", table: { headers: ["المنطقة", "النوع", "الصفقة", "صفقات مغلقة", "وسيط سعر المتر", "وسيط أيام الإغلاق"], rows: segs.map((s) => [AREA_AR[s.area], s.landType === "commercial" ? "تجاري" : "سكني", s.dealType === "sale" ? "بيع" : "إيجار", s.closedDeals, s.medianPricePerSqm, s.medianClosingDays]) } },
      { heading: "الأحياء", text: "أكثر الأحياء عرضًا الآن.", chart: { type: "bar", title: "الأراضي المتاحة حسب الحي", unit: "أرض", series: ctx.districts_available.slice(0, 8).map((d) => ({ label: d.district_ar, value: d.available })), source: SRC } },
      { heading: "هامش التفاوض", text: "كل نقطة أرض متاحة: كلما ارتفعت أيام العرض وزاد السعر عن الوسيط زاد هامش التفاوض.", chart: buildScatterChart(parcels, area) },
    ],
  };
}

export function buildRegionReport(parcels: Parcel[], inquiries: Inquiry[], area: Area): { title: string; sections: ReportSection[] } {
  const d = diagnoseRegion(parcels, inquiries, area);
  const st = getStagnantCapitalReport(parcels);
  const stHere = st.parcels.filter((p) => parcels.find((x) => x.parcel_id === p.parcel_id)?.area_of_city === area);
  return {
    title: `تقرير الفريق — ${AREA_AR[area]}`,
    sections: [
      { heading: "التجاري", text: `${d.commercial.open_inquiries} استفسارات مفتوحة مقابل ${d.commercial.available_parcels} أرض متاحة. ميزانيات المشترين ${d.commercial.buyer_budgets_total_sar.toLocaleString("en-US")} ريال.` },
      { heading: "السكني", text: `${d.residential.available_parcels} أرضًا متاحة مقابل ${d.residential.open_inquiries} استفسارات. وسيط الإغلاق ${d.residential.sale_median_closing_days} يومًا، التنازل ${d.residential.sale_price_concession_pct}%.` },
      { heading: "الفجوة في كل المناطق", text: d.note, chart: buildGapChart(parcels, inquiries) },
      { heading: "الأراضي الراكدة هنا", text: `${stHere.length} أرضًا (${st.rule}).`, table: { headers: ["الأرض", "الحي", "أيام العرض"], rows: stHere.map((p) => [p.parcel_id, p.district_ar, p.days_on_market]) } },
    ],
  };
}

const norm = (s: string) => s.replace(/^ال/, "").replace(/[ًٌٍَُِّْ]/g, "").replace(/[أإآ]/g, "ا").replace(/ة$/, "ه").trim().toLowerCase();

/** Resolve a map instruction into a deterministic command (centre/zoom from parcel coordinates). */
export function mapCommand(parcels: Parcel[], f: { district?: string | null; area_of_city?: Area | null; parcel_ids?: string[] | null; radius_km?: number | null }): MapCommand {
  const pool = parcels.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  const centroid = (list: Parcel[]): [number, number] => [r1(list.reduce((s, p) => s + p.lat, 0) / list.length * 1000) / 1000, r1(list.reduce((s, p) => s + p.lng, 0) / list.length * 1000) / 1000];
  if (f.parcel_ids?.length) {
    const list = pool.filter((p) => f.parcel_ids!.map((x) => x.toUpperCase()).includes(p.parcel_id));
    if (list.length) return { action: f.radius_km ? "radius" : "highlight", center: centroid(list), zoom: list.length === 1 ? 14 : 12, parcelIds: list.map((p) => p.parcel_id), radiusKm: f.radius_km ?? null, label: list.length === 1 ? `${list[0]!.district_ar} · ${list[0]!.parcel_id}` : `${list.length} مواقع` };
  }
  if (f.district) {
    const q = norm(f.district);
    const list = pool.filter((p) => norm(p.district_ar) === q || norm(p.district_en) === q || norm(p.district_ar).includes(q));
    if (list.length) return { action: f.radius_km ? "radius" : "focus", center: centroid(list), zoom: 14, parcelIds: list.filter(isAvailable).map((p) => p.parcel_id), radiusKm: f.radius_km ?? null, label: `حي ${list[0]!.district_ar}` };
  }
  if (f.area_of_city) {
    const list = pool.filter((p) => p.area_of_city === f.area_of_city);
    return { action: "focus", center: centroid(list), zoom: 12, parcelIds: list.filter(isAvailable).map((p) => p.parcel_id), radiusKm: null, label: AREA_AR[f.area_of_city] };
  }
  return { action: "fit_all", center: RIYADH_CENTER, zoom: 11, parcelIds: [], radiusKm: null, label: "الرياض كاملة" };
}
