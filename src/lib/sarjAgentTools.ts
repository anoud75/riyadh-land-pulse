import type { Area, DealType, Inquiry, LandType, Parcel } from "@/data/types";
import { getNegotiationCandidates, getSegmentStats, getSupplyDemandGaps, isAvailable, isPriced } from "./portfolioEngine";

/**
 * Deterministic tools for the Sarj agents. The model never computes numbers;
 * every figure it reports comes from these pure functions.
 * Investor tools take parcels only — they cannot see inquiries.
 */

export type PriorityMode = "logistics_trucks" | "negotiation_margin" | "lowest_price" | "healthcare_reachability";

export interface RankInput {
  area_of_city?: Area | null;
  land_type?: LandType | null;
  listing_type?: DealType | null;
  max_budget_sar?: number | null;
  min_street_width_m?: number | null;
  priority_mode?: PriorityMode | null;
  limit?: number | null;
}

export function filterAndRankParcels(parcels: Parcel[], f: RankInput) {
  const cands = getNegotiationCandidates(parcels).filter(
    ({ parcel: p }) =>
      (!f.area_of_city || p.area_of_city === f.area_of_city) &&
      (!f.land_type || p.land_type === f.land_type) &&
      (!f.listing_type || p.listing_type === f.listing_type) &&
      (f.min_street_width_m == null || p.street_width_m >= f.min_street_width_m) &&
      (f.max_budget_sar == null || (p.total_price_sar != null && p.total_price_sar <= f.max_budget_sar)),
  );
  const mode = f.priority_mode ?? "logistics_trucks";
  const sorted = [...cands].sort((a, b) => {
    if (mode === "negotiation_margin") return (b.domMultiplier ?? -1) - (a.domMultiplier ?? -1);
    if (mode === "lowest_price") return (a.priceDeltaPct ?? Infinity) - (b.priceDeltaPct ?? Infinity);
    if (mode === "healthcare_reachability") return b.parcel.area_sqm - a.parcel.area_sqm; // proxy, see note
    return b.parcel.street_width_m - a.parcel.street_width_m || b.parcel.area_sqm - a.parcel.area_sqm;
  });
  const rows = sorted.slice(0, Math.max(1, Math.min(f.limit ?? 8, 20))).map((c) => ({
    parcel_id: c.parcel.parcel_id,
    district_ar: c.parcel.district_ar,
    area_sqm: c.parcel.area_sqm,
    street_width_m: c.parcel.street_width_m,
    total_price_sar: c.parcel.total_price_sar,
    price_per_sqm_sar: c.parcel.price_per_sqm_sar,
    missing_price: c.parcel.missingPrice,
    days_on_market: c.parcel.days_on_market,
    dom_multiplier: c.domMultiplier,
    price_delta_vs_median_pct: c.priceDeltaPct,
    segment_sample: c.segment.insufficientSample ? "عينة غير كافية" : `${c.segment.closedDeals} صفقات مغلقة`,
  }));
  return {
    matched: cands.length,
    available_total: parcels.filter(isAvailable).length,
    priority_mode: mode,
    note: mode === "healthcare_reachability" ? "لا تتوفر بيانات سكان أو مستشفيات لكل أرض؛ الترتيب تقديري بالمساحة." : null,
    parcels: rows,
  };
}

export function getParcelComparison(parcels: Parcel[], ids: string[]) {
  const cands = getNegotiationCandidates(parcels);
  return ids.slice(0, 4).map((id) => {
    const p = parcels.find((x) => x.parcel_id === id);
    if (!p) return { parcel_id: id, error: "غير موجودة" };
    const s = getSegmentStats(parcels, p.area_of_city, p.land_type, p.listing_type);
    const c = cands.find((x) => x.parcel.parcel_id === id);
    return {
      parcel_id: id,
      district_ar: p.district_ar,
      status: p.status,
      area_sqm: p.area_sqm,
      street_width_m: p.street_width_m,
      total_price_sar: p.total_price_sar,
      price_per_sqm_sar: p.price_per_sqm_sar,
      days_on_market: p.days_on_market,
      segment_closed_deals: s.closedDeals,
      segment_median_price_per_sqm: s.medianPricePerSqm,
      price_delta_vs_median: s.insufficientSample ? "عينة غير كافية" : (c?.priceDeltaPct ?? null),
      dom_multiplier: s.insufficientSample ? "عينة غير كافية" : (c?.domMultiplier ?? null),
    };
  });
}

