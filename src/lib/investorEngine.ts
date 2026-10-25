import type { Parcel } from "@/data/types";
import { getSegmentStats, isAvailable, isPriced, type SegmentStats } from "./portfolioEngine";

export interface ParcelInsight {
  parcel: Parcel;
  segment: SegmentStats;
  priceDeltaPct: number | null;
  domMultiplier: number | null;
}

export function getParcelInsight(parcels: Parcel[], id: string): ParcelInsight | null {
  const parcel = parcels.find((p) => p.parcel_id === id);
  if (!parcel) return null;
  const segment = getSegmentStats(parcels, parcel.area_of_city, parcel.land_type, parcel.listing_type);
  const priceDeltaPct =
    segment.medianPricePerSqm && isPriced(parcel)
      ? Math.round(((parcel.price_per_sqm_sar! - segment.medianPricePerSqm) / segment.medianPricePerSqm) * 100)
      : null;
  const domMultiplier = segment.medianClosingDays
    ? Math.round((parcel.days_on_market / segment.medianClosingDays) * 10) / 10
    : null;
  return { parcel, segment, priceDeltaPct, domMultiplier };
}

export function distanceKm(a: Parcel, b: Parcel) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function getNearbyParcels(parcels: Parcel[], id: string, n = 3) {
  const origin = parcels.find((p) => p.parcel_id === id);
  if (!origin) return [];
  return parcels
    .filter((p) => p.parcel_id !== id && isAvailable(p))
    .map((p) => ({ parcel: p, km: Math.round(distanceKm(origin, p) * 10) / 10 }))
    .sort((a, b) => a.km - b.km)
    .slice(0, n);
}

export function compareParcels(parcels: Parcel[], ids: string[]) {
  return ids.map((id) => getParcelInsight(parcels, id)).filter((x): x is ParcelInsight => !!x);
}

export function computeHeadroom(budget: number | null, parcel: Parcel): number | null {
  if (budget == null || !isPriced(parcel)) return null;
  return budget - parcel.total_price_sar!;
}

/** Same-segment available parcels within budget with a wider street than the chosen one. */
export function suggestAlternatives(parcels: Parcel[], parcel: Parcel, budget: number | null) {
  return parcels
    .filter(
      (p) =>
        p.parcel_id !== parcel.parcel_id &&
        isAvailable(p) &&
        isPriced(p) &&
        p.area_of_city === parcel.area_of_city &&
        p.land_type === parcel.land_type &&
        p.listing_type === parcel.listing_type &&
        p.street_width_m > parcel.street_width_m &&
        (budget == null || p.total_price_sar! <= budget),
    )
    .sort((a, b) => b.street_width_m - a.street_width_m);
}
