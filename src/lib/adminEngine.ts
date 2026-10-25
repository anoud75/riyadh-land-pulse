import type { Area, DealType, Inquiry, LandType, Parcel } from "@/data/types";
import { AREAS, LAND_TYPES, SNAPSHOT_DATE } from "@/data/types";
import {
  getHeadline, getNegotiationCandidates, getSegmentStats, getSupplyDemandGaps,
  isAvailable, isClosed, isPriced, median,
} from "./portfolioEngine";
import { COMPOUND_MIN_SQM, getActionableWaitingInquiries, getStagnantCapitalReport } from "./sarjAgentTools";

const DAY = 86_400_000;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);

/* ---------- geography ---------- */
export const RIYADH_CENTER = { lat: 24.7136, lng: 46.6753 };
/** Radius of the urban area the portfolio covers (agent-chosen). */
export const RIYADH_RADIUS_KM = 20;

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = (d: number) => (d * Math.PI) / 180;
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function boundsCheck(lat: number, lng: number) {
  const fromCenterKm = haversineKm(RIYADH_CENTER, { lat, lng });
  const beyondKm = Math.max(0, fromCenterKm - RIYADH_RADIUS_KM);
  return { fromCenterKm: Math.round(fromCenterKm * 10) / 10, beyondKm: Math.round(beyondKm), outOfBounds: beyondKm > 0 };
}

/* ---------- add parcel ---------- */
export const totalPrice = (pricePerSqm: number, sqm: number) => Math.round(pricePerSqm * sqm);

export interface DraftParcel {
  area_of_city: Area; land_type: LandType; listing_type: DealType;
  area_sqm: number; price_per_sqm_sar: number; total_price_sar: number;
}

export function previewParcelImpact(parcels: Parcel[], inquiries: Inquiry[], d: DraftParcel) {
  const cell = (ps: Parcel[]) =>
    getSupplyDemandGaps(ps, inquiries).find((g) => g.area === d.area_of_city && g.landType === d.land_type)!;
  const before = cell(parcels);
  const fake = { ...d, status: "available", missingPrice: false } as unknown as Parcel;
  const after = cell([...parcels, fake]);
  const buyers = inquiries.filter((i) => i.area_of_city_wanted === d.area_of_city && i.land_type_wanted === d.land_type);
  const matched = buyers.filter(
    (i) => i.prefers === d.listing_type && (i.budget_sar == null || i.budget_sar >= d.total_price_sar),
  );
  return { gapBefore: before.netGap, gapAfter: after.netGap, buyers: buyers.length, matched };
}

/* ---------- today ---------- */
export function getActionCards(parcels: Parcel[], inquiries: Inquiry[]) {
  const northCom = inquiries.filter((i) => i.area_of_city_wanted === "North" && i.land_type_wanted === "commercial");
  const northGap = getSupplyDemandGaps(parcels, inquiries).find((g) => g.area === "North" && g.landType === "commercial")!;
  const repricing = getNegotiationCandidates(parcels).filter(
    (c) => c.parcel.area_of_city === "North" && c.parcel.days_on_market > 140 && (c.priceDeltaPct ?? 0) > 20,
  );
  const actionable = getActionableWaitingInquiries(parcels, inquiries).filter((a) => a.matches.length && !a.flag);
  return {
    buyNorth: {
      buyers: northCom.length,
      maxBudget: Math.max(0, ...northCom.map((i) => i.budget_sar ?? 0)),
      supply: northGap.availableParcels,
    },
    reprice: repricing.map((c) => ({ id: c.parcel.parcel_id, district: c.parcel.district_ar, days: c.parcel.days_on_market, delta: c.priceDeltaPct! })),
    matchToday: {
      count: actionable.length,
      totalBudget: actionable.reduce((s, a) => s + (a.budget_sar ?? 0), 0),
      ids: actionable.map((a) => a.inquiry_id),
    },
  };
}