/* ---------- admin ---------- */

export function getGapsTool(parcels: Parcel[], inquiries: Inquiry[]) {
  return getSupplyDemandGaps(parcels, inquiries);
}

/** Below this plot size a residential compound is not feasible (agent-chosen engineering threshold). */
export const COMPOUND_MIN_SQM = 2000;

export function getActionableWaitingInquiries(parcels: Parcel[], inquiries: Inquiry[]) {
  const avail = parcels.filter((p) => isAvailable(p) && isPriced(p));
  return inquiries
    .filter((i) => i.status === "new")
    .map((i) => {
      const seg = avail.filter((p) => p.area_of_city === i.area_of_city_wanted && p.land_type === i.land_type_wanted && p.listing_type === i.prefers);
      const inBudget = seg.filter((p) => i.budget_sar == null || (p.total_price_sar ?? Infinity) <= i.budget_sar);
      const compound = /compound|مجمع/i.test(i.wants_to);
      const fits = compound ? inBudget.filter((p) => p.area_sqm >= COMPOUND_MIN_SQM) : inBudget;
      const flag =
        seg.length === 0 ? "لا مخزون في الشريحة"
        : inBudget.length === 0 ? "لا أرض ضمن الميزانية"
        : fits.length === 0 ? `مساحات المطابقات ${Math.min(...inBudget.map((p) => p.area_sqm))}–${Math.max(...inBudget.map((p) => p.area_sqm))} م² لا تكفي لمجمع سكني`
        : null;
      return {
        inquiry_id: i.inquiry_id,
        investor_name: i.investor_name,
        wants_to: i.wants_to,
        segment: `${i.area_of_city_wanted} · ${i.land_type_wanted} · ${i.prefers}`,
        budget_sar: i.budget_sar,
        matches: fits.slice(0, 5).map((p) => p.parcel_id),
        flag,
      };
    });
}

export function getStagnantCapitalReport(parcels: Parcel[]) {
  const rows = getNegotiationCandidates(parcels).filter(
    (c) => c.parcel.days_on_market > 90 && c.priceDeltaPct != null && c.priceDeltaPct > 0,
  );
  return {
    count: rows.length,
    total_value_sar: rows.reduce((s, c) => s + (c.parcel.total_price_sar ?? 0), 0),
    parcels: rows.map((c) => ({ parcel_id: c.parcel.parcel_id, district_ar: c.parcel.district_ar, days_on_market: c.parcel.days_on_market, price_delta_vs_median_pct: c.priceDeltaPct, total_price_sar: c.parcel.total_price_sar })),
    quarantined: parcels.filter((p) => p.missingPrice || p.coordinatesCorrected).map((p) => ({ parcel_id: p.parcel_id, issue: p.missingPrice ? "سعر غير مسجل" : "إحداثيات مقلوبة صُحِّحت" })),
    rule: "متاحة، أكثر من 90 يومًا، وسعر المتر فوق وسيط شريحة فيها 3 صفقات مغلقة على الأقل",
  };
}

/* ---------- negotiation margin report (investor) ---------- */

