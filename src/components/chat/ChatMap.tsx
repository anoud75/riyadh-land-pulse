import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Inquiry, Parcel } from "@/data/types";
import type { MapCommand } from "@/lib/agentUi";
import geoRaw from "@/data/riyadhDistricts.json";
import { districtBounds, districtStats, findDistrict, metricValue, METRIC_AR, type DistrictCollection, type DistrictMetric, type DistrictStat } from "@/lib/districtStats";

const GEO = geoRaw as unknown as DistrictCollection;
const TOKEN = import.meta.env.VITE_LOVABLE_CONNECTOR_MAPBOX_PUBLIC_TOKEN as string | undefined;
const PALETTE = ["#efeafd", "#cdbdfa", "#a48cf3", "#7c5cff", "#4f33c4"];
const DIVERGE = ["#2f7d5b", "#9fd3b8", "#f1f1f4", "#f2a7a0", "#c2413a"];

function circle(center: [number, number], km: number) {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * 2 * Math.PI;
    pts.push([center[1] + (km / (111.32 * Math.cos((center[0] * Math.PI) / 180))) * Math.cos(a), center[0] + (km / 110.57) * Math.sin(a)]);
  }
  return { type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [pts] } };
}

/** Mapbox map the assistant drives: districts colored by a metric when zoomed out, parcels when zoomed in. Browser only; lazy-loaded. */
export default function ChatMap({ command, parcels, onPick, inquiries }: { command: MapCommand; parcels: Parcel[]; onPick?: (id: string) => void; inquiries?: Inquiry[] }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const metrics: DistrictMetric[] = inquiries ? ["available", "median_ppm", "waiting", "gap", "dom"] : ["available", "median_ppm", "dom"];
  const [metric, setMetric] = useState<DistrictMetric>(command.choropleth && metrics.includes(command.choropleth) ? command.choropleth : "available");
  const [hover, setHover] = useState<DistrictStat | null>(null);
  const pickRef = useRef(onPick); pickRef.current = onPick;

  const stats = useMemo(() => districtStats(GEO, parcels, inquiries ?? []), [parcels, inquiries]);
  const statById = useMemo(() => new Map(stats.map((s) => [s.id, s])), [stats]);
  useEffect(() => { if (command.choropleth && metrics.includes(command.choropleth)) setMetric(command.choropleth); }, [command.choropleth]); // eslint-disable-line react-hooks/exhaustive-deps

  const { districtsFc, breaks, colors } = useMemo(() => {
    const vals = stats.map((s) => metricValue(s, metric)).filter((v): v is number => v != null).sort((a, b) => a - b);
    const diverging = metric === "gap";
    const q = (p: number) => vals[Math.min(vals.length - 1, Math.floor(p * vals.length))] ?? 0;
    const br = diverging ? [-3, -1, 1, 3] : [q(0.2), q(0.4), q(0.6), q(0.8)];
    const cols = diverging ? DIVERGE : PALETTE;
    const colorOf = (v: number | null) => (v == null ? "#e6e6ea" : cols[br.filter((b) => v >= b).length]!);
    return {
      breaks: br, colors: cols,
      districtsFc: { type: "FeatureCollection" as const, features: GEO.features.map((f) => { const s = statById.get(f.properties.id)!; const v = metricValue(s, metric); return { ...f, id: f.properties.id, properties: { ...f.properties, color: colorOf(v), hasData: v != null ? 1 : 0 } }; }) },
    };
  }, [stats, statById, metric]);

  const parcelsFc = useMemo(() => {
    const hl = new Set(command.parcelIds);
    return { type: "FeatureCollection" as const, features: parcels.filter((p) => Number.isFinite(p.lat)).map((p) => ({ type: "Feature" as const, properties: { id: p.parcel_id, on: hl.has(p.parcel_id) ? 1 : 0, label: `${p.district_ar} · ${p.parcel_id}${p.total_price_sar ? ` · ${p.total_price_sar.toLocaleString("en-US")} ريال` : ""}` }, geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] } })) };
  }, [parcels, command.parcelIds]);

  useEffect(() => {
    if (!box.current || !TOKEN) return;
    mapboxgl.accessToken = TOKEN;
    const m = new mapboxgl.Map({ container: box.current, style: "mapbox://styles/mapbox/light-v11", center: [command.center[1], command.center[0]], zoom: command.zoom - 1, attributionControl: true });
    m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-left");
    map.current = m;
    m.on("load", () => {
      m.addSource("districts", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({ id: "d-fill", type: "fill", source: "districts", paint: { "fill-color": ["get", "color"], "fill-opacity": ["interpolate", ["linear"], ["zoom"], 10, 0.75, 14, 0.25] } });
      m.addLayer({ id: "d-line", type: "line", source: "districts", paint: { "line-color": "#ffffff", "line-width": 0.8 } });
      m.addLayer({ id: "d-hover", type: "line", source: "districts", paint: { "line-color": "#2a1f66", "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 2.5, 0] } });
      m.addSource("focus", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({ id: "focus-line", type: "line", source: "focus", paint: { "line-color": "#c2413a", "line-width": 3 } });
      m.addSource("radius", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({ id: "radius-fill", type: "fill", source: "radius", paint: { "fill-color": "#7c5cff", "fill-opacity": 0.08 } });
      m.addLayer({ id: "radius-line", type: "line", source: "radius", paint: { "line-color": "#7c5cff", "line-width": 1.5, "line-dasharray": [2, 2] } });
      m.addSource("parcels", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({ id: "p", type: "circle", source: "parcels", paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, ["case", ["==", ["get", "on"], 1], 5, 2], 14, ["case", ["==", ["get", "on"], 1], 10, 5]],
        "circle-color": ["case", ["==", ["get", "on"], 1], "#7c5cff", "#8d8d9b"], "circle-stroke-color": "#ffffff", "circle-stroke-width": ["case", ["==", ["get", "on"], 1], 2, 0.5],
      } });
      let hovered: number | string | undefined;
      m.on("mousemove", "d-fill", (e) => {
        const f = e.features?.[0]; if (!f) return;
        if (hovered !== undefined) m.setFeatureState({ source: "districts", id: hovered }, { hover: false });
        hovered = f.id; if (hovered !== undefined) m.setFeatureState({ source: "districts", id: hovered }, { hover: true });
        setHover(statRef.current.get(Number(f.id)) ?? null);
      });
      m.on("mouseleave", "d-fill", () => { if (hovered !== undefined) m.setFeatureState({ source: "districts", id: hovered }, { hover: false }); hovered = undefined; setHover(null); });
      m.on("click", "d-fill", (e) => {
        const f = GEO.features.find((x) => x.properties.id === Number(e.features?.[0]?.id));
        if (f && m.getZoom() < 13) m.fitBounds(districtBounds(f), { padding: 40, duration: 900 });
      });
      const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 8 });
      m.on("mouseenter", "p", (e) => { m.getCanvas().style.cursor = "pointer"; const f = e.features?.[0]; if (f) popup.setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number]).setText(String(f.properties?.label)).addTo(m); });
      m.on("mouseleave", "p", () => { m.getCanvas().style.cursor = ""; popup.remove(); });
      m.on("click", "p", (e) => { const id = e.features?.[0]?.properties?.id; if (id) pickRef.current?.(String(id)); });
      setReady(true);
    });
    return () => { m.remove(); map.current = null; setReady(false); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const statRef = useRef(statById); statRef.current = statById;

  useEffect(() => { if (ready) (map.current!.getSource("districts") as mapboxgl.GeoJSONSource).setData(districtsFc as GeoJSON.FeatureCollection); }, [ready, districtsFc]);
  useEffect(() => { if (ready) (map.current!.getSource("parcels") as mapboxgl.GeoJSONSource).setData(parcelsFc as GeoJSON.FeatureCollection); }, [ready, parcelsFc]);

  // Follow the assistant's command: district outline, radius, fly / fit.
  useEffect(() => {
    const m = map.current; if (!ready || !m) return;
    const d = command.district ? findDistrict(GEO, command.district) : null;
    (m.getSource("focus") as mapboxgl.GeoJSONSource).setData({ type: "FeatureCollection", features: d ? [d as unknown as GeoJSON.Feature] : [] });
    (m.getSource("radius") as mapboxgl.GeoJSONSource).setData({ type: "FeatureCollection", features: command.radiusKm ? [circle(command.center, command.radiusKm)] : [] });
    const hl = parcels.filter((p) => command.parcelIds.includes(p.parcel_id));
    if (d) m.fitBounds(districtBounds(d), { padding: 50, duration: 1200 });
    else if (command.action === "highlight" && hl.length > 1) {
      const b = new mapboxgl.LngLatBounds(); hl.forEach((p) => b.extend([p.lng, p.lat]));
      m.fitBounds(b, { padding: 50, maxZoom: 14, duration: 1200 });
    } else m.flyTo({ center: [command.center[1], command.center[0]], zoom: command.zoom, duration: 1200 });
  }, [ready, command]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!TOKEN) return <div className="grid h-full place-items-center p-6 text-center text-sm text-muted-foreground">الخريطة غير مهيأة: رمز Mapbox غير متوفر.</div>;

  const fmt = (v: number | null) => (v == null ? "—" : v.toLocaleString("en-US"));
  return (
    <div className="relative h-full w-full" dir="rtl">
      <div ref={box} className="absolute inset-0" />
      <div className="absolute right-2 top-2 z-10 flex max-w-[calc(100%-4rem)] flex-wrap gap-1 rounded-xl border border-border bg-card/95 p-1 shadow-sm">
        {metrics.map((k) => (
          <button key={k} type="button" onClick={() => setMetric(k)} className={`rounded-lg px-2 py-1 text-[11px] ${metric === k ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"}`}>{METRIC_AR[k]}</button>
        ))}
      </div>
      <div className="absolute bottom-6 right-2 z-10 rounded-xl border border-border bg-card/95 p-2 text-[11px] shadow-sm">
        <div className="mb-1 font-medium">{METRIC_AR[metric]}</div>
        <div className="flex items-center gap-1">
          {colors.map((c, i) => <span key={c} className="flex flex-col items-center"><span className="h-2.5 w-6 rounded-sm" style={{ background: c }} /><span className="text-muted-foreground">{i === 0 ? `<${fmt(breaks[0]!)}` : `≥${fmt(breaks[i - 1]!)}`}</span></span>)}
        </div>
        <div className="mt-1 text-muted-foreground">رمادي = لا أراضٍ لسرج في الحي · اضغط حيًا للتقريب</div>
      </div>
      {hover && (
        <div className="pointer-events-none absolute left-2 top-14 z-10 w-56 rounded-xl border border-border bg-card p-3 text-xs shadow-md">
          <div className="mb-1 text-sm font-semibold">حي {hover.name_ar}</div>
          {hover.parcelIds.length ? (
            <ul className="space-y-0.5 text-muted-foreground">
              <li>أراضٍ لسرج: <b className="text-foreground">{hover.parcelIds.length}</b> (متاحة {hover.available})</li>
              <li>وسيط سعر المتر: <b className="text-foreground">{fmt(hover.medianPpm)}</b> ريال</li>
              <li>متوسط أيام العرض: <b className="text-foreground">{fmt(hover.avgDom)}</b></li>
              {inquiries && <li>مشترون ينتظرون في المنطقة: <b className="text-foreground">{hover.waiting}</b> · الفجوة {hover.gap}</li>}
            </ul>
          ) : <div className="text-muted-foreground">لا أراضٍ لسرج في هذا الحي.</div>}
        </div>
      )}
    </div>
  );
}
