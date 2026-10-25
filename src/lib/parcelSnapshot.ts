// Pure helpers for parcel map snapshots (Mapbox Static Images API).
// Every card thumbnail is a real map at the parcel location — deterministic URL,
// no network inside the pure module, and the fallback lives in the component.

const PUBLIC_TOKEN = import.meta.env["VITE_LOVABLE_CONNECTOR_MAPBOX_PUBLIC_TOKEN"] as string | undefined;
const STATIC_BASE = "https://api.mapbox.com/styles/v1/mapbox";

/** Violet from the design tokens (--primary oklch 0.52 0.26 285). */
const PIN_HEX = "7c3aed";

/** Smallest highlight circle so tiny parcels stay visible at zoom 14. */
export const MIN_RADIUS_M = 80;

/**
 * Encodes [lng, lat] points with the Google polyline algorithm at 1e5 precision
 * (the format the Static API `path` overlay expects).
 */
export function encodePolyline(points: [number, number][]): string {
  let out = "";
  let prevLat = 0, prevLng = 0;
  for (const [lng, lat] of points) {
    const nums = [Math.round(lat * 1e5), Math.round(lng * 1e5)];
    const prevs = [prevLat, prevLng];
    for (let i = 0; i < 2; i++) {
      let v = nums[i] - prevs[i];
      v = v < 0 ? ~(v << 1) : v << 1;
      while (v >= 0x20) {
        out += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
        v >>= 5;
      }
      out += String.fromCharCode(v + 63);
    }
    prevLat = nums[0]; prevLng = nums[1];
  }
  return out;
}

/** Circle of `radiusM` meters around (lng, lat), 32 segments + closing point. */
export function circlePoints(lng: number, lat: number, radiusM: number): [number, number][] {
  const dLat = radiusM / 111320;
  const dLng = radiusM / (111320 * Math.cos((lat * Math.PI) / 180));
  const pts: [number, number][] = [];
  for (let i = 0; i <= 32; i++) {
    const a = (i / 32) * 2 * Math.PI;
    pts.push([lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)]);
  }
  return pts;
}

/** Visible radius for a parcel: its real footprint, but never below MIN_RADIUS_M. */
export function parcelRadiusM(areaSqm: number | null | undefined): number {
  if (!areaSqm || areaSqm <= 0) return MIN_RADIUS_M;
  return Math.max(MIN_RADIUS_M, Math.sqrt(areaSqm / Math.PI));
}

/**
 * URL of a static street map centered on the parcel, with a translucent
 * footprint circle and a pin. Width/height are CSS-independent (2x DPR baked in).
 */
export function snapshotUrl(
  p: { lng: number; lat: number; area_sqm?: number | null },
  opts: { width: number; height: number; zoom?: number; style?: string },
): string | null {
  if (!PUBLIC_TOKEN) return null;
  const { width, height, zoom = 14.5, style = "streets-v12" } = opts;
  const r = parcelRadiusM(p.area_sqm);
  const circle = encodeURIComponent(encodePolyline(circlePoints(p.lng, p.lat, r)));
  const marker = `pin-s+${PIN_HEX}(${p.lng.toFixed(5)},${p.lat.toFixed(5)})`;
  // Static API path syntax: path-{strokeWidth}+{color}-{opacity}(enc:polyline).
  // A wide translucent stroke reads as a soft glow around the footprint.
  const glow = `path-16+${PIN_HEX}-0.16(enc:${circle})`;
  const edge = `path-2+${PIN_HEX}-0.8(enc:${circle})`;
  return `${STATIC_BASE}/${style}/static/${marker},${glow},${edge}/${p.lng.toFixed(5)},${p.lat.toFixed(5)},${zoom}/${width}x${height}@2x?access_token=${PUBLIC_TOKEN}&attribution=false&logo=false`;
}