export function getNegotiationMarginReport(parcels: Parcel[], f: { area_of_city?: Area | null; land_type?: LandType | null; max_budget_sar?: number | null; top?: number | null }) {
  const analyzed = getNegotiationCandidates(parcels).filter(
    (c) => c.domMultiplier != null && (!f.area_of_city || c.parcel.area_of_city === f.area_of_city) && (!f.land_type || c.parcel.land_type === f.land_type) && c.parcel.listing_type === "sale",
  );
  const inBudget = analyzed.filter((c) => f.max_budget_sar == null || (c.parcel.total_price_sar ?? Infinity) <= f.max_budget_sar);
  const rec = [...inBudget].sort((a, b) => (b.domMultiplier ?? 0) - (a.domMultiplier ?? 0)).slice(0, f.top ?? 3);
  return {
    funnel: { analyzed: analyzed.length, in_budget: inBudget.length, recommended: rec.length },
    recommended: rec.map((c) => ({ parcel_id: c.parcel.parcel_id, district_ar: c.parcel.district_ar, dom_multiplier: c.domMultiplier, days_on_market: c.parcel.days_on_market, segment_median_days: c.segment.medianClosingDays, total_price_sar: c.parcel.total_price_sar, price_delta_vs_median_pct: c.priceDeltaPct })),
    rule: "أراضي بيع متاحة بشريحة فيها 3 صفقات مغلقة على الأقل؛ المضاعف = أيام العرض ÷ وسيط أيام الإغلاق",
  };
}

/** Segment medians + district counts for the investor (no inquiry data). */
export function getMarketContext(parcels: Parcel[], f: { area_of_city?: Area | null }) {
  const areas: Area[] = f.area_of_city ? [f.area_of_city] : ["North", "South", "East", "West", "Central"];
  const segs = areas.flatMap((a) => (["residential", "commercial"] as LandType[]).flatMap((t) => (["sale", "lease"] as DealType[]).map((d) => getSegmentStats(parcels, a, t, d))));
  const districts = new Map<string, number>();
  parcels.filter((p) => isAvailable(p) && areas.includes(p.area_of_city)).forEach((p) => districts.set(p.district_ar, (districts.get(p.district_ar) ?? 0) + 1));
  return {
    segments: segs.map((s) => ({ ...s, medianPricePerSqm: s.insufficientSample ? "عينة غير كافية" : s.medianPricePerSqm, medianClosingDays: s.insufficientSample ? "عينة غير كافية" : s.medianClosingDays })),
    districts_available: [...districts].map(([district_ar, available]) => ({ district_ar, available })).sort((a, b) => b.available - a.available).slice(0, 15),
  };
}

/* ---------- admin diagnosis ---------- */

export const SNAPSHOT_DATE = "2026-08-11";
const waitDays = (d: string) => Math.max(0, Math.round((Date.parse(SNAPSHOT_DATE) - Date.parse(d)) / 86_400_000));

export function diagnoseRegion(parcels: Parcel[], inquiries: Inquiry[], area: Area = "North") {
  const side = (t: LandType) => {
    const avail = parcels.filter((p) => isAvailable(p) && p.area_of_city === area && p.land_type === t);
    const inq = inquiries.filter((i) => i.area_of_city_wanted === area && i.land_type_wanted === t && i.status !== "closed");
    const s = getSegmentStats(parcels, area, t, "sale");
    return {
      available_parcels: avail.length,
      open_inquiries: inq.length,
      buyer_budgets_total_sar: inq.reduce((x, i) => x + (i.budget_sar ?? 0), 0),
      listed_value_sar: avail.reduce((x, p) => x + (p.total_price_sar ?? 0), 0),
      sale_median_closing_days: s.insufficientSample ? "عينة غير كافية" : s.medianClosingDays,
      sale_price_concession_pct: s.insufficientSample ? "عينة غير كافية" : s.priceConcessionPct,
      sale_closed_deals: s.closedDeals,
    };
  };
  return { area, commercial: side("commercial"), residential: side("residential"), note: "خسارة النفاد = مجموع ميزانيات المشترين في شريحة بلا مخزون (سقف تقديري للإيراد الضائع)" };
}

/** New inquiries with no inventory at all in their segment — excluded from matching, with wait days. */
export function getExcludedWaitingBuyers(parcels: Parcel[], inquiries: Inquiry[]) {
  return getActionableWaitingInquiries(parcels, inquiries)
    .filter((q) => q.flag === "لا مخزون في الشريحة")
    .map((q) => ({ ...q, wait_days: waitDays(inquiries.find((i) => i.inquiry_id === q.inquiry_id)!.date) }));
}
