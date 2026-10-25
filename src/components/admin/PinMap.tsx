import { Circle, CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import type { Parcel } from "@/data/types";

const RIYADH: [number, number] = [24.7136, 46.6753];

function Clicks({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onChange(Math.round(e.latlng.lat * 1e4) / 1e4, Math.round(e.latlng.lng * 1e4) / 1e4) });
  return null;
}
function Follow({ pos }: { pos: [number, number] }) {
  const map = useMap();
  useEffect(() => { if (!map.getBounds().contains(pos)) map.flyTo(pos, Math.max(map.getZoom(), 11)); }, [pos, map]);
  return null;
}

/** Click or drag to place a parcel pin. Browser-only; lazy-loaded. */
export default function PinMap({ lat, lng, onChange, parcels = [], radiusKm }: { lat: number; lng: number; onChange: (lat: number, lng: number) => void; parcels?: Parcel[]; radiusKm?: number }) {
  const icon = useMemo(() => L.divIcon({ className: "", html: '<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#7c5cff;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>', iconSize: [28, 28], iconAnchor: [14, 28] }), []);
  const pos: [number, number] = [lat, lng];
  return (
    <MapContainer center={Number.isFinite(lat) ? pos : RIYADH} zoom={11} className="h-full w-full" scrollWheelZoom>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
      {radiusKm && <Circle center={RIYADH} radius={radiusKm * 1000} pathOptions={{ color: "#7c5cff", weight: 1, dashArray: "6 6", fillOpacity: 0.03 }} />}
      {parcels.map((p) => (
        <CircleMarker key={p.parcel_id} center={[p.lat, p.lng]} radius={3} pathOptions={{ color: "#9a9aa8", weight: 1, fillOpacity: 0.5 }}>
          <Tooltip>{p.district_ar} · {p.parcel_id}</Tooltip>
        </CircleMarker>
      ))}
      <Clicks onChange={onChange} />
      <Follow pos={pos} />
      <Marker position={pos} icon={icon} draggable eventHandlers={{ dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); onChange(Math.round(ll.lat * 1e4) / 1e4, Math.round(ll.lng * 1e4) / 1e4); } }} />
    </MapContainer>
  );
}
