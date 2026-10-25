import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef } from "react";
import type { Parcel } from "@/data/types";

const RIYADH: [number, number] = [24.7136, 46.6753];
const TOKEN = import.meta.env['VITE_LOVABLE_CONNECTOR_MAPBOX_PUBLIC_TOKEN'] as string | undefined;
const r4 = (n: number) => Math.round(n * 1e4) / 1e4;

function ring(c: [number, number], km: number): [number, number][] {
  return Array.from({ length: 65 }, (_, i) => { const a = (i / 64) * 2 * Math.PI; return [c[1] + (km / (111.32 * Math.cos((c[0] * Math.PI) / 180))) * Math.cos(a), c[0] + (km / 110.57) * Math.sin(a)]; });
}

/** Click or drag to place a parcel pin (Mapbox). Browser-only; lazy-loaded. */
export default function PinMap({ lat, lng, onChange, parcels = [], radiusKm }: { lat: number; lng: number; onChange: (lat: number, lng: number) => void; parcels?: Parcel[]; radiusKm?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const cb = useRef(onChange); cb.current = onChange;

  useEffect(() => {
    if (!box.current || !TOKEN) return;
    mapboxgl.accessToken = TOKEN;
    const start: [number, number] = Number.isFinite(lat) && Number.isFinite(lng) ? [lng, lat] : [RIYADH[1], RIYADH[0]];
    const m = new mapboxgl.Map({ container: box.current, style: "mapbox://styles/mapbox/streets-v12", center: start, zoom: 10.5 });
    m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-left");
    map.current = m;
    const mk = new mapboxgl.Marker({ color: "#7c5cff", draggable: true }).setLngLat(start).addTo(m);
    mk.on("dragend", () => { const ll = mk.getLngLat(); cb.current(r4(ll.lat), r4(ll.lng)); });
    marker.current = mk;
    m.on("click", (e) => cb.current(r4(e.lngLat.lat), r4(e.lngLat.lng)));
    m.on("load", () => {
      if (radiusKm) {
        m.addSource("bounds", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring(RIYADH, radiusKm)] } } });
        m.addLayer({ id: "bounds", type: "line", source: "bounds", paint: { "line-color": "#7c5cff", "line-width": 1.2, "line-dasharray": [3, 3] } });
      }
      m.addSource("parcels", { type: "geojson", data: { type: "FeatureCollection", features: parcels.filter((p) => Number.isFinite(p.lat)).map((p) => ({ type: "Feature", properties: { label: `${p.district_ar} · ${p.parcel_id}` }, geometry: { type: "Point", coordinates: [p.lng, p.lat] } })) } });
      m.addLayer({ id: "parcels", type: "circle", source: "parcels", paint: { "circle-radius": 3, "circle-color": "#8d8d9b", "circle-opacity": 0.7 } });
    });
    return () => { m.remove(); map.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const m = map.current; if (!m || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    marker.current?.setLngLat([lng, lat]);
    if (!m.getBounds()?.contains([lng, lat])) m.flyTo({ center: [lng, lat], zoom: Math.max(m.getZoom(), 11) });
  }, [lat, lng]);

  if (!TOKEN) return <div className="grid h-full place-items-center text-sm text-muted-foreground">الخريطة غير مهيأة: رمز Mapbox غير متوفر.</div>;
  return <div ref={box} className="h-full w-full" />;
}
