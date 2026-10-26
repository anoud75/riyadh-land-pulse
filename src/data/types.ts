export type Area = "North" | "South" | "East" | "West" | "Central";
export type LandType = "residential" | "commercial";
export type DealType = "sale" | "lease";
export type ParcelStatus = "available" | "reserved" | "sold" | "leased";

export interface RawParcel {
  parcel_id: string;
  district_en: string;
  district_ar: string;
  area_of_city: Area;
  land_type: LandType;
  listing_type: DealType;
  price_basis: string;
  area_sqm: number;
  price_per_sqm_sar: number | null;
  total_price_sar: number | null;
  street_width_m: number;
  status: ParcelStatus;
  listed_date: string;
  days_on_market: number;
  lat: number;
  lng: number;
}

export interface Parcel extends RawParcel {
  missingPrice: boolean;
  coordinatesCorrected: boolean;
  /** Available, days on market above segment closed median AND price/sqm above segment closed median. */
  isStagnant?: boolean;
}

export interface RawInquiry {
  inquiry_id: string;
  date: string;
  investor_name: string;
  phone: string;
  wants_to: string;
  land_type_wanted: LandType;
  area_of_city_wanted: Area;
  prefers: DealType;
  budget_sar: number | null;
  budget_basis: string;
  intent: string;
  channel: string;
  status: string;
}

export interface Inquiry extends RawInquiry {
  missingBudget: boolean;
  /** Set when in-budget matches exist but are too small for the stated project (e.g. a compound). */
  scaleMismatchWarning?: string | null;
}

export const AREAS: Area[] = ["North", "South", "East", "West", "Central"];
export const LAND_TYPES: LandType[] = ["residential", "commercial"];

export const AREA_AR: Record<Area, string> = {
  North: "الشمال",
  South: "الجنوب",
  East: "الشرق",
  West: "الغرب",
  Central: "الوسط",
};
export const LAND_AR: Record<LandType, string> = { residential: "سكني", commercial: "تجاري" };
export const DEAL_AR: Record<DealType, string> = { sale: "بيع", lease: "إيجار" };
export const SNAPSHOT_DATE = "2026-08-11";
