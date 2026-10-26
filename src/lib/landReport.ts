/** Pure builder for the land intelligence report. Every number is derived from passed-in data and tagged with its source. */
import type { Parcel } from "@/data/types";
import type { OpenPlacesFile } from "./openPlaces";
import { CATEGORY_AR, scoreLiving, type PlaceCategory, type ServiceCheck } from "./siteSuitability";
import { getParcelInsight } from "./investorEngine";
import { getMedian } from "./reportMath";

export const REPORT_SERVICES: PlaceCategory[] = ["hospital", "school", "mosque", "supermarket", "shopping_mall", "park", "pharmacy"];
/** Average urban drive speed (km/h) and road detour factor used to turn straight-line distance into minutes. */
export const DRIVE_KMH = 35;
export const ROAD_FACTOR = 1.3;

export function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export const driveMinutes = (distKm: number) => Math.max(1, Math.round(((distKm * ROAD_FACTOR) / DRIVE_KMH) * 60));

export interface NearestService { category: PlaceCategory; label_ar: string; name: string | null; km: number | null; minutes: number | null; within10: number }

export function nearestServices(p: { lat: number; lng: number }, file: OpenPlacesFile): NearestService[] {
  return REPORT_SERVICES.map((category) => {
    const ci = file.categories.indexOf(category);
    let best: { d: number; name: string } | null = null;
    let within10 = 0;
    for (const pl of file.places) {
      if (pl[2] !== ci) continue;
      const d = km(p, { lng: pl[0], lat: pl[1] });
      if (driveMinutes(d) <= 10) within10++;
      if (!best || d < best.d) best = { d, name: pl[3] };
    }
    return {
      category, label_ar: CATEGORY_AR[category], name: best?.name ?? null,
      km: best ? Math.round(best.d * 10) / 10 : null, minutes: best ? driveMinutes(best.d) : null, within10,
    };
  });
}

export interface LandReport {
  parcel: Parcel;
  priceDeltaPct: number | null;
  segmentMedianPpm: number | null;
  segmentClosed: number;
  insufficientSample: boolean;
  domMultiplier: number | null;
  services: NearestService[];
  suitability: { score: number | null; label: string };
  population: { value: number; shareOfRiyadhPct: number } | null;
}

export function buildLandReport(parcels: Parcel[], id: string, file: OpenPlacesFile, pop?: { district: number; riyadh: number } | null): LandReport | null {
  const ins = getParcelInsight(parcels, id);
  if (!ins) return null;
  const services = nearestServices(ins.parcel, file);
  const checks: ServiceCheck[] = services.map((s) => ({ category: s.category, label_ar: s.label_ar, minutes: s.minutes, count: s.within10 }));
  const priced = parcels.map((x) => x.price_per_sqm_sar).filter((v): v is number => typeof v === "number" && v > 0);
  const suitability = scoreLiving(checks, ins.segment.insufficientSample ? null : ins.segment.medianPricePerSqm, getMedian(priced));
  return {
    parcel: ins.parcel,
    priceDeltaPct: ins.segment.insufficientSample ? null : ins.priceDeltaPct,
    segmentMedianPpm: ins.segment.insufficientSample ? null : ins.segment.medianPricePerSqm,
    segmentClosed: ins.segment.closedDeals,
    insufficientSample: ins.segment.insufficientSample,
    domMultiplier: ins.domMultiplier,
    services, suitability,
    population: pop && pop.riyadh > 0 ? { value: pop.district, shareOfRiyadhPct: Math.round((pop.district / pop.riyadh) * 1000) / 10 } : null,
  };
}