export function getKpis(parcels: Parcel[], inquiries: Inquiry[]) {
  const h = getHeadline(parcels, inquiries);
  const st = getStagnantCapitalReport(parcels);
  return {
    available: h.available,
    unanswered: inquiries.filter((i) => i.status === "new").length,
    stagnantCount: st.count,
    stagnantValue: st.total_value_sar,
    medianClosingDays: h.medianClosingDays,
    closed: h.closed,
  };
}

/** Available parcels with the longest time on market, vs the closed-deals median. */
export function getStagnantBars(parcels: Parcel[], limit = 10) {
  const med = median(parcels.filter(isClosed).map((p) => p.days_on_market)) ?? 0;
  const rows = parcels.filter(isAvailable).sort((a, b) => b.days_on_market - a.days_on_market).slice(0, limit)
    .map((p) => ({ id: p.parcel_id, district: p.district_ar, days: p.days_on_market }));
  return { median: med, rows };
}

/* ---------- portfolio scatter ---------- */
export const STAGNANT_DAYS = 90;
export function getScatter(parcels: Parcel[]) {
  const pts = getNegotiationCandidates(parcels)
    .filter((c) => c.priceDeltaPct != null)
    .map((c) => ({
      id: c.parcel.parcel_id, district: c.parcel.district_ar, days: c.parcel.days_on_market,
      delta: c.priceDeltaPct!, stagnant: c.parcel.days_on_market > STAGNANT_DAYS && c.priceDeltaPct! > 0,
    }));
  return { points: pts, stagnantCount: pts.filter((p) => p.stagnant).length };
}

/* ---------- inquiries ---------- */
export function getAging(inquiries: Inquiry[]) {
  return inquiries.map((i) => ({ id: i.inquiry_id, status: i.status, days: daysBetween(i.date, SNAPSHOT_DATE), name: i.investor_name }));
}

export function getFunnel(inquiries: Inquiry[], offersSent: number) {
  return [
    { key: "all", label: "استفسار", n: inquiries.length },
    { key: "contacted", label: "تواصل", n: inquiries.filter((i) => i.status !== "new").length },
    { key: "negotiating", label: "تفاوض", n: inquiries.filter((i) => i.status === "negotiating").length },
    { key: "offer", label: "عرض مُرسل", n: offersSent },
  ];
}

export const maskPhone = (p: string) => (p.length > 4 ? `${p.slice(0, 4)}•••` : "•••");

export function getFeasibility(parcels: Parcel[], inquiry: Inquiry) {
  if (!/compound|مجمع/i.test(inquiry.wants_to)) return null;
  const cands = parcels.filter((p) =>
    isAvailable(p) && isPriced(p) && p.area_of_city === inquiry.area_of_city_wanted &&
    p.land_type === inquiry.land_type_wanted && p.listing_type === inquiry.prefers &&
    (inquiry.budget_sar == null || p.total_price_sar! <= inquiry.budget_sar));
  if (!cands.length || cands.some((p) => p.area_sqm >= COMPOUND_MIN_SQM)) return null;
  const sizes = cands.map((p) => p.area_sqm);
  return { min: Math.min(...sizes), max: Math.max(...sizes), required: COMPOUND_MIN_SQM, ids: cands.map((p) => p.parcel_id) };
}

/* ---------- performance ---------- */
export function getMonthlyClosings(parcels: Parcel[]) {
  const m = new Map<string, number>();
  for (const p of parcels.filter(isClosed)) {
    const k = new Date(Date.parse(p.listed_date) + p.days_on_market * DAY).toISOString().slice(0, 7);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort().map(([month, n]) => ({ month, n }));
}

export function getSegmentVelocity(parcels: Parcel[]) {
  const out = [];
  for (const a of AREAS) for (const l of LAND_TYPES) for (const d of ["sale", "lease"] as DealType[]) {
    const s = getSegmentStats(parcels, a, l, d);
    if (s.closedDeals > 0) out.push(s);
  }
  return out;
}
