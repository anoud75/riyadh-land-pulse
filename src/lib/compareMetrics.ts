/** Pure per-parcel context for the comparison page: nearby services (Overture) and district population estimate. */
import type { OpenPlacesFile } from "./openPlaces";
import type { PlaceCategory } from "./siteSuitability";
import { pointInDistrict, type DistrictCollection } from "./districtStats";
import type { DistrictPopulation } from "./districtPopulation";

export const SERVICE_RADIUS_M = 2000;

function meters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r, dLng = (lng2 - lng1) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Count of open-data places per category within radius of a point. */
export function servicesNear(file: OpenPlacesFile, lat: number, lng: number, radiusM = SERVICE_RADIUS_M): Partial<Record<PlaceCategory, number>> {
  const out: Partial<Record<PlaceCategory, number>> = {};
  const dLat = radiusM / 111000, dLng = radiusM / (111000 * Math.cos((lat * Math.PI) / 180));
  for (const [plng, plat, ci] of file.places) {
    if (Math.abs(plat - lat) > dLat || Math.abs(plng - lng) > dLng) continue;
    if (meters(lat, lng, plat, plng) > radiusM) continue;
    const c = file.categories[ci];
    if (c) out[c] = (out[c] ?? 0) + 1;
  }
  return out;
}

/** Estimated 2026 population of the district containing the point, or null. */
export function populationAt(geo: DistrictCollection, pops: DistrictPopulation[], lat: number, lng: number): DistrictPopulation | null {
  const f = geo.features.find((d) => pointInDistrict(lng, lat, d));
  return f ? pops.find((p) => p.id === f.properties.id) ?? null : null;
}
