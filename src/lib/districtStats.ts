import type { Area, Inquiry, Parcel } from "@/data/types";
import { isAvailable, isPriced, median } from "./portfolioEngine";

/** Minimal GeoJSON types for the Riyadh district boundaries (open data, 189 districts). */
export type Ring = [number, number][];
export interface DistrictFeature {
  type: "Feature";
  properties: { id: number; name_ar: string; name_en: string };
  geometry: { type: "Polygon"; coordinates: Ring[] } | { type: "MultiPolygon"; coordinates: Ring[][] };
}
export interface DistrictCollection { type: "FeatureCollection"; features: DistrictFeature[] }

export type DistrictMetric = "available" | "median_ppm" | "waiting" | "gap" | "dom";
export const METRIC_AR: Record<DistrictMetric, string> = {
  available: "أراضٍ متاحة",
  median_ppm: "وسيط سعر المتر",
  waiting: "مشترون ينتظرون (المنطقة)",
  gap: "الفجوة: طلب − عرض (المنطقة)",
  dom: "متوسط أيام العرض",
};

export interface DistrictStat {
  id: number;
  name_ar: string;
  name_en: string;
  area: Area | null;
  parcelIds: string[];
  available: number;
  medianPpm: number | null;
  waiting: number;
  gap: number;
  avgDom: number | null;
}

function inRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!; const [xj, yj] = ring[j]!;
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export function pointInDistrict(lng: number, lat: number, f: DistrictFeature): boolean {
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  return polys.some((rings) => inRing(lng, lat, rings[0]!) && !rings.slice(1).some((h) => inRing(lng, lat, h)));
}

const OPEN = (q: Inquiry) => !/closed|مغلق|won|lost/i.test(q.status);

/** Per-district figures. Parcels are placed by their coordinates (point in polygon);
 *  buyer demand is recorded per city area, so waiting/gap are the district's area values. */
export function districtStats(geo: DistrictCollection, parcels: Parcel[], inquiries: Inquiry[]): DistrictStat[] {
  const located = parcels.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  const waitingByArea = new Map<Area, number>();
  for (const q of inquiries) if (OPEN(q)) waitingByArea.set(q.area_of_city_wanted, (waitingByArea.get(q.area_of_city_wanted) ?? 0) + 1);
  const availByArea = new Map<Area, number>();
  for (const p of parcels) if (isAvailable(p)) availByArea.set(p.area_of_city, (availByArea.get(p.area_of_city) ?? 0) + 1);

  return geo.features.map((f) => {
    const inside = located.filter((p) => pointInDistrict(p.lng, p.lat, f));
    const counts = new Map<Area, number>();
    inside.forEach((p) => counts.set(p.area_of_city, (counts.get(p.area_of_city) ?? 0) + 1));
    const area = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const avail = inside.filter(isAvailable);
    const waiting = area ? waitingByArea.get(area) ?? 0 : 0;
    return {
      id: f.properties.id,
      name_ar: f.properties.name_ar,
      name_en: f.properties.name_en,
      area,
      parcelIds: inside.map((p) => p.parcel_id),
      available: avail.length,
      medianPpm: median(inside.filter(isPriced).map((p) => p.price_per_sqm_sar!)),
      waiting,
      gap: area ? waiting - (availByArea.get(area) ?? 0) : 0,
      avgDom: avail.length ? Math.round(avail.reduce((s, p) => s + p.days_on_market, 0) / avail.length) : null,
    };
  });
}

export function metricValue(s: DistrictStat, m: DistrictMetric): number | null {
  if (!s.parcelIds.length) return null;
  switch (m) {
    case "available": return s.available;
    case "median_ppm": return s.medianPpm;
    case "waiting": return s.waiting;
    case "gap": return s.gap;
    case "dom": return s.avgDom;
  }
}

/** Bounding box [[minLng,minLat],[maxLng,maxLat]] of a district. */
export function districtBounds(f: DistrictFeature): [[number, number], [number, number]] {
  const pts = (f.geometry.type === "Polygon" ? f.geometry.coordinates : f.geometry.coordinates.flat()).flat();
  const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
  return [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]];
}

const normName = (s: string) =>
  s
    .replace(/^حي\s+/, "")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة$/g, "ه")
    .replace(/^ال/, "")
    .replace(/\s*dist\.?$/i, "")
    .trim()
    .toLowerCase();

/** Match a district across all 189 features by Arabic or English name (normalized exact, then substring). */
export function districtByName(geo: DistrictCollection, name: string): DistrictFeature | null {
  const q = normName(name);
  if (!q) return null;
  const exact = geo.features.find((f) => normName(f.properties.name_ar) === q || normName(f.properties.name_en) === q);
  if (exact) return exact;
  return geo.features.find((f) => normName(f.properties.name_ar).includes(q) || normName(f.properties.name_en).includes(q)) ?? null;
}

/** Centre of a district (midpoint of its bounding box) — works even where سرج has no parcels. */
export function districtCenter(f: DistrictFeature): [number, number] {
  const [[minLng, minLat], [maxLng, maxLat]] = districtBounds(f);
  return [Math.round(((minLat + maxLat) / 2) * 1000) / 1000, Math.round(((minLng + maxLng) / 2) * 1000) / 1000];
}

export function findDistrict(geo: DistrictCollection, name: string): DistrictFeature | null {
  return districtByName(geo, name);
}
