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
