// GASTAT source tables used across the app (price index + Riyadh population).
// Values are annual means of quarters; each figure keeps its published year so
// every derived number can be traced back to سرج, GASTAT, or an estimate.

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

/** GASTAT population estimates: Riyadh region total + national age-band shares (2019–2022). */
export const GASTAT_POP: Record<number, { riyadh: number; shares: number[] }> = {
  2019: { riyadh: 7979262, shares: [0.2602, 0.1449, 0.2356, 0.1846, 0.102, 0.0482, 0.0245] },
  2020: { riyadh: 8422408, shares: [0.252, 0.1457, 0.2387, 0.1868, 0.1021, 0.0498, 0.0248] },
  2021: { riyadh: 8175378, shares: [0.2558, 0.1472, 0.2319, 0.187, 0.1008, 0.0509, 0.0264] },
  2022: { riyadh: 8591748, shares: [0.2451, 0.1496, 0.2374, 0.1902, 0.0999, 0.0511, 0.0268] },
};

export type SeriesSource = "sarj" | "gastat" | "estimate";
