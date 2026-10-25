import { createFileRoute, ClientOnly, Link, useNavigate } from "@tanstack/react-router";
import { FootprintOverlay } from "@/components/investor/FootprintOverlay";
import { districtGeo } from "@/lib/districtGeo";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Minus, Plus, Sparkles, X } from "lucide-react";
import type { MapHandle } from "@/components/investor/ParcelMap";
import { usePortfolio } from "@/context/PortfolioProvider";
import { AREAS, AREA_AR, DEAL_AR, LAND_AR, LAND_TYPES, type Area, type Parcel } from "@/data/types";
import { LAYER_LABELS, LEGENDS, type MapLayer } from "@/lib/mapLayers";
import { applyMapFilters, DISTRICT_LEGEND, EMPTY_FILTERS, type DistrictAgg, type MapFilters } from "@/lib/mapStats";
import { AREA_ADJ } from "@/lib/assistant";
import { getParcelInsight } from "@/lib/investorEngine";
import { FOOTPRINT_DISTRICTS } from "@/data/districtSeries";
import { CompareButton, PriceLine } from "@/components/investor/ParcelCard";
import { MapAssistant } from "@/components/investor/MapAssistant";
import { pct, sar } from "@/components/investor/format";

const ParcelMap = lazy(() => import("@/components/investor/ParcelMap"));

export const Route = createFileRoute("/investor/map")({
  head: () => ({
    meta: [
      { title: "الخريطة — سرج" },
      { name: "description", content: "أراضي سرج على خريطة الرياض مع نطاقات الوصول والمنافسين وبصمة الحي." },
      { property: "og:title", content: "الخريطة — سرج" },
      { property: "og:description", content: "خريطة الأراضي ونطاق الوصول." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "stylesheet", href: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" }],
  }),
  validateSearch: (s: Record<string, unknown>): { footprint?: string } =>
    typeof s["footprint"] === "string" ? { footprint: s["footprint"] as string } : {},
  component: MapPage,
});

function MapPage() {
  const { parcels } = usePortfolio();
  const [layer, setLayer] = useState<MapLayer>("deal");
  const [mode, setMode] = useState<"parcels" | "districts">("parcels");
  const [filters, setFilters] = useState<MapFilters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<Parcel | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(true);
  const mapRef = useRef<MapHandle | null>(null);
  const { footprint } = Route.useSearch();
  const navigate = useNavigate({ from: "/investor/map" });
  const [year, setYear] = useState(2026);
  const geo = useMemo(() => (footprint ? districtGeo(parcels, footprint) : null), [parcels, footprint]);
  useEffect(() => {
    if (!geo) return;
    const go = () => {
      const m = mapRef.current;
      if (!m) return;
      // shift so the district sits under the lens, left of the numbers panel
      m.flyTo(geo.center[0], geo.center[1], 14, 160);
    };
    const t = [setTimeout(go, 50), setTimeout(go, 900)];
    return () => t.forEach(clearTimeout);
  }, [geo]);
  const setFootprint = (d?: string) => navigate({ search: d ? { footprint: d } : {} });

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
              onSelect={setSelected}
              onSelectDistrict={onSelectDistrict}
              mapRef={mapRef}
              highlight={geo?.outline ?? null}
            />
          </Suspense>
        </ClientOnly>

        {/* top controls */}
        <div className="pointer-events-none absolute inset-x-0 top-3 z-[1000] flex flex-col items-center gap-2 px-4">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border bg-surface px-2 py-1.5 shadow-sm">
            <span className="px-2 text-xs text-muted-foreground">لقطة البيانات 11 أغسطس 2026</span>
            <div className="flex rounded-full bg-secondary p-0.5">
              {(["parcels", "districts"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setSelected(null);
                  }}
                  aria-pressed={mode === m}
                  className={`rounded-full px-4 py-1 text-sm ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  {m === "parcels" ? "الأراضي" : "الأحياء"}
                </button>
              ))}
            </div>
          </div>
          <div className={`pointer-events-auto flex flex-wrap items-center justify-center gap-2 ${footprint ? "hidden" : ""}`}>
            <FilterChip
              label="المنطقة"
              active={filters.area ? `${AREA_ADJ[filters.area]} الرياض` : filters.excludeArea ? `خارج ${AREA_ADJ[filters.excludeArea]} الرياض` : null}
              options={AREAS.map((a) => ({ k: a, l: `${AREA_ADJ[a]} الرياض` }))}
              onPick={(k) => setFilters({ ...filters, area: k as Area, excludeArea: null })}
              onClear={() => setFilters({ ...filters, area: null, excludeArea: null })}
            />
            <FilterChip
              label="نوع الأرض"
              active={filters.landType ? LAND_AR[filters.landType] : null}
              options={LAND_TYPES.map((l) => ({ k: l, l: LAND_AR[l] }))}
              onPick={(k) => setFilters({ ...filters, landType: k as Parcel["land_type"] })}
              onClear={() => setFilters({ ...filters, landType: null })}
            />
            <FilterChip
              label="الصفقة"
              active={filters.dealType ? DEAL_AR[filters.dealType] : null}
              options={(["sale", "lease"] as const).map((d) => ({ k: d, l: DEAL_AR[d] }))}
              onPick={(k) => setFilters({ ...filters, dealType: k as Parcel["listing_type"] })}
              onClear={() => setFilters({ ...filters, dealType: null })}
            />
            <FilterChip
              label="عرض الشارع"
              active={filters.minStreet ? `≥ ${filters.minStreet} م` : null}
              options={[30, 40, 60].map((n) => ({ k: String(n), l: `${n} م فأكثر` }))}
              onPick={(k) => setFilters({ ...filters, minStreet: Number(k) })}
              onClear={() => setFilters({ ...filters, minStreet: null })}
            />
            <FilterChip
              label="الطبقة"
              active={layer !== "deal" ? LAYER_LABELS[layer] : null}
              options={(Object.keys(LAYER_LABELS) as MapLayer[]).map((l) => ({ k: l, l: LAYER_LABELS[l] }))}
              onPick={(k) => setLayer(k as MapLayer)}
              onClear={() => setLayer("deal")}
            />
          </div>
        </div>

        {/* back to workspace */}
        <Link to="/investor" className="absolute right-4 top-3 z-[1001] flex items-center gap-1.5 rounded-full border bg-surface px-3 py-1.5 text-sm shadow-sm hover:bg-secondary">
          <ArrowRight className="size-4" />الأراضي
        </Link>

        {/* bottom-left: minimizable assistant */}
        <div className={`absolute bottom-4 left-4 z-[1002] ${footprint ? "hidden" : ""}`}>
          {chatOpen ? (
            <div className="relative h-[min(520px,70vh)] w-[min(350px,85vw)]">
              <button aria-label="تصغير المساعد" onClick={() => setChatOpen(false)}
                className="absolute left-3 top-3 z-10 grid size-7 place-items-center rounded-full bg-secondary hover:bg-accent">
                <Minus className="size-4" />
              </button>
              <MapAssistant
                parcels={parcels}
                onApplyFilters={(f) => { setFilters(f); setMode("parcels"); }}
                onFocusParcel={setSelected}
              />
            </div>
          ) : (
            <button onClick={() => setChatOpen(true)} className="flex items-center gap-2 rounded-full bg-ink px-4 py-3 text-sm text-ink-foreground shadow-lg">
              <Sparkles className="size-4" />اسألي المساعد
            </button>
          )}
        </div>

        {/* right: parcel inspection */}
        {footprint ? (
          <FootprintOverlay parcels={parcels} district={footprint} year={year} onDistrict={setFootprint} onYear={setYear}
            onClose={() => { setFootprint(); mapRef.current?.flyTo(24.7136, 46.6753, 11); }} />
        ) : (
          selected && mode === "parcels" && <Drawer p={selected} onClose={() => setSelected(null)} onFootprint={(d) => { setSelected(null); setFootprint(d); }} />
        )}

        {/* bottom-right: zoom + closable legend */}
        <div className={`absolute bottom-4 right-4 z-[1000] flex items-end gap-2 ${selected || footprint ? "hidden" : ""}`}>
          {legendOpen ? (
            <div className="relative space-y-1.5 rounded-xl border bg-surface p-3 pl-8 text-xs shadow-sm">
              <button aria-label="إخفاء المفتاح" onClick={() => setLegendOpen(false)} className="absolute left-2 top-2 text-muted-foreground hover:text-foreground">
                <X className="size-3.5" />
              </button>
              {(mode === "districts" ? DISTRICT_LEGEND : LEGENDS[layer]).map((g) => (
                <div key={g.label} className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm" style={{ background: g.color }} />
                  {g.label}
                </div>
              ))}
              <div className="pt-1 text-muted-foreground">
                {mode === "districts" ? "الرقم = عدد أراضي سرج في الحي · حدود الأحياء الرسمية" : "الأسعار بالريال · الإيجار سنوي"}
              </div>
            </div>
          ) : (
            <button onClick={() => setLegendOpen(true)} className="rounded-full border bg-surface px-3 py-1.5 text-xs shadow-sm hover:bg-secondary">المفتاح</button>
          )}
          <div className="flex flex-col rounded-xl border bg-surface shadow-sm">
            <button aria-label="تكبير" onClick={() => mapRef.current?.zoomIn()} className="p-2 hover:bg-secondary">
              <Plus className="size-4" />
            </button>
            <button aria-label="تصغير" onClick={() => mapRef.current?.zoomOut()} className="border-t p-2 hover:bg-secondary">
              <Minus className="size-4" />
            </button>
          </div>
        </div>
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
        <button aria-label={`إزالة ${label}`} onClick={onClear}>
          <X className="size-3.5" />
        </button>
      </span>
    );
  return (
    <span className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex items-center gap-1 rounded-full border bg-surface px-3 py-1.5 text-sm shadow-sm hover:bg-secondary"
      >
        {label}
        <ChevronDown className="size-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-xl border bg-surface p-1 shadow-lg">
          {options.map((o) => (
            <button
              key={o.k}
              onClick={() => {
                onPick(o.k);
                setOpen(false);
              }}
              className="block w-full rounded-lg px-3 py-1.5 text-right text-sm hover:bg-secondary"
            >
              {o.l}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

function Drawer({ p, onClose, onFootprint }: { p: Parcel; onClose: () => void; onFootprint: (d: string) => void }) {
  const { parcels, inquiries } = usePortfolio();
  const ins = getParcelInsight(parcels, p.parcel_id)!;
  const s = ins.segment;
  const openInquiries = inquiries.filter(
    (i) => i.area_of_city_wanted === p.area_of_city && i.land_type_wanted === p.land_type && i.prefers === p.listing_type,
  ).length;
  const district = FOOTPRINT_DISTRICTS.find((d) => (d.match as readonly string[]).includes(p.district_en))?.ar ?? "الملقا";
  return (
    <aside className="absolute bottom-4 right-4 top-16 z-[1001] w-[min(360px,90vw)] overflow-y-auto rounded-3xl border bg-surface p-5 shadow-xl">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="size-1.5 rounded-full bg-primary" />
        الأرض المحددة
      </div>
      <div className="mt-1 flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold">{p.district_ar}</h2>
          <div className="text-sm text-muted-foreground">
            <span className="font-mono">{p.parcel_id}</span> · {AREA_AR[p.area_of_city]} الرياض
          </div>
        </div>
        <button onClick={onClose} aria-label="إغلاق">
          <X className="size-5" />
        </button>
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
            <Row k="سعرها مقابل الوسيط" v={ins.priceDeltaPct == null ? "لا سعر" : pct(ins.priceDeltaPct)!} hot={(ins.priceDeltaPct ?? 0) > 0} />
            <Row k="وسيط الإغلاق" v={`${s.medianClosingDays} يومًا`} />
            <Row k="استفسارات مفتوحة" v={String(openInquiries)} />
          </div>
        )}
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          الوسائط من {s.closedDeals} صفقات مغلقة في الشريحة نفسها. الاستخدام النظامي وحدود القطعة يُتحقَّق منهما لدى الجهة
          المختصة.
        </p>
      </div>
      <button
        onClick={() => onFootprint(district)}
        className="mt-5 flex w-full text-right items-center justify-between rounded-2xl bg-ink p-4 text-ink-foreground"
      >
        <div>
          <div className="font-semibold">بصمة الحي</div>
          <div className="text-xs text-ink-muted">سعر المتر · الصفقات · مدة العرض</div>
        </div>
        <span aria-hidden>←</span>
      </button>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link to="/investor/parcels/$parcelId" params={{ parcelId: p.parcel_id }} className="rounded-full border px-4 py-2 text-sm">
          صفحة الأرض
        </Link>
        <CompareButton id={p.parcel_id} />
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
