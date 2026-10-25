import type { Area, DealType, LandType, Parcel } from "@/data/types";
import { isAvailable, isClosed, isPriced, median } from "./portfolioEngine";
import { getStagnant } from "./sectors";
import { MAP_COLORS } from "./mapLayers";

/* ---------- map filters ---------- */

export interface MapFilters {
  area: Area | null;
  landType: LandType | null;
  dealType: DealType | null;
  minStreet: number | null;
  maxBudget: number | null;
  excludeArea: Area | null;
}

export const EMPTY_FILTERS: MapFilters = {
  area: null,
  landType: null,
  dealType: null,
  minStreet: null,
  maxBudget: null,
  excludeArea: null,
};

export function applyMapFilters(parcels: Parcel[], f: MapFilters): Parcel[] {
  return parcels.filter(
    (p) =>
      (f.area == null || p.area_of_city === f.area) &&
      (f.excludeArea == null || p.area_of_city !== f.excludeArea) &&
      (f.landType == null || p.land_type === f.landType) &&
      (f.dealType == null || p.listing_type === f.dealType) &&
      (f.minStreet == null || p.street_width_m >= f.minStreet) &&
      (f.maxBudget == null || (p.total_price_sar != null && p.total_price_sar <= f.maxBudget)),
  );
}

/* ---------- district aggregation (الأحياء view) ---------- */

export interface DistrictAgg {
  district_en: string;
  district_ar: string;
  count: number;
  available: number;
  medianPrice: number | null;
  lat: number;
  lng: number;
  /** Convex hull of the district's parcel positions — an estimated extent, not official boundaries. */
  hull: [number, number][];
}

export function districtRadius(count: number) {
  return Math.round(500 + Math.sqrt(count) * 650);
}

export function districtColor(medianPrice: number | null): string {
  if (medianPrice == null) return MAP_COLORS.noData;
  const edges = [2500, 4000, 6000, 8000];
  const i = edges.findIndex((e) => medianPrice < e);
  return MAP_COLORS.scale[i === -1 ? edges.length : i]!;
}

export const DISTRICT_LEGEND: { color: string; label: string }[] = [
  ["أقل من 2,500", "2,500–4,000", "4,000–6,000", "6,000–8,000", "+8,000 ريال/م²"].map((label, i) => ({
    color: MAP_COLORS.scale[i]!,
    label,
  })),
  [{ color: MAP_COLORS.noData, label: "لا سعر مسجل" }],
].flat();

/** Monotone-chain convex hull over [lng, lat] points; [] when fewer than 3 unique points. */
export function convexHull(points: [number, number][]): [number, number][] {
  const pts = [...new Set(points.map((p) => p.join(",")))]
    .map((s) => s.split(",").map(Number) as [number, number])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return [];
  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: [number, number][] = [];
  for (const p of [...pts].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

export function aggregateDistricts(parcels: Parcel[]): DistrictAgg[] {
  const byDistrict = new Map<string, Parcel[]>();
  for (const p of parcels) {
    const list = byDistrict.get(p.district_en) ?? [];
    list.push(p);
    byDistrict.set(p.district_en, list);
  }
  return [...byDistrict.entries()]
    .map(([en, list]) => ({
      district_en: en,
      district_ar: list[0]!.district_ar,
      count: list.length,
      available: list.filter(isAvailable).length,
      medianPrice: median(list.filter(isPriced).map((p) => p.price_per_sqm_sar!)),
      lat: list.reduce((s, p) => s + p.lat, 0) / list.length,
      lng: list.reduce((s, p) => s + p.lng, 0) / list.length,
      hull: convexHull(list.map((p) => [p.lng, p.lat] as [number, number])).map(
        ([lng, lat]) => [lat, lng] as [number, number],
      ),
    }))
    .sort((a, b) => b.count - a.count);
}

/* ---------- executive ticker ---------- */

const round1 = (n: number) => Math.round(n * 10) / 10;

export function getTickerStats(parcels: Parcel[]) {
  const avail = parcels.filter(isAvailable);
  const sale = avail.filter((p) => p.listing_type === "sale" && isPriced(p));
  const lease = avail.filter((p) => p.listing_type === "lease" && isPriced(p));
  const closed = parcels.filter(isClosed);
  return {
    available: avail.length,
    saleValueM: round1(sale.reduce((s, p) => s + p.total_price_sar!, 0) / 1e6),
    leaseValueM: round1(lease.reduce((s, p) => s + p.total_price_sar!, 0) / 1e6),
    medianClosingDays: median(closed.map((p) => p.days_on_market)),
    stagnant: getStagnant(parcels).count,
  };
}
