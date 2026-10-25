import type { Parcel } from "@/data/types";
import { districtByAr } from "@/data/districtSeries";

/** Centre and a buffered hull outline of a footprint district, from its parcels' coordinates. */
export function districtGeo(parcels: Parcel[], ar: string) {
  const d = districtByAr(ar);
  const pts = parcels
    .filter((p) => (d.match as readonly string[]).includes(p.district_en))
    .map((p) => [p.lat, p.lng] as [number, number]);
  if (!pts.length) return null;
  const lat = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const lng = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  // buffer: ring of points around each parcel (~1.2 km), then convex hull
  const R = 0.011;
  const ring: [number, number][] = [];
  for (const [a, b] of pts) for (let k = 0; k < 12; k++) {
    const t = (k / 12) * Math.PI * 2;
    ring.push([a + R * Math.sin(t), b + R * Math.cos(t) * 1.1]);
  }
  return { center: [lat, lng] as [number, number], outline: hull(ring) };
}

function hull(points: [number, number][]) {
  const p = [...points].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const cross = (o: number[], a: number[], b: number[]) => (a[1]! - o[1]!) * (b[0]! - o[0]!) - (a[0]! - o[0]!) * (b[1]! - o[1]!);
  const lo: [number, number][] = [], up: [number, number][] = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2]!, lo[lo.length - 1]!, q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length >= 2 && cross(up[up.length - 2]!, up[up.length - 1]!, q) <= 0) up.pop(); up.push(q); }
  return [...lo.slice(0, -1), ...up.slice(0, -1)];
}
