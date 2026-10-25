/** Mapbox places + drive times through the connector gateway. Server only. */
import type { PlaceCategory } from "./siteSuitability";

const GATEWAY = "https://connector-gateway.lovable.dev/mapbox";
export interface Poi { name: string; category: PlaceCategory; lng: number; lat: number }

const cache = new Map<string, Promise<unknown>>();
function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) cache.set(key, fn().catch((e) => { cache.delete(key); throw e; }));
  return cache.get(key) as Promise<T>;
}

async function call(path: string, params: Record<string, string>) {
  const lov = process.env["LOVABLE_API_KEY"]; const key = process.env["MAPBOX_API_KEY"];
  if (!lov || !key) throw new Error("Mapbox secret token not configured");
  const res = await fetch(`${GATEWAY}${path}?${new URLSearchParams(params)}`, { headers: { Authorization: `Bearer ${lov}`, "X-Connection-Api-Key": key } });
  if (!res.ok) throw new Error(`Mapbox ${path.split("/")[1]} failed [${res.status}]: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/** Up to 25 places of a category near a point (lng, lat), optionally inside a bbox. */
export function searchPlaces(category: PlaceCategory, center: [number, number], bbox?: [number, number, number, number]): Promise<Poi[]> {
  const key = `s:${category}:${center.map((v) => v.toFixed(3))}`;
  return cached(key, async () => {
    const p: Record<string, string> = { proximity: `${center[0]},${center[1]}`, limit: "25", language: "ar" };
    if (bbox) p["bbox"] = bbox.map((v) => v.toFixed(4)).join(",");
    const j = await call(`/search/searchbox/v1/category/${category}`, p);
    const seen = new Set<string>();
    return (j.features ?? []).map((f: any) => ({ name: String(f.properties?.name ?? ""), category, lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] })) // eslint-disable-line @typescript-eslint/no-explicit-any
      .filter((x: Poi) => { const k = `${x.lng.toFixed(4)},${x.lat.toFixed(4)},${x.name}`; if (seen.has(k)) return false; seen.add(k); return true; });
  });
}

/** Driving minutes from origin to each destination (max 24). null = unreachable. */
export function driveMinutes(origin: [number, number], dests: [number, number][]): Promise<(number | null)[]> {
  if (!dests.length) return Promise.resolve([]);
  const pts = [origin, ...dests.slice(0, 24)];
  const key = `m:${pts.map((p) => p.map((v) => v.toFixed(4)).join(",")).join(";")}`;
  return cached(key, async () => {
    const j = await call(`/directions-matrix/v1/mapbox/driving/${pts.map((p) => `${p[0]},${p[1]}`).join(";")}`, { sources: "0", annotations: "duration" });
    const row: (number | null)[] = j.durations?.[0] ?? [];
    return row.slice(1).map((s) => (s == null ? null : Math.round(s / 60)));
  });
}

/** 10 and 20 minute driving areas as GeoJSON polygons. */
export function isochrone(origin: [number, number]): Promise<GeoJSON.FeatureCollection | null> {
  return cached(`i:${origin.map((v) => v.toFixed(3))}`, async () => {
    try { return await call(`/isochrone/v1/mapbox/driving/${origin[0]},${origin[1]}`, { contours_minutes: "10,20", polygons: "true" }); } catch { return null; }
  });
}
