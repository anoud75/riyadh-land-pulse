import { Circle, CircleMarker, MapContainer, Polygon, TileLayer, Tooltip, useMap } from "react-leaflet";
import { useEffect } from "react";
import type { Parcel } from "@/data/types";
import { parcelColor, parcelRadius, type MapLayer } from "@/lib/mapLayers";
import { competitorPoints, reachPolygon, REACH_MINUTES } from "@/lib/reach";

const RIYADH: [number, number] = [24.7136, 46.6753];

function FlyTo({ p }: { p: Parcel | null }) {
  const map = useMap();
  useEffect(() => {
    if (p) map.flyTo([p.lat, p.lng], 12, { duration: 0.6 });
  }, [p, map]);
  return null;
}

export default function ParcelMap({
  parcels,
  layer,
  selected,
  onSelect,
}: {
  parcels: Parcel[];
  layer: MapLayer;
  selected: Parcel | null;
  onSelect: (p: Parcel | null) => void;
}) {
  return (
    <MapContainer center={RIYADH} zoom={11} className="size-full" scrollWheelZoom>
      <TileLayer
        attribution='Tiles &copy; Esri'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
      />
      {selected &&
        REACH_MINUTES.map((m, i) => (
          <Polygon
            key={`${selected.parcel_id}-${m}`}
            positions={reachPolygon(selected.parcel_id, selected.lat, selected.lng, m)}
            pathOptions={{ color: "#6d28d9", weight: 1, fillColor: "#7c3aed", fillOpacity: 0.08 + i * 0.07 }}
          >
            <Tooltip sticky>{`${m} دقيقة (تقدير)`}</Tooltip>
          </Polygon>
        ))}
      {selected &&
        competitorPoints(selected.parcel_id, selected.lat, selected.lng).map((c, i) => (
          <CircleMarker key={i} center={c} radius={6} pathOptions={{ color: "#111827", fillColor: "#ffffff", fillOpacity: 1, weight: 2 }}>
            <Tooltip permanent direction="top" offset={[0, -6]}>منافس</Tooltip>
          </CircleMarker>
        ))}
      {parcels.map((p) => {
        const color = parcelColor(p, layer, parcels);
        const isSel = selected?.parcel_id === p.parcel_id;
        return (
          <Circle
            key={p.parcel_id}
            center={[p.lat, p.lng]}
            radius={parcelRadius(p)}
            pathOptions={{ color: isSel ? "#111827" : color, weight: isSel ? 3 : 1, fillColor: color, fillOpacity: 0.7 }}
            eventHandlers={{ click: () => onSelect(p) }}
          >
            <Tooltip>{`${p.district_ar} · ${p.parcel_id}`}</Tooltip>
          </Circle>
        );
      })}
      <FlyTo p={selected} />
    </MapContainer>
  );
}
