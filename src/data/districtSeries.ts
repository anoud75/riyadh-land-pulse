import type { Parcel } from "./types";
import { isClosed, isPriced, median, MIN_SAMPLE, projectPopulationTo2026 } from "@/lib/portfolioEngine";

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

/** GASTAT real-estate price index (DPV_RS_EFPI0401, Kingdom, 2023 = 100, annual mean of quarters). */
export const GASTAT_PLOT_INDEX: Record<number, { residential: number; commercial: number }> = {
  2021: { residential: 85.77, commercial: 84.42 },
  2022: { residential: 96.87, commercial: 94.11 },
  2023: { residential: 100, commercial: 100.05 },
  2024: { residential: 101.24, commercial: 106.3 },
  2025: { residential: 101.77, commercial: 113.09 },
};
/** Illustrative pre-2021 back-cast vs 2021 (index not published for those years). */
const PRE_2021 = { 2019: 0.91, 2020: 0.94 } as Record<number, number>;

/** GASTAT population estimates: Riyadh region total + national age-band shares (2019–2022). */
export const GASTAT_POP: Record<number, { riyadh: number; shares: number[] }> = {
  2019: { riyadh: 7979262, shares: [0.2602, 0.1449, 0.2356, 0.1846, 0.102, 0.0482, 0.0245] },
  2020: { riyadh: 8422408, shares: [0.252, 0.1457, 0.2387, 0.1868, 0.1021, 0.0498, 0.0248] },
  2021: { riyadh: 8175378, shares: [0.2558, 0.1472, 0.2319, 0.187, 0.1008, 0.0509, 0.0264] },
  2022: { riyadh: 8591748, shares: [0.2451, 0.1496, 0.2374, 0.1902, 0.0999, 0.0511, 0.0268] },
};
export type SeriesSource = "sarj" | "gastat" | "estimate";

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
  const anchor = { residential: real("residential") ?? base.residential * 1.5, commercial: real("commercial") ?? base.commercial * 1.5 };
  const at = (land: "residential" | "commercial", y: number): { v: number; src: SeriesSource } => {
    const realNow = land === "residential" ? real("residential") : real("commercial");
    if (y === 2026) return { v: Math.round(anchor[land]), src: realNow != null ? "sarj" : "estimate" };
    const idx = GASTAT_PLOT_INDEX[y] ?? GASTAT_PLOT_INDEX[2021]!;
    const v = (anchor[land] * idx[land]) / GASTAT_PLOT_INDEX[2025]![land] * (PRE_2021[y] ?? 1);
    return { v: Math.round(v / 10) * 10, src: GASTAT_PLOT_INDEX[y] ? "gastat" : "estimate" };
  };
  const price = YEARS.map((y) => {
    const r = at("residential", y), c = at("commercial", y);
    return { year: y, residential: r.v, commercial: c.v, residentialSrc: r.src, commercialSrc: c.src, residentialReal: r.src === "sarj", commercialReal: c.src === "sarj" };
  });

  // Arm 2 — real closed deals by days on market.
  const closed = inD.filter(isClosed);
  const deals = DOM_BUCKETS.map((b, i) => {
    const min = i === 0 ? 0 : DOM_BUCKETS[i - 1]!.max;
    const inB = closed.filter((p) => p.days_on_market >= min && p.days_on_market < b.max);
    return { label: b.label, sale: inB.filter((p) => p.listing_type === "sale").length, lease: inB.filter((p) => p.listing_type === "lease").length };
  });
  const medianDays = closed.length >= MIN_SAMPLE ? median(closed.map((p) => p.days_on_market)) : null;

  // Arm 3 — GASTAT Riyadh-region age structure (latest release 2022 carried forward).
  const popYear = Math.min(2022, Math.max(2019, year));
  const g = GASTAT_POP[popYear]!;
  const projected = year >= 2026;
  const total = projected ? projectPopulationTo2026(GASTAT_POP[2022]!.riyadh) : g.riyadh;
  const popSource: SeriesSource = projected ? "estimate" : "gastat";
  const population = AGE_BANDS.map((band, i) => {
    const n = total * g.shares[i]!;
    const maleShare = i >= 2 && i <= 4 ? 0.6 : 0.52; // sex split estimated — not in supplied tables
    return { band, male: Math.round(n * maleShare), female: Math.round(n * (1 - maleShare)) };
  });

  return { district: d.ar, year, price, deals, closedDeals: closed.length, medianDays, population, populationTotal: total, popYear: projected ? 2026 : popYear, popSource, parcelsInDistrict: inD.length };
}
export type DistrictFootprint = ReturnType<typeof getDistrictFootprint>;
