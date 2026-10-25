/** Pure site-suitability scoring for three use cases. Inputs come from the places provider; no network here. */
export type UseCase = "business" | "living" | "commercial";
export type PlaceCategory = "hospital" | "pharmacy" | "cafe" | "restaurant" | "school" | "supermarket" | "gym" | "mosque" | "park" | "shopping_mall";

export const CATEGORY_AR: Record<PlaceCategory, string> = {
  hospital: "مستشفى", pharmacy: "صيدلية", cafe: "كافيه", restaurant: "مطعم", school: "مدرسة",
  supermarket: "سوبرماركت", gym: "نادي رياضي", mosque: "مسجد", park: "حديقة", shopping_mall: "مركز تسوق",
};
export const BUSINESS_CATEGORIES: PlaceCategory[] = ["hospital", "pharmacy", "cafe", "restaurant", "school", "supermarket", "gym"];
export const LIVING_SERVICES: PlaceCategory[] = ["hospital", "school", "supermarket", "mosque", "pharmacy", "park", "cafe"];
export const FOOTFALL_CATEGORIES: PlaceCategory[] = ["restaurant", "cafe", "shopping_mall"];

/** Business weights: how much a long drive to the nearest competitor matters vs. few competitors nearby. */
export const BUSINESS_WEIGHTS: Record<PlaceCategory, { distance: number; density: number }> = {
  hospital: { distance: 0.7, density: 0.3 }, pharmacy: { distance: 0.4, density: 0.6 }, school: { distance: 0.5, density: 0.5 },
  cafe: { distance: 0.25, density: 0.75 }, restaurant: { distance: 0.25, density: 0.75 }, supermarket: { distance: 0.5, density: 0.5 },
  gym: { distance: 0.4, density: 0.6 }, mosque: { distance: 0.5, density: 0.5 }, park: { distance: 0.5, density: 0.5 }, shopping_mall: { distance: 0.5, density: 0.5 },
};

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const r = (v: number) => Math.round(v);

export interface ServiceCheck { category: PlaceCategory; label_ar: string; minutes: number | null; count: number }
export interface SiteResult {
  district: string; useCase: UseCase; category: PlaceCategory | null;
  score: number | null; label: string; reasons: string[];
  found: number; nearestMin: number | null; within10: number;
  services?: ServiceCheck[]; medianPpm: number | null; riyadhMedianPpm: number | null; parcelIds: string[];
}

export function businessLabel(s: number) { return s >= 70 ? "فرصة عالية" : s >= 45 ? "فرصة متوسطة" : "مشبعة"; }
export function livingLabel(s: number) { return s >= 70 ? "ممتاز للسكن" : s >= 45 ? "جيد للسكن" : "ضعيف للسكن"; }
export function commercialLabel(s: number) { return s >= 70 ? "حركة عالية" : s >= 45 ? "حركة متوسطة" : "حركة ضعيفة"; }

/** Business gap: long drive to the nearest competitor and few competitors within 10 minutes score high. */
export function scoreBusiness(category: PlaceCategory, input: { found: number; nearestMin: number | null; within10: number }) {
  if (input.found === 0 || input.nearestMin == null) return { score: null, label: "بيانات غير كافية" };
  const w = BUSINESS_WEIGHTS[category];
  const dist = clamp(input.nearestMin / 30);
  const dens = clamp(1 - input.within10 / 10);
  const score = r(100 * (w.distance * dist + w.density * dens));
  return { score, label: businessLabel(score) };
}

/** Minutes → 0..1: 5 min or less is full marks, 20 min or more is zero. */
export function serviceScore(min: number | null) { return min == null ? 0 : clamp((20 - min) / 15); }

/** Living: 80 points from service drive times, 20 from price vs Riyadh median (cheaper scores higher). */
export function scoreLiving(services: ServiceCheck[], medianPpm: number | null, riyadhMedianPpm: number | null) {
  if (!services.length || services.every((s) => s.minutes == null)) return { score: null, label: "بيانات غير كافية" };
  const svc = services.reduce((a, s) => a + serviceScore(s.minutes), 0) / services.length;
  if (medianPpm == null || !riyadhMedianPpm) { const score = r(100 * svc); return { score, label: livingLabel(score) }; }
  const price = clamp((riyadhMedianPpm - medianPpm) / riyadhMedianPpm + 0.5);
  const score = r(80 * svc + 20 * price);
  return { score, label: livingLabel(score) };
}

/** Commercial: footfall places within 10 minutes (70) and how fast district land moves (30). */
export function scoreCommercial(footfall10: number, found: number, avgDom: number | null) {
  if (found === 0) return { score: null, label: "بيانات غير كافية" };
  const foot = clamp(footfall10 / 20);
  const speed = avgDom == null ? 0.5 : clamp(1 - avgDom / 180);
  const score = r(70 * foot + 30 * speed);
  return { score, label: commercialLabel(score) };
}

export function rankResults<T extends { score: number | null }>(rs: T[]): T[] {
  return [...rs].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
}

/** Detects the use case and category from an Arabic/English question. */
export function detectUseCase(q: string): { useCase: UseCase; category: PlaceCategory | null } {
  const s = q.replace(/[أإآ]/g, "ا");
  if (/(اسكن|سكن|اعيش|للعيش|عائل|بيت|منزل|فيلا|live|home)/i.test(s) && !/(افتح|مشروع|ابني مستشفى)/.test(s)) return { useCase: "living", category: null };
  const map: [RegExp, PlaceCategory][] = [[/مستشف|عياد|hospital/i, "hospital"], [/صيدل|pharm/i, "pharmacy"], [/كوفي|كافي|قهو|cafe|coffee/i, "cafe"], [/مطعم|restaurant/i, "restaurant"], [/مدرس|school/i, "school"], [/سوبر|بقال|تموين|supermarket/i, "supermarket"], [/نادي|جيم|gym/i, "gym"]];
  for (const [re, c] of map) if (re.test(s)) return { useCase: "business", category: c };
  if (/(محل|تجاري|معرض|ايجار تجاري|retail)/.test(s)) return { useCase: "commercial", category: null };
  return { useCase: "living", category: null };
}
