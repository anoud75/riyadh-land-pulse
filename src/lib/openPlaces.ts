/** Pure helpers for open place data (Overture snapshot). Data is passed in so this stays testable. */
import type { PlaceCategory } from "./siteSuitability";

export type PlaceSource = "Mapbox" | "Overture" | "data.gov.sa";
export interface SourcedPoi { name: string; category: PlaceCategory; lng: number; lat: number; source: PlaceSource }

export interface OpenPlacesFile {
  source: string; release: string; fetched: string; license: string;
  categories: PlaceCategory[]; places: [number, number, number, string][];
}

export const OVERTURE_LABEL = (f: Pick<OpenPlacesFile, "release" | "fetched">) => `Overture Maps · إصدار ${f.release} · سُحب ${f.fetched}`;

export function placesInBbox(file: OpenPlacesFile, category: PlaceCategory, bbox: [number, number, number, number]): SourcedPoi[] {
  const ci = file.categories.indexOf(category);
  if (ci < 0) return [];
  const [x0, y0, x1, y1] = bbox;
  return file.places.filter((p) => p[2] === ci && p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1)
    .map(([lng, lat, , name]) => ({ name, category, lng, lat, source: "Overture" as const }));
}

function meters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const norm = (s: string) => s.toLowerCase().replace(/[\s\-_.،,]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه");
function similar(a: string, b: string) {
  const x = norm(a), y = norm(b);
  if (!x || !y) return true; // unnamed point at the same spot = same place
  return x.includes(y) || y.includes(x);
}

/** Merge sources; a place within 75 m with a similar name counts once (first source wins). */
export function mergePlaces(...lists: SourcedPoi[][]): SourcedPoi[] {
  const out: SourcedPoi[] = [];
  for (const list of lists) for (const p of list) {
    if (!out.some((q) => q.category === p.category && meters(p, q) < 75 && similar(p.name, q.name))) out.push(p);
  }
  return out;
}

export function countBySource(list: SourcedPoi[]): Partial<Record<PlaceSource, number>> {
  const c: Partial<Record<PlaceSource, number>> = {};
  for (const p of list) c[p.source] = (c[p.source] ?? 0) + 1;
  return c;
}

export function sourceLine(list: SourcedPoi[]): string {
  const c = countBySource(list);
  return Object.entries(c).map(([s, n]) => `${s}: ${n}`).join(" · ") || "لا أماكن";
}
