import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import { useEffect } from "react";
import type { Parcel } from "@/data/types";
import type { MapCommand } from "@/lib/agentUi";

function Driver({ command, parcels }: { command: MapCommand; parcels: Parcel[] }) {
  const map = useMap();
  useEffect(() => {
    const hl = parcels.filter((p) => command.parcelIds.includes(p.parcel_id));
    if (command.action === "highlight" && hl.length > 1) map.flyToBounds(hl.map((p) => [p.lat, p.lng] as [number, number]), { padding: [40, 40], maxZoom: 14, duration: 1.2 });
    else map.flyTo(command.center, command.zoom, { duration: 1.2 });
  }, [command, parcels, map]);
  return null;
}

/** Map the assistant drives from inside the chat (browser only; lazy-loaded). */
export default function ChatMap({ command, parcels, onPick }: { command: MapCommand; parcels: Parcel[]; onPick?: (id: string) => void }) {
  const hl = new Set(command.parcelIds);
  return (
    <MapContainer center={command.center} zoom={command.zoom} className="h-full w-full" scrollWheelZoom>
      <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution="&copy; OpenStreetMap &copy; CARTO" />
      <Driver command={command} parcels={parcels} />
      {command.radiusKm && <Circle center={command.center} radius={command.radiusKm * 1000} pathOptions={{ color: "#7c5cff", fillOpacity: 0.08, weight: 1.5 }} />}
      {parcels.map((p) => {
        const on = hl.has(p.parcel_id);
        return (
          <CircleMarker key={p.parcel_id} center={[p.lat, p.lng]} radius={on ? 9 : 4} eventHandlers={{ click: () => onPick?.(p.parcel_id) }}
            pathOptions={{ color: on ? "#5b3fd6" : "#9a9aa8", fillColor: on ? "#7c5cff" : "#c7c7d1", fillOpacity: on ? 0.9 : 0.5, weight: on ? 2 : 1 }}>
            <Tooltip direction="top">{p.district_ar} · {p.parcel_id}{p.total_price_sar ? ` · ${p.total_price_sar.toLocaleString("en-US")} ريال` : ""}</Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
