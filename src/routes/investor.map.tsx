import { createFileRoute, ClientOnly, Link } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Layers, LocateFixed, Minus, Plus, Sparkles, X, SlidersHorizontal, Heart, MapPin } from "lucide-react";
import type { MapHandle } from "@/components/investor/ParcelMap";
import { usePortfolio } from "@/context/PortfolioProvider";
import { AREAS, AREA_AR, DEAL_AR, LAND_AR, LAND_TYPES, type Area, type Parcel } from "@/data/types";
import { LAYER_LABELS, LEGENDS, type MapLayer } from "@/lib/mapLayers";
import { applyMapFilters, DISTRICT_LEGEND, EMPTY_FILTERS, type DistrictAgg, type MapFilters } from "@/lib/mapStats";
import { AREA_ADJ } from "@/lib/assistant";
import { getParcelInsight } from "@/lib/investorEngine";
import { PriceLine } from "@/components/investor/ParcelCard";
import { MapAssistant } from "@/components/investor/MapAssistant";
import { Button } from "@/components/ui/button";
import { MapPanel } from "@/components/investor/MapPanel";
import { pct, sar } from "@/components/investor/format";

const ParcelMap = lazy(() => import("@/components/investor/ParcelMap"));

export const Route = createFileRoute("/investor/map")({
  head: () => ({
    meta: [
      { title: "الخريطة — سرج" },
      { name: "description", content: "استكشف أراضي الرياض وأسعارها وأحياءها مع مساعد سرج وألواح قابلة للتحريك." },
      { property: "og:title", content: "الخريطة — سرج" },
      { property: "og:description", content: "خريطة الرياض التفاعلية وأسعار الأراضي والخدمات المحيطة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MapPage,
});

function MapPage() {
  const { parcels } = usePortfolio();
  const [layer, setLayer] = useState<MapLayer>("deal");
  const [mode, setMode] = useState<"parcels" | "districts">("parcels");
  const [filters, setFilters] = useState<MapFilters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<Parcel | null>(null);
  const [chatOpen, setChatOpen] = useState(true);
  const [legendOpen, setLegendOpen] = useState(true);
  const [showMarket, setShowMarket] = useState(false);
  const [showOpen, setShowOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const mapRef = useRef<MapHandle | null>(null);

  const filtered = useMemo(() => applyMapFilters(parcels, filters), [parcels, filters]);
  const loading = <div className="grid size-full place-items-center text-sm text-muted-foreground">جارٍ تحميل الخريطة…</div>;

  const onSelectDistrict = (d: DistrictAgg) => {
    mapRef.current?.flyTo(d.lat, d.lng, 13);
  };

  return (
    <div>
      <div className="fixed inset-0 overflow-hidden">
        <ClientOnly fallback={loading}>
          <Suspense fallback={loading}>
            <ParcelMap
              parcels={filtered}
              layer={layer}
              mode={mode}
              selected={selected}
              onSelect={(p) => { setSelected(p); setDetailsOpen(true); }}
              onSelectDistrict={onSelectDistrict}
              mapRef={mapRef}
              showMarket={showMarket}
              showOpen={showOpen}
            />
          </Suspense>
        </ClientOnly>

        <div className="map-topbar" dir="rtl">
          <Button asChild variant="ghost" className="shrink-0"><Link to="/investor"><ArrowRight className="size-4" /><span className="font-bold">سرج</span></Link></Button>
          <span className="map-toolbar-divider" />
          <div className="flex items-center gap-1">
            {(["parcels", "districts"] as const).map((m) => <Button key={m} size="sm" variant={mode === m ? "default" : "ghost"} aria-pressed={mode === m} onClick={() => { setMode(m); setSelected(null); }}>{m === "parcels" ? "الأراضي" : "الأحياء"}</Button>)}
          </div>
          <span className="hidden text-xs text-muted-foreground min-[760px]:block">{filtered.length} أرضًا · الرياض</span>
          <Button variant={filtersOpen ? "secondary" : "ghost"} size="icon" aria-label="الفلاتر والطبقات" title="الفلاتر والطبقات" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal className="size-4" /></Button>
        </div>
        {filtersOpen && <div className="map-filter-tray" dir="rtl">
          <FilterChip label="المنطقة" active={filters.area ? AREA_AR[filters.area] : null} options={AREAS.map((a) => ({ k: a, l: `${AREA_ADJ[a]} الرياض` }))} onPick={(k) => setFilters({ ...filters, area: k as Area, excludeArea: null })} onClear={() => setFilters({ ...filters, area: null, excludeArea: null })} />
          <FilterChip label="نوع الأرض" active={filters.landType ? LAND_AR[filters.landType] : null} options={LAND_TYPES.map((l) => ({ k: l, l: LAND_AR[l] }))} onPick={(k) => setFilters({ ...filters, landType: k as Parcel["land_type"] })} onClear={() => setFilters({ ...filters, landType: null })} />
          <FilterChip label="الصفقة" active={filters.dealType ? DEAL_AR[filters.dealType] : null} options={(["sale", "lease"] as const).map((d) => ({ k: d, l: DEAL_AR[d] }))} onPick={(k) => setFilters({ ...filters, dealType: k as Parcel["listing_type"] })} onClear={() => setFilters({ ...filters, dealType: null })} />
          <FilterChip label="عرض الشارع" active={filters.minStreet ? `≥ ${filters.minStreet} م` : null} options={[30, 40, 60].map((n) => ({ k: String(n), l: `${n} م فأكثر` }))} onPick={(k) => setFilters({ ...filters, minStreet: Number(k) })} onClear={() => setFilters({ ...filters, minStreet: null })} />
          <FilterChip label="الطبقة" active={layer !== "deal" ? LAYER_LABELS[layer] : null} options={(Object.keys(LAYER_LABELS) as MapLayer[]).map((l) => ({ k: l, l: LAYER_LABELS[l] }))} onPick={(k) => setLayer(k as MapLayer)} onClear={() => setLayer("deal")} />
          <Button size="sm" variant={showMarket ? "default" : "ghost"} aria-pressed={showMarket} onClick={() => setShowMarket(!showMarket)}>عقارات السوق المحيطة</Button>
          <Button size="sm" variant={showOpen ? "default" : "ghost"} aria-pressed={showOpen} onClick={() => setShowOpen(!showOpen)}>خدمات</Button>
        </div>}

        {chatOpen && <MapPanel title="مساعد سرج" side="right" onMinimize={() => setChatOpen(false)}><MapAssistant parcels={parcels} onApplyFilters={(f) => { setFilters(f); setMode("parcels"); }} onFocusParcel={(p) => { setSelected(p); setDetailsOpen(true); setMode("parcels"); }} /></MapPanel>}
        {selected && mode === "parcels" && detailsOpen && <MapPanel title="تفاصيل الأرض" side="left" onMinimize={() => setDetailsOpen(false)}><Drawer p={selected} onClose={() => setSelected(null)} /></MapPanel>}

        <div className="map-bottom-dock" dir="rtl">
          <Button size="icon" variant={chatOpen ? "default" : "ghost"} aria-label="مساعد سرج" title="مساعد سرج" aria-pressed={chatOpen} onClick={() => setChatOpen(!chatOpen)}><Sparkles className="size-4" /></Button>
          {selected && <Button size="icon" variant={detailsOpen ? "secondary" : "ghost"} aria-label="تفاصيل الأرض" title="تفاصيل الأرض" onClick={() => setDetailsOpen(!detailsOpen)}><MapPin className="size-4" /></Button>}
          <span className="map-toolbar-divider" />
          <Button size="icon" variant="ghost" aria-label="تكبير" title="تكبير" onClick={() => mapRef.current?.zoomIn()}><Plus className="size-4" /></Button>
          <Button size="icon" variant="ghost" aria-label="تصغير" title="تصغير" onClick={() => mapRef.current?.zoomOut()}><Minus className="size-4" /></Button>
          <Button size="icon" variant="ghost" aria-label="عرض الرياض" title="عرض الرياض" onClick={() => mapRef.current?.flyTo(24.7136, 46.6753, 10.5)}><LocateFixed className="size-4" /></Button>
          <Button size="icon" variant={legendOpen ? "secondary" : "ghost"} aria-label="مفتاح الخريطة" title="مفتاح الخريطة" onClick={() => setLegendOpen(!legendOpen)}><Layers className="size-4" /></Button>
        </div>
        {legendOpen && <div className="map-legend" dir="rtl">{(mode === "districts" ? DISTRICT_LEGEND : LEGENDS[layer]).map((g) => <div key={g.label} className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: g.color }} /><span>{g.label}</span></div>)}</div>}
        <div className="map-snapshot-label">سرج · 11 أغسطس 2026</div>
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  options,
  onPick,
  onClear,
}: {
  label: string;
  active: string | null;
  options: { k: string; l: string }[];
  onPick: (k: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (active)
    return (
      <span className="flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-sm text-accent-foreground">
        {active}
        <Button aria-label={`إزالة ${label}`} onClick={onClear}>
          <X className="size-3.5" />
        </Button>
      </span>
    );
  return (
    <span className="relative">
      <Button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex items-center gap-1 rounded-full border bg-surface px-3 py-1.5 text-sm shadow-sm hover:bg-secondary"
      >
        {label}
        <ChevronDown className="size-3.5" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-xl border bg-surface p-1 shadow-lg">
          {options.map((o) => (
            <Button
              key={o.k}
              onClick={() => {
                onPick(o.k);
                setOpen(false);
              }}
              className="block w-full rounded-lg px-3 py-1.5 text-right text-sm hover:bg-secondary"
            >
              {o.l}
            </Button>
          ))}
        </div>
      )}
    </span>
  );
}

function Drawer({ p, onClose }: { p: Parcel; onClose: () => void }) {
  const { parcels, favoriteIds, toggleFavorite } = usePortfolio();
  const ins = getParcelInsight(parcels, p.parcel_id);
  if (!ins) return null;
  const s = ins.segment;
  return (
    <aside className="p-5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="size-1.5 rounded-full bg-primary" />
        الأرض المحددة
      </div>
      <div className="mt-1 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{p.district_ar}</h2>
          <div className="text-sm text-muted-foreground">
            <span className="font-mono">{p.parcel_id}</span> · {AREA_AR[p.area_of_city]} الرياض
          </div>
        </div>
        <Button onClick={onClose} aria-label="إغلاق">
          <X className="size-5" />
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-accent px-2.5 py-1 text-accent-foreground">
          {LAND_AR[p.land_type]} {p.listing_type === "sale" ? "للبيع" : "للإيجار"}
        </span>
        <span className="rounded-full bg-secondary px-2.5 py-1">{sar(p.area_sqm)} م²</span>
        <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-destructive">معروضة {p.days_on_market} يومًا</span>
      </div>
      <div className="mt-4">
        <PriceLine p={p} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border text-sm">
        <Cell k="سعر المتر · ريال" v={p.price_per_sqm_sar ? sar(p.price_per_sqm_sar) : "—"} />
        <Cell k="المساحة · م²" v={sar(p.area_sqm)} />
        <Cell k="يومًا في السوق" v={String(p.days_on_market)} />
        <Cell k="عرض الشارع · م" v={String(p.street_width_m)} />
      </dl>
      <div className="mt-5">
        <div className="text-sm font-medium">
          الأرض في شريحتها{" "}
          <span className="text-xs font-normal text-muted-foreground">
            {AREA_AR[p.area_of_city]} · {LAND_AR[p.land_type]} · {DEAL_AR[p.listing_type]}
          </span>
        </div>
        {s.insufficientSample ? (
          <p className="mt-2 rounded-xl border p-3 text-sm text-muted-foreground">
            عينة غير كافية ({s.closedDeals} صفقة مغلقة)، لا تُعرض وسائط.
          </p>
        ) : (
          <div className="mt-2 space-y-2 text-sm">
            <Row k="وسيط سعر المتر" v={`${sar(s.medianPricePerSqm)} ريال`} />
            <Row k="سعرها مقابل الوسيط" v={ins.priceDeltaPct == null ? "لا سعر" : pct(ins.priceDeltaPct) ?? "—"} hot={(ins.priceDeltaPct ?? 0) > 0} />
            <Row k="وسيط الإغلاق" v={`${s.medianClosingDays} يومًا`} />
          </div>
        )}
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          الوسائط من {s.closedDeals} صفقات مغلقة في الشريحة نفسها. الاستخدام النظامي وحدود القطعة يُتحقَّق منهما لدى الجهة
          المختصة. الموقع المعروض إحداثية الأرض وليس حدودًا مساحية معتمدة.
        </p>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link to="/investor/parcels/$parcelId" params={{ parcelId: p.parcel_id }} className="rounded-full border px-4 py-2 text-sm">
          صفحة الأرض
        </Link>
        <Button variant="outline" size="icon" aria-label="حفظ في المفضلة" aria-pressed={favoriteIds.includes(p.parcel_id)} onClick={() => toggleFavorite(p.parcel_id)}><Heart className={`size-4 ${favoriteIds.includes(p.parcel_id) ? "fill-primary text-primary" : ""}`} /></Button>
      </div>
    </aside>
  );
}

function Cell({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-surface p-3">
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd className="mt-0.5 font-mono text-base font-bold">{v}</dd>
    </div>
  );
}

function Row({ k, v, hot }: { k: string; v: string; hot?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2">
      <span className="text-muted-foreground">{k}</span>
      <span className={`font-mono font-bold ${hot ? "text-destructive" : ""}`}>{v}</span>
    </div>
  );
}
