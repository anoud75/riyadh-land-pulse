/// <reference types="geojson" />
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { ParcelMapMarker } from "./ParcelMapMarker";
import type { Parcel } from "@/data/types";
import { type MapLayer } from "@/lib/mapLayers";
import { competitorPoints, reachPolygon, REACH_MINUTES } from "@/lib/reach";
import { aggregateDistricts, districtColor, type DistrictAgg } from "@/lib/mapStats";
import geoRaw from "@/data/riyadhDistricts.json";
import { districtBounds, districtStats, type DistrictCollection } from "@/lib/districtStats";

const GEO = geoRaw as unknown as DistrictCollection;
const TOKEN = import.meta.env['VITE_LOVABLE_CONNECTOR_MAPBOX_PUBLIC_TOKEN'] as string | undefined;
const STYLES = { streets: "mapbox://styles/mapbox/streets-v12", light: "mapbox://styles/mapbox/light-v11" } as const;
const STYLE_AR: Record<keyof typeof STYLES, string> = { streets: "شوارع", light: "فاتحة" };

/** Imperative handle the map page uses to move the camera. */
export interface MapHandle {
  flyTo: (lat: number, lng: number, zoom: number, offsetX?: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

const poly = (ring: [number, number][], props: Record<string, unknown> = {}) => ({ type: "Feature" as const, properties: props, geometry: { type: "Polygon" as const, coordinates: [ring] } });
const fc = (features: unknown[]) => ({ type: "FeatureCollection", features }) as GeoJSON.FeatureCollection;

export default function ParcelMap({ parcels, layer, mode, selected, onSelect, onSelectDistrict, mapRef, highlight }: {
  parcels: Parcel[]; layer: MapLayer; mode: "parcels" | "districts"; selected: Parcel | null;
  onSelect: (p: Parcel | null) => void; onSelectDistrict: (d: DistrictAgg) => void;
  mapRef: React.RefObject<MapHandle | null>; highlight?: [number, number][] | null;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [styleKey, setStyleKey] = useState<keyof typeof STYLES>("streets");
  const [slots, setSlots] = useState<{ parcel: Parcel; element: HTMLDivElement; marker: mapboxgl.Marker }[]>([]);
  const [gen, setGen] = useState(0); // bumps after each style load so data is re-applied
  const cb = useRef({ onSelect, onSelectDistrict, parcels }); cb.current = { onSelect, onSelectDistrict, parcels };

  const data = useMemo(() => {
    const aggs = aggregateDistricts(parcels);
    const stats = districtStats(GEO, parcels, []);
    const byId = new Map(stats.map((s) => [s.id, s]));
    const districts = GEO.features.map((f) => { const s = byId.get(f.properties.id); return { ...f, id: f.properties.id, properties: { ...f.properties, color: s?.parcelIds.length ? districtColor(s?.medianPpm ?? null) : "#000000", op: s?.parcelIds.length ? 0.45 : 0.04, label: s?.parcelIds.length ? `${s?.name_ar} · ${s?.parcelIds.length}` : "" } }; });
    const reach = selected && mode === "parcels" ? REACH_MINUTES.map((m, i) => poly(reachPolygon(selected.parcel_id, selected.lat, selected.lng, m).map(([a, b]) => [b, a] as [number, number]), { op: 0.08 + i * 0.07 })) : [];
    const comps = selected && mode === "parcels" ? competitorPoints(selected.parcel_id, selected.lat, selected.lng).map((c) => ({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [c[1], c[0]] } })) : [];
    const first = highlight?.[0];
    const hl = first && highlight ? [poly([...highlight.map(([a, b]) => [b, a] as [number, number]), [first[1], first[0]]])] : [];
    return { aggs, districts, reach, comps, hl };
  }, [parcels, layer, selected, mode, highlight]);

  useEffect(() => {
    if (!box.current || !TOKEN) return;
    mapboxgl.accessToken = TOKEN;
    const m = new mapboxgl.Map({ container: box.current, style: STYLES.streets, center: [46.6753, 24.7136], zoom: 10.5, maxZoom: 19 });
    map.current = m;
    const ro = new ResizeObserver(() => m.resize()); ro.observe(box.current);
    mapRef.current = {
      flyTo: (lat, lng, zoom, offsetX = 0) => m.flyTo({ center: [lng, lat], zoom, offset: [-offsetX, 0], duration: 1100 }),
      zoomIn: () => m.zoomIn(), zoomOut: () => m.zoomOut(),
    };
    m.on("style.load", () => {
      const src = (id: string) => m.addSource(id, { type: "geojson", data: fc([]) });
      ["districts", "reach", "comps", "hl"].forEach(src);
      m.addLayer({ id: "d-fill", type: "fill", source: "districts", layout: { visibility: "none" }, paint: { "fill-color": ["get", "color"], "fill-opacity": ["get", "op"] } });
      m.addLayer({ id: "d-line", type: "line", source: "districts", layout: { visibility: "none" }, paint: { "line-color": "#ffffff", "line-width": 1, "line-opacity": 0.8 } });
      m.addLayer({ id: "d-label", type: "symbol", source: "districts", layout: { visibility: "none", "text-field": ["get", "label"], "text-size": 12, "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"] }, paint: { "text-color": "#111", "text-halo-color": "#fff", "text-halo-width": 1.5 } });
      m.addLayer({ id: "reach", type: "fill", source: "reach", paint: { "fill-color": "#7c3aed", "fill-opacity": ["get", "op"], "fill-outline-color": "#6d28d9" } });
      m.addLayer({ id: "comps", type: "circle", source: "comps", paint: { "circle-radius": 6, "circle-color": "#ffffff", "circle-stroke-color": "#111827", "circle-stroke-width": 2 } });
      m.addLayer({ id: "hl-fill", type: "fill", source: "hl", paint: { "fill-color": "#e0393e", "fill-opacity": 0.12 } });
      m.addLayer({ id: "hl-line", type: "line", source: "hl", paint: { "line-color": "#e0393e", "line-width": 3 } });
      setGen((g) => g + 1);
    });
    m.on("click", "d-fill", (e) => {
      const f = GEO.features.find((x) => x.properties.id === Number(e.features?.[0]?.id)); if (!f) return;
      m.fitBounds(districtBounds(f), { padding: 60, duration: 900 });
      const name = f.properties.name_ar;
      const agg = aggregateDistricts(cb.current.parcels).find((d) => d.district_ar === name);
      if (agg) cb.current.onSelectDistrict(agg);
    });
    return () => { ro.disconnect(); m.remove(); map.current = null; mapRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (gen && map.current) map.current.setStyle(STYLES[styleKey]); }, [styleKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const m = map.current; if (!m || !gen) return;
    const set = (id: string, f: unknown[]) => (m.getSource(id) as mapboxgl.GeoJSONSource | undefined)?.setData(fc(f));
    set("districts", data.districts); set("reach", data.reach); set("comps", data.comps); set("hl", data.hl);
    const vis = (ids: string[], on: boolean) => ids.forEach((id) => m.getLayer(id) && m.setLayoutProperty(id, "visibility", on ? "visible" : "none"));
    vis(["d-fill", "d-line", "d-label"], mode === "districts");
  }, [data, mode, gen]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const next = parcels.map((parcel) => {
      const element = document.createElement("div");
      element.className = "parcel-marker-anchor";
      const marker = new mapboxgl.Marker({ element, anchor: "center" }).setLngLat([parcel.lng, parcel.lat]).addTo(m);
      return { parcel, element, marker };
    });
    setSlots(next);
    return () => next.forEach(({ marker }) => marker.remove());
  }, [parcels]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const layout = () => {
      const occupied: { x: number; y: number }[] = [];
      const ordered = [...slots].sort((a, b) => Number(b.parcel.parcel_id === selected?.parcel_id) - Number(a.parcel.parcel_id === selected?.parcel_id) || Number(b.parcel.status === "available") - Number(a.parcel.status === "available") || a.parcel.parcel_id.localeCompare(b.parcel.parcel_id));
      for (const { parcel, element } of ordered) {
        const active = parcel.parcel_id === selected?.parcel_id;
        const point = m.project([parcel.lng, parcel.lat]);
        const inView = point.x > -100 && point.y > -60 && point.x < m.getContainer().clientWidth + 100 && point.y < m.getContainer().clientHeight + 60;
        const full = active || (m.getZoom() >= 10.25 && inView && !occupied.some((p) => Math.abs(p.x - point.x) < 172 && Math.abs(p.y - point.y) < 64));
        if (full) occupied.push(point);
        element.dataset['compact'] = String(!full);
        element.dataset['active'] = String(active);
        element.style.display = mode === "parcels" ? "" : "none";
        element.style.zIndex = active ? "4" : full ? "2" : "1";
      }
    };
    layout();
    m.on("move", layout);
    return () => { m.off("move", layout); };
  }, [slots, selected, mode]);

