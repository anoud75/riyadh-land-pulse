import type { Parcel } from "./types";
import { isClosed, isPriced, median, MIN_SAMPLE } from "@/lib/portfolioEngine";

export const FOOTPRINT_DISTRICTS = [
  { ar: "الملقا", match: ["Al Malqa"], seed: 1.25 },
  { ar: "النرجس", match: ["Al Narjis"], seed: 1.1 },
  { ar: "الياسمين", match: ["Al Yasmin"], seed: 1.15 },
  { ar: "قرطبة", match: ["Qurtubah"], seed: 0.9 },
  { ar: "الرمال", match: ["Al Rimal"], seed: 0.8 },
  { ar: "ظهرة لبن", match: ["Dhahrat Laban"], seed: 0.85 },
  { ar: "العريجاء", match: ["Al Uraija Al Gharbiyah", "Al Uraija Al Wusta"], seed: 0.7 },
] as const;

export const YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
export const DOM_BUCKETS = [
  { label: "<30", max: 30 },
  { label: "30–60", max: 60 },
  { label: "60–90", max: 90 },
  { label: "90–150", max: 150 },
  { label: "+150", max: Infinity },
];
export const AGE_BANDS = ["0–14", "15–24", "25–34", "35–44", "45–54", "55–64", "+65"];

/** Illustrative growth curve (index 2019 = 1). Not from GASTAT or registered deeds. */
const GROWTH = [1, 1.03, 1.1, 1.22, 1.3, 1.38, 1.45, 1.5];
const AGE_SHAPE = [0.24, 0.15, 0.2, 0.17, 0.11, 0.08, 0.05];

export function districtByAr(ar: string) {
  return FOOTPRINT_DISTRICTS.find((d) => d.ar === ar);
}

export function getDistrictFootprint(parcels: Parcel[], ar: string, year: number) {
  const d = districtByAr(ar) ?? FOOTPRINT_DISTRICTS[0];
  const inD = parcels.filter((p) => (d.match as readonly string[]).includes(p.district_en));

  // Arm 1 — price/m² by year. 2026 uses real asking/closed sale prices where present.
  const real = (land: "residential" | "commercial") =>
    median(inD.filter((p) => p.land_type === land && p.listing_type === "sale" && isPriced(p)).map((p) => p.price_per_sqm_sar!));
  const base = { residential: 3200 * d.seed, commercial: 4200 * d.seed };
  const price = YEARS.map((y, i) => {
    const r = y === 2026 ? real("residential") : null;
    const c = y === 2026 ? real("commercial") : null;
    return {
      year: y,
      residential: Math.round(r ?? (base.residential * GROWTH[i]!) / 10) * (r ? 1 : 10),
      commercial: Math.round(c ?? (base.commercial * GROWTH[i]!) / 10) * (c ? 1 : 10),
      residentialReal: r != null,
      commercialReal: c != null,
    };
  });

  // Arm 2 — real closed deals by days on market.
  const closed = inD.filter(isClosed);
  const deals = DOM_BUCKETS.map((b, i) => {
    const min = i === 0 ? 0 : DOM_BUCKETS[i - 1]!.max;
    const inB = closed.filter((p) => p.days_on_market >= min && p.days_on_market < b.max);
    return { label: b.label, sale: inB.filter((p) => p.listing_type === "sale").length, lease: inB.filter((p) => p.listing_type === "lease").length };
  });
  const medianDays = closed.length >= MIN_SAMPLE ? median(closed.map((p) => p.days_on_market)) : null;

  // Arm 3 — illustrative population pyramid, scaled by year.
  const total = Math.round(42000 * d.seed * (1 + (year - 2019) * 0.025));
  const population = AGE_BANDS.map((band, i) => {
    const n = total * AGE_SHAPE[i]!;
    const maleShare = i >= 2 && i <= 4 ? 0.56 : 0.51;
    return { band, male: Math.round(n * maleShare), female: Math.round(n * (1 - maleShare)) };
  });

  return { district: d.ar, year, price, deals, closedDeals: closed.length, medianDays, population, populationTotal: total, parcelsInDistrict: inD.length };
}
export type DistrictFootprint = ReturnType<typeof getDistrictFootprint>;
