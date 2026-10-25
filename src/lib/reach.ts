/** Deterministic, illustrative reach shapes — no routing service is connected. */

function seeded(id: string) {
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** Assumed average urban driving speed ≈ 30 km/h → 0.5 km per minute. */
const KM_PER_MIN = 0.5;

export function reachPolygon(id: string, lat: number, lng: number, minutes: number): [number, number][] {
  const rnd = seeded(`${id}-${minutes}`);
  const km = minutes * KM_PER_MIN;
  const pts: [number, number][] = [];
  const n = 18;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 2 * Math.PI;
    const r = km * (0.75 + rnd() * 0.45);
    pts.push([lat + (r / 111) * Math.sin(a), lng + (r / (111 * Math.cos((lat * Math.PI) / 180))) * Math.cos(a)]);
  }
  return pts;
}

export function competitorPoints(id: string, lat: number, lng: number, count = 3): [number, number][] {
  const rnd = seeded(`${id}-comp`);
  return Array.from({ length: count }, () => {
    const a = rnd() * 2 * Math.PI;
    const km = 1.5 + rnd() * 5;
    return [lat + (km / 111) * Math.sin(a), lng + (km / 101) * Math.cos(a)] as [number, number];
  });
}

export const REACH_MINUTES = [15, 10, 5] as const;