  useEffect(() => {
    const m = map.current;
    if (!selected || mode !== "parcels" || !m) return;
    const offset = m.getContainer().clientWidth > 700 ? -185 : -70;
    m.flyTo({ center: [selected.lng, selected.lat], zoom: 15, offset: [offset, 0], duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 800 });
  }, [selected, mode]);

  if (!TOKEN) return <div className="grid size-full place-items-center text-sm text-muted-foreground">الخريطة غير مهيأة: رمز Mapbox غير متوفر.</div>;
  return (
    <div className="relative size-full">
      {slots.map(({ parcel, element }) => createPortal(<ParcelMapMarker parcel={parcel} parcels={parcels} layer={layer} selected={selected?.parcel_id === parcel.parcel_id} onSelect={() => onSelect(parcel)} />, element, parcel.parcel_id))}
      <div ref={box} className="absolute inset-0 h-full w-full" />
      <div className="absolute left-3 top-28 z-[5] flex overflow-hidden rounded-xl border bg-surface text-xs shadow-sm" dir="rtl">
        {(Object.keys(STYLES) as (keyof typeof STYLES)[]).map((k) => (
          <Button key={k} size="sm" variant={styleKey === k ? "default" : "ghost"} aria-pressed={styleKey === k} onClick={() => setStyleKey(k)} className="rounded-none">{STYLE_AR[k]}</Button>
        ))}
      </div>
    </div>
  );
}
