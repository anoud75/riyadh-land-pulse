import raw from "@/data/aqarListings.json";
import type { Area, Parcel } from "@/data/types";

/** Imported Aqar sample (static file, not live). Prices are asking prices. */
export const AQAR_SOURCE = "أسعار عرض — بيانات مستوردة من عقار، غير متصلة مباشرة";

export type OfferKind = "sale" | "rent" | "unknown";
export interface MarketListing {
  id: number; title: string; city: string; district: string; price: number; area: number;
  lat: number; lng: number; kind: OfferKind; url: string;
}

interface RawListing { id: number; title: string; city: string; district: string; price: number | null; area: number | null; location: { lat: number; lng: number } | null; path?: string | null }

/** Sale vs rent read only from the listing title text. */
export function offerKind(title: string): OfferKind {
  if (title.includes("للإيجار") || title.includes("للايجار")) return "rent";
  if (title.includes("للبيع")) return "sale";
  return "unknown";
}

const stripHay = (d: string) => d.replace(/^حي\s+/, "").trim();

export function normalizeListings(rows: RawListing[] = raw as RawListing[]): MarketListing[] {
  return rows.filter((r) => r.location && r.price != null).map((r) => ({
    id: r.id, title: r.title, city: r.city, district: stripHay(r.district ?? ""), price: r.price!, area: r.area ?? 0,
    lat: r.location!.lat, lng: r.location!.lng, kind: offerKind(r.title),
    url: r.path ? `https://sa.aqar.fm${r.path}` : `https://sa.aqar.fm/${r.id}`,
  }));
}

export const MARKET_LISTINGS = normalizeListings();

/** Area of Riyadh = area of the nearest Sarj parcel (no invented boundaries). */
export function areaOfCity(lat: number, lng: number, parcels: Parcel[]): Area | null {
  let best: Parcel | null = null, bd = Infinity;
  for (const p of parcels) { const d = (p.lat - lat) ** 2 + (p.lng - lng) ** 2; if (d < bd) { bd = d; best = p; } }
  return best?.area_of_city ?? null;
}

export interface RentalBenchmark {
  comparables: MarketListing[]; min: number | null; max: number | null; count: number;
  scope: "district" | "area" | "none"; source: string;
}

export function getMarketRentalYield(district: string, area_of_city: Area, parcels: Parcel[], listings = MARKET_LISTINGS): RentalBenchmark {
  const rents = listings.filter((l) => l.city === "الرياض" && l.kind === "rent");
  const d = stripHay(district);
  let comps = rents.filter((l) => l.district === d);
  let scope: RentalBenchmark["scope"] = "district";
  if (!comps.length) { comps = rents.filter((l) => areaOfCity(l.lat, l.lng, parcels) === area_of_city); scope = "area"; }
  if (!comps.length) return { comparables: [], min: null, max: null, count: 0, scope: "none", source: AQAR_SOURCE };
  const prices = comps.map((c) => c.price);
  return { comparables: comps, min: Math.min(...prices), max: Math.max(...prices), count: comps.length, scope, source: AQAR_SOURCE };
}

const AREA_AR: Record<Area, string> = { North: "شمال", South: "جنوب", East: "شرق", West: "غرب", Central: "وسط" } as Record<Area, string>;
const n = (x: number) => x.toLocaleString("en-US");

export interface MarketInsight { applicable: boolean; text: string; benchmark: RentalBenchmark }

export function buildMarketInsight(p: Parcel, parcels: Parcel[]): MarketInsight {
  const b = getMarketRentalYield(p.district_ar, p.area_of_city, parcels);
  const applicable = p.land_type === "residential";
  if (!applicable) return { applicable, text: "", benchmark: b };
  if (b.scope === "none") return { applicable, text: "لا توجد إعلانات إيجار كافية في العينة لهذه الجهة.", benchmark: b };
  const where = b.scope === "district" ? `حي ${p.district_ar}` : `أحياء ${AREA_AR[p.area_of_city] ?? ""} الرياض`;
  const names = [...new Set(b.comparables.map((c) => c.district))].join(" و");
  const range = b.min === b.max ? `${n(b.min!)} ريال` : `${n(b.min!)} – ${n(b.max!)} ريال`;
  return {
    applicable, benchmark: b,
    text: `مؤشر السوق الخارجي: بناءً على عينة السوق الحالية، يصل سعر الإيجار المعروض للشقق في ${where} (مثل ${names}) إلى ${range}. بناء مجمع مصغر هنا يوفر عائدًا استثماريًا تنافسيًا.`,
  };
}
