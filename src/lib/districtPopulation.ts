import { GASTAT_POP } from "@/data/districtSeries";
import type { DistrictCollection, DistrictFeature } from "./districtStats";
import { projectPopulationTo2026 } from "./portfolioEngine";

export const POP_ESTIMATE_NOTE = "تقدير · مبني على GASTAT 2022 ونمو 2.5% سنويًا، موزّع حسب مساحة الحي";

/** Spherical polygon area in km² (outer rings minus holes). */
function ringArea(ring: [number, number][]): number {
  const R = 6371; let s = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i]!; const [x2, y2] = ring[(i + 1) % ring.length]!;
    s += ((x2 - x1) * Math.PI / 180) * (2 + Math.sin(y1 * Math.PI / 180) + Math.sin(y2 * Math.PI / 180));
  }
  return Math.abs((s * R * R) / 2);
}
export function districtAreaKm2(f: DistrictFeature): number {
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  return polys.reduce((a, rings) => a + ringArea(rings[0]!) - rings.slice(1).reduce((h, r) => h + ringArea(r), 0), 0);
}

export interface DistrictPopulation { id: number; name_ar: string; population: number; source: "estimate" }

/** Projected 2026 Riyadh total split across districts by land area. */
export function districtPopulation2026(geo: DistrictCollection, riyadh2022 = GASTAT_POP[2022]!.riyadh): DistrictPopulation[] {
  const total = projectPopulationTo2026(riyadh2022);
  const areas = geo.features.map(districtAreaKm2);
  const sum = areas.reduce((a, b) => a + b, 0);
  return geo.features.map((f, i) => ({ id: f.properties.id, name_ar: f.properties.name_ar, population: Math.round((total * areas[i]!) / sum), source: "estimate" as const }));
}
