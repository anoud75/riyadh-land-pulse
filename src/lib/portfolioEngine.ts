import type {
  Area,
  DealType,
  Inquiry,
  LandType,
  Parcel,
  RawInquiry,
  RawParcel,
} from "@/data/types";
import { AREAS, LAND_TYPES } from "@/data/types";

export const MIN_SAMPLE = 3;
const CLOSED = new Set(["sold", "leased"]);

/* ---------- cleaning ---------- */

export function cleanParcel(p: RawParcel): Parcel {
  const missingPrice = p.price_per_sqm_sar == null || p.total_price_sar == null;
  // Riyadh: lat ≈ 24–25, lng ≈ 46–47. If lat looks like a longitude, swap.
  const swapped = p.lat > 40 && p.lng < 40;
  return {
    ...p,
    lat: swapped ? p.lng : p.lat,
    lng: swapped ? p.lat : p.lng,
    missingPrice,
    coordinatesCorrected: swapped,
  };
}

export function cleanInquiry(i: RawInquiry): Inquiry {
  return { ...i, missingBudget: i.budget_sar == null || !(i.budget_sar > 0) };
}

export const isClosed = (p: Parcel) => CLOSED.has(p.status);
export const isAvailable = (p: Parcel) => p.status === "available";
/** Parcels that may enter any price ranking, median or chart. */
export const isPriced = (p: Parcel) => !p.missingPrice;

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/* ---------- segment stats ---------- */

export interface SegmentStats {
  area: Area;
  landType: LandType;
  dealType: DealType;
  closedDeals: number;
  insufficientSample: boolean;
  medianPricePerSqm: number | null;
  medianClosingDays: number | null;
  /** (median asking of available − median closed) / median asking, in %. */
  priceConcessionPct: number | null;
}

const inSegment = (p: Parcel, a: Area, l: LandType, d: DealType) =>
  p.area_of_city === a && p.land_type === l && p.listing_type === d;

export function getSegmentStats(
  parcels: Parcel[],
  area: Area,
  landType: LandType,
  dealType: DealType,
): SegmentStats {
  const seg = parcels.filter((p) => inSegment(p, area, landType, dealType));
  const closed = seg.filter(isClosed);
  const base = { area, landType, dealType, closedDeals: closed.length };
  if (closed.length < MIN_SAMPLE) {
    return {
      ...base,
      insufficientSample: true,
      medianPricePerSqm: null,
      medianClosingDays: null,
      priceConcessionPct: null,
    };
  }
  const closedPriced = closed.filter(isPriced).map((p) => p.price_per_sqm_sar!);
  const medianPricePerSqm = median(closedPriced);
  const askMedian = median(seg.filter((p) => isAvailable(p) && isPriced(p)).map((p) => p.price_per_sqm_sar!));
  const priceConcessionPct =
    askMedian && medianPricePerSqm != null
      ? round1(((askMedian - medianPricePerSqm) / askMedian) * 100)
      : null;
  return {
    ...base,
    insufficientSample: false,
    medianPricePerSqm,
    medianClosingDays: median(closed.map((p) => p.days_on_market)),
    priceConcessionPct,
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/* ---------- negotiation candidates ---------- */

export interface NegotiationCandidate {
  parcel: Parcel;
  segment: SegmentStats;
  /** days_on_market / segment median closing days */
  domMultiplier: number | null;
  /** % price/sqm vs segment median closed price */
  priceDeltaPct: number | null;
}

export function getNegotiationCandidates(parcels: Parcel[]): NegotiationCandidate[] {
  const cache = new Map<string, SegmentStats>();
  const seg = (p: Parcel) => {
    const k = `${p.area_of_city}|${p.land_type}|${p.listing_type}`;
    if (!cache.has(k)) cache.set(k, getSegmentStats(parcels, p.area_of_city, p.land_type, p.listing_type));
    return cache.get(k)!;
  };
  return parcels
    .filter(isAvailable)
    .map((parcel) => {
      const s = seg(parcel);
      const domMultiplier =
        s.medianClosingDays ? round1(parcel.days_on_market / s.medianClosingDays) : null;
      const priceDeltaPct =
        s.medianPricePerSqm && isPriced(parcel)
          ? round1(((parcel.price_per_sqm_sar! - s.medianPricePerSqm) / s.medianPricePerSqm) * 100)
          : null;
      return { parcel, segment: s, domMultiplier, priceDeltaPct };
    })
    .sort((a, b) => (b.domMultiplier ?? -1) - (a.domMultiplier ?? -1));
}

/* ---------- admin cross-matching ---------- */

export interface GapCell {
  area: Area;
  landType: LandType;
  availableParcels: number;
  openInquiries: number;
  /** supply − demand; negative = unmet demand */
  netGap: number;
}

export function getSupplyDemandGaps(parcels: Parcel[], inquiries: Inquiry[]): GapCell[] {
  const cells: GapCell[] = [];
  for (const area of AREAS)
    for (const landType of LAND_TYPES) {
      const availableParcels = parcels.filter(
        (p) => isAvailable(p) && p.area_of_city === area && p.land_type === landType,
      ).length;
      const openInquiries = inquiries.filter(
        (i) => i.area_of_city_wanted === area && i.land_type_wanted === landType,
      ).length;
      cells.push({ area, landType, availableParcels, openInquiries, netGap: availableParcels - openInquiries });
    }
  return cells;
}

/* ---------- headline numbers ---------- */

export function getHeadline(parcels: Parcel[], inquiries: Inquiry[]) {
  const closed = parcels.filter(isClosed);
  return {
    parcels: parcels.length,
    districts: new Set(parcels.map((p) => p.district_en)).size,
    available: parcels.filter(isAvailable).length,
    reserved: parcels.filter((p) => p.status === "reserved").length,
    closed: closed.length,
    inquiries: inquiries.length,
    medianClosingDays: median(closed.map((p) => p.days_on_market)),
    unmetSegments: getSupplyDemandGaps(parcels, inquiries).filter(
      (g) => g.availableParcels === 0 && g.openInquiries > 0,
    ).length,
  };
}

export function nextId(ids: string[], prefix: string): string {
  const max = Math.max(0, ...ids.map((id) => Number(id.replace(/\D/g, "")) || 0));
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}
