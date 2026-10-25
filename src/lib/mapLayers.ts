import type { Parcel } from "@/data/types";
import { getSegmentStats, isPriced } from "./portfolioEngine";

export type MapLayer = "days" | "deal" | "street" | "price";

export const LAYER_LABELS: Record<MapLayer, string> = {
  days: "مدة العرض",
  deal: "نوع الصفقة",
  street: "عرض الشارع",
  price: "وسيط سعر المتر",
};

/** Data-viz palette for map marks (kept here so every layer and legend agree). */
export const MAP_COLORS = {
  sale: "#2563eb",
  lease: "#0d9488",
  unavailable: "#9ca3af",
  noData: "#d1d5db",
  scale: ["#dbeafe", "#93c5fd", "#3b82f6", "#1d4ed8", "#1e3a8a"],
  below: "#0d9488",
  near: "#a3a3a3",
  above: "#dc2626",
};

/** Radius in metres: grows with the square root of area so big plots don't swamp the map. */
export function parcelRadius(p: Parcel) {
  return Math.round(80 + Math.sqrt(p.area_sqm) * 3);
}

const bucket = (v: number, edges: number[]) => {
  const i = edges.findIndex((e) => v < e);
  return MAP_COLORS.scale[i === -1 ? edges.length : i]!;
};

export function dealColor(p: Parcel) {
  if (p.status !== "available") return MAP_COLORS.unavailable;
  return p.listing_type === "sale" ? MAP_COLORS.sale : MAP_COLORS.lease;
}

export function parcelColor(p: Parcel, layer: MapLayer, parcels: Parcel[]): string {
  switch (layer) {
    case "deal":
      return dealColor(p);
    case "days":
      return bucket(p.days_on_market, [30, 60, 90, 150]);
    case "street":
      return bucket(p.street_width_m, [15, 20, 30, 50]);
    case "price": {
      if (!isPriced(p)) return MAP_COLORS.noData;
      const s = getSegmentStats(parcels, p.area_of_city, p.land_type, p.listing_type);
      if (s.insufficientSample || !s.medianPricePerSqm) return MAP_COLORS.noData;
      const d = (p.price_per_sqm_sar! - s.medianPricePerSqm) / s.medianPricePerSqm;
      return d < -0.05 ? MAP_COLORS.below : d > 0.05 ? MAP_COLORS.above : MAP_COLORS.near;
    }
  }
}

export const LEGENDS: Record<MapLayer, { color: string; label: string }[]> = {
  deal: [
    { color: MAP_COLORS.sale, label: "للبيع" },
    { color: MAP_COLORS.lease, label: "للإيجار" },
    { color: MAP_COLORS.unavailable, label: "غير متاحة" },
  ],
  days: ["أقل من 30", "30–60", "60–90", "90–150", "+150 يومًا"].map((label, i) => ({ color: MAP_COLORS.scale[i]!, label })),
  street: ["أقل من 15", "15–20", "20–30", "30–50", "+50 م"].map((label, i) => ({ color: MAP_COLORS.scale[i]!, label })),
  price: [
    { color: MAP_COLORS.below, label: "تحت الوسيط" },
    { color: MAP_COLORS.near, label: "قرب الوسيط" },
    { color: MAP_COLORS.above, label: "فوق الوسيط" },
    { color: MAP_COLORS.noData, label: "لا وسيط / لا سعر" },
  ],
};
