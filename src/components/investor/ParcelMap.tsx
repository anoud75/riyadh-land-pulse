import { Circle, CircleMarker, LayersControl, MapContainer, Polygon, TileLayer, Tooltip, useMap } from "react-leaflet";
import { Fragment, useEffect } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { Area, Parcel } from "@/data/types";
import { AREA_AR } from "@/data/types";
import { parcelColor, parcelRadius, type MapLayer } from "@/lib/mapLayers";
import { competitorPoints, reachPolygon, REACH_MINUTES } from "@/lib/reach";
import { aggregateDistricts, districtColor, districtRadius, type DistrictAgg } from "@/lib/mapStats";

const RIYADH: [number, number] = [24.7136, 46.6753];
const AREAS: Area[] = ["North", "South", "East", "West", "Central"];

function FlyTo({ p }: { p: Parcel | null }) {
  const map = useMap();
  useEffect(() => {
    if (p) map.flyTo([p.lat, p.lng], 15, { duration: 0.8 });
  }, [p, map]);
  return null;
}

/** Soft region names (الشمال، الشرق…) floating over each area's parcel cloud. */
function RegionLabels({ parcels }: { parcels: Parcel[] }) {
  return (
    <>
      {AREAS.map((a) => {
        const list = parcels.filter((p) => p.area_of_city === a);
        if (!list.length) return null;
        const lat = list.reduce((s, p) => s + p.lat, 0) / list.length;
        const lng = list.reduce((s, p) => s + p.lng, 0) / list.length;
        return (
          <CircleMarker key={a} center={[lat, lng]} radius={0} interactive={false}>
            <Tooltip permanent direction="center" className="region-label">
              {AREA_AR[a]}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}

export default function ParcelMap({
  parcels,
  layer,
  mode,
  selected,
  onSelect,
  onSelectDistrict,
  mapRef,
  highlight,
}: {
  parcels: Parcel[];
  layer: MapLayer;
  mode: "parcels" | "districts";
  selected: Parcel | null;
  onSelect: (p: Parcel | null) => void;
  onSelectDistrict: (d: DistrictAgg) => void;
  mapRef: React.RefObject<LeafletMap | null>;
  highlight?: [number, number][] | null;
}) {
  const districts = mode === "districts" ? aggregateDistricts(parcels) : [];
  return (
    <MapContainer ref={mapRef} center={RIYADH} zoom={11} maxZoom={19} className="size-full" scrollWheelZoom zoomControl={false}>
      <LayersControl position="topleft">
        <LayersControl.BaseLayer checked name="قمر صناعي">
          <TileLayer maxZoom={19} attribution="Imagery &copy; Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="شوارع">
          <TileLayer maxZoom={19} attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="خريطة فاتحة">
          <TileLayer maxZoom={16} attribution="Tiles &copy; Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}" />
        </LayersControl.BaseLayer>
        <LayersControl.Overlay checked name="أسماء الشوارع والأحياء">
          <TileLayer maxZoom={19} zIndex={500}
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" />
        </LayersControl.Overlay>
        <LayersControl.Overlay checked name="الطرق">
          <TileLayer maxZoom={19} zIndex={499}
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}" />
        </LayersControl.Overlay>
      </LayersControl>

      {mode === "districts" &&
        districts.map((d) => {
          const color = districtColor(d.medianPrice);
          return (
            <Fragment key={d.district_en}>
              {d.hull.length >= 3 && (
                <Polygon positions={d.hull} pathOptions={{ color, weight: 1, fillColor: color, fillOpacity: 0.06 }} />
              )}
              <Circle
                center={[d.lat, d.lng]}
                radius={districtRadius(d.count)}
                pathOptions={{ color, weight: 1.5, fillColor: color, fillOpacity: 0.4 }}
                eventHandlers={{ click: () => onSelectDistrict(d) }}
              >
                <Tooltip permanent direction="center" className="district-label">
                  {`${d.district_ar} · ${d.count}`}
                </Tooltip>
              </Circle>
            </Fragment>
          );
        })}

      {mode === "parcels" && <RegionLabels parcels={parcels} />}

      {mode === "parcels" && selected &&
        REACH_MINUTES.map((m, i) => (
          <Polygon
            key={`${selected.parcel_id}-${m}`}
            positions={reachPolygon(selected.parcel_id, selected.lat, selected.lng, m)}
            pathOptions={{ color: "#6d28d9", weight: 1, fillColor: "#7c3aed", fillOpacity: 0.08 + i * 0.07 }}
          >
            <Tooltip sticky>{`${m} دقيقة (تقدير)`}</Tooltip>
          </Polygon>
        ))}
      {mode === "parcels" && selected &&
        competitorPoints(selected.parcel_id, selected.lat, selected.lng).map((c, i) => (
          <CircleMarker key={i} center={c} radius={6} pathOptions={{ color: "#111827", fillColor: "#ffffff", fillOpacity: 1, weight: 2 }}>
            <Tooltip permanent direction="top" offset={[0, -6]}>منافس</Tooltip>
          </CircleMarker>
        ))}
      {mode === "parcels" &&
        parcels.map((p) => {
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
      {highlight && (
        <Polygon positions={highlight} pathOptions={{ color: "#e0393e", weight: 3, fillColor: "#e0393e", fillOpacity: 0.12 }} />
      )}
      <FlyTo p={mode === "parcels" ? selected : null} />
    </MapContainer>
  );
}
