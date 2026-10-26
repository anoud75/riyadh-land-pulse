import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef } from "react";
import type { Parcel } from "@/data/types";

const TOKEN = import.meta.env["VITE_LOVABLE_CONNECTOR_MAPBOX_PUBLIC_TOKEN"] as string | undefined;
const MALQA: [number, number] = [46.61, 24.812]; // lng, lat

function ring(c: [number, number], km: number): [number, number][] {
  return Array.from({ length: 65 }, (_, i) => {
    const a = (i / 64) * 2 * Math.PI;
    return [c[0] + (km / (111.32 * Math.cos((c[1] * Math.PI) / 180))) * Math.cos(a), c[1] + (km / 110.57) * Math.sin(a)];
  });
}

/** Landing map: starts on all of Riyadh, then flies into Al Malqa with illustrative reach rings. */
export default function MalqaMap({ parcels }: { parcels: Parcel[] }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el || !TOKEN) return;
    mapboxgl.accessToken = TOKEN;
    const m = new mapboxgl.Map({
      container: el,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [46.68, 24.72],
      zoom: 9,
      interactive: false,
      attributionControl: false,
    });
    m.addControl(new mapboxgl.AttributionControl({ compact: true }));
    const ro = new ResizeObserver(() => m.resize());
    ro.observe(el);
    let started = false;
    const fly = () => {
      if (started) return;
      started = true;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const target = { center: MALQA, zoom: 12.6, pitch: 45, bearing: -15 };
      if (reduce) m.jumpTo(target);
      else m.flyTo({ ...target, duration: 5200, curve: 1.3, essential: true });
    };
    m.on("load", () => {
      [[6, 0.1], [4, 0.16], [2, 0.3]].forEach(([km, op], i) => {
        m.addSource(`r${i}`, { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring(MALQA, km!)] } } });
        m.addLayer({ id: `r${i}`, type: "fill", source: `r${i}`, paint: { "fill-color": "#7c5cff", "fill-opacity": op! } });
        m.addLayer({ id: `rl${i}`, type: "line", source: `r${i}`, paint: { "line-color": "#b9a6ff", "line-opacity": 0.5, "line-width": 1 } });
      });
      m.addSource("parcels", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: parcels.filter((p) => Number.isFinite(p.lat)).map((p) => ({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [p.lng, p.lat] } })),
        },
      });
      m.addLayer({ id: "parcels", type: "circle", source: "parcels", paint: { "circle-radius": 3, "circle-color": "#ffffff", "circle-opacity": 0.75 } });
      const dot = document.createElement("div");
      dot.className = "malqa-marker";
      new mapboxgl.Marker({ element: dot }).setLngLat(MALQA).addTo(m);
      const io = new IntersectionObserver(([e]) => e?.isIntersecting && (fly(), io.disconnect()), { threshold: 0.4 });
      io.observe(el);
    });
    return () => { ro.disconnect(); m.remove(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!TOKEN) return null;
  return <div className="absolute inset-0"><div ref={box} className="h-full w-full" /></div>;
}
