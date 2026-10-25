import type { Parcel } from "@/data/types";
import { Button } from "@/components/ui/button";
import { LAND_AR } from "@/data/types";
import { STATUS_AR } from "./format";
import { MAP_COLORS, parcelColor, type MapLayer } from "@/lib/mapLayers";

const priceFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
function priceLabel(p: Parcel) {
  const value = p.total_price_sar;
  if (value == null || value <= 0) return "السعر عند الطلب";
  return value >= 1_000_000 ? `${priceFormat.format(value / 1_000_000)} مليون` : value >= 1_000 ? `${priceFormat.format(value / 1_000)} ألف` : priceFormat.format(value);
}

export function ParcelMapMarker({ parcel, parcels, layer, selected, onSelect }: {
  parcel: Parcel; parcels: Parcel[]; layer: MapLayer; selected: boolean; onSelect: () => void;
}) {
  const color = parcelColor(parcel, layer, parcels);
  const tones = [MAP_COLORS.sale, MAP_COLORS.lease, MAP_COLORS.unavailable, MAP_COLORS.noData, ...MAP_COLORS.scale, MAP_COLORS.below, MAP_COLORS.near, MAP_COLORS.above];
  const label = priceLabel(parcel);
  return <Button variant="ghost" className="parcel-price-marker" data-tone={tones.indexOf(color)} data-selected={selected} data-unavailable={parcel.status !== "available"}
    aria-label={`${parcel.district_ar}، ${parcel.parcel_id}، ${label} ريال${parcel.listing_type === "lease" ? " سنويًا" : ""}، ${STATUS_AR[parcel.status]}`} aria-pressed={selected} onClick={onSelect}>
    <span className="parcel-pin-halo" aria-hidden="true" />
    <span className="parcel-pin-dot" aria-hidden="true" />
    <span className="parcel-price-content" dir="rtl">
      <span className="parcel-price-top"><span className="parcel-price-status" />{label}<span className="parcel-price-unit">ر.س{parcel.listing_type === "lease" ? " / سنة" : ""}</span></span>
      <span className="parcel-price-detail">{LAND_AR[parcel.land_type]} · {parcel.area_sqm.toLocaleString("en-US")} م²{parcel.status !== "available" ? ` · ${STATUS_AR[parcel.status]}` : ""}</span>
    </span>
  </Button>;
}