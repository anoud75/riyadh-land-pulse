import { createFileRoute, ClientOnly, Link } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { X } from "lucide-react";
import { usePortfolio } from "@/context/PortfolioProvider";
import { AREA_AR, DEAL_AR, LAND_AR, type Parcel } from "@/data/types";
import { LAYER_LABELS, LEGENDS, type MapLayer } from "@/lib/mapLayers";
import { getParcelInsight } from "@/lib/investorEngine";
import { FOOTPRINT_DISTRICTS } from "@/data/districtSeries";
import { CompareButton, Fact, PriceLine } from "@/components/investor/ParcelCard";
import { pct, sar, STATUS_AR } from "@/components/investor/format";

const ParcelMap = lazy(() => import("@/components/investor/ParcelMap"));

export const Route = createFileRoute("/investor/map")({
  head: () => ({
    meta: [
      { title: "الخريطة — سرج" },
      { name: "description", content: "أراضي سرج على خريطة الرياض مع نطاقات الوصول والمنافسين." },
      { property: "og:title", content: "الخريطة — سرج" },
      { property: "og:description", content: "خريطة الأراضي ونطاق الوصول." },
    ],
    links: [{ rel: "stylesheet", href: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" }],
  }),
  component: MapPage,
});

function MapPage() {
  const { parcels } = usePortfolio();
  const [layer, setLayer] = useState<MapLayer>("deal");
  const [selected, setSelected] = useState<Parcel | null>(null);
  const loading = <div className="grid size-full place-items-center text-sm text-muted-foreground">جارٍ تحميل الخريطة…</div>;

  return (
    <div className="-mx-6 -my-10">
      <div className="flex flex-wrap items-center gap-2 border-b bg-surface px-6 py-3">
        <h1 className="ml-4 text-lg font-bold">الخريطة</h1>
        {(Object.keys(LAYER_LABELS) as MapLayer[]).map((l) => (
          <button key={l} onClick={() => setLayer(l)} aria-pressed={layer === l}
            className={`rounded-full border px-3 py-1 text-sm ${layer === l ? "bg-foreground text-background" : "bg-surface hover:bg-secondary"}`}>
            {LAYER_LABELS[l]}
          </button>
        ))}
        <div className="mr-auto flex flex-wrap gap-3 text-xs text-muted-foreground">
          {LEGENDS[layer].map((g) => (
            <span key={g.label} className="flex items-center gap-1"><span className="size-2.5 rounded-full" style={{ background: g.color }} />{g.label}</span>
          ))}
        </div>
      </div>
      <div className="relative h-[calc(100vh-7.5rem)] min-h-[480px]">
        <ClientOnly fallback={loading}>
          <Suspense fallback={loading}>
            <ParcelMap parcels={parcels} layer={layer} selected={selected} onSelect={setSelected} />
          </Suspense>
        </ClientOnly>
        {selected && <Drawer p={selected} onClose={() => setSelected(null)} />}
      </div>
    </div>
  );
}

function Drawer({ p, onClose }: { p: Parcel; onClose: () => void }) {
  const { parcels } = usePortfolio();
  const ins = getParcelInsight(parcels, p.parcel_id)!;
  const s = ins.segment;
  const district = FOOTPRINT_DISTRICTS.find((d) => (d.match as readonly string[]).includes(p.district_en))?.ar ?? "الملقا";
  return (
    <aside className="absolute inset-y-0 right-0 z-[1000] w-full max-w-sm overflow-y-auto border-l bg-surface p-5 shadow-xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{p.district_ar}</h2>
          <div className="text-sm text-muted-foreground">{AREA_AR[p.area_of_city]} · {LAND_AR[p.land_type]} · {DEAL_AR[p.listing_type]} · <span className="font-mono">{p.parcel_id}</span></div>
        </div>
        <button onClick={onClose} aria-label="إغلاق"><X className="size-5" /></button>
      </div>
      <div className="mt-2 text-xs"><span className="rounded-full bg-secondary px-2 py-0.5">{STATUS_AR[p.status]}</span></div>
      <div className="mt-4"><PriceLine p={p} /></div>
      <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <Fact k="المساحة" v={`${sar(p.area_sqm)} م²`} />
        <Fact k="الشارع" v={`${p.street_width_m} م`} />
        <Fact k="في السوق" v={`${p.days_on_market} يومًا`} />
      </dl>
      <div className="mt-5 rounded-xl border p-4 text-sm">
        <div className="font-medium">مقابل شريحتها</div>
        {s.insufficientSample ? (
          <p className="mt-1 text-muted-foreground">عينة غير كافية ({s.closedDeals} صفقة مغلقة)، لا يُعرض وسيط.</p>
        ) : (
          <p className="mt-1 text-muted-foreground">
            {ins.priceDeltaPct == null ? "لا سعر للمقارنة" : `${pct(ins.priceDeltaPct)} عن وسيط ${sar(s.medianPricePerSqm)} ريال`} · {p.days_on_market} يومًا مقابل وسيط {s.medianClosingDays} (×{ins.domMultiplier})
          </p>
        )}
      </div>
      <div className="mt-4 rounded-xl border p-4 text-xs text-muted-foreground">
        نطاقات 5/10/15 دقيقة ومواقع المنافسين تقدير توضيحي، لا من شبكة طرق فعلية. الاستخدام النظامي وحدود القطعة لم يُتحقق منهما.
        {p.coordinatesCorrected && " الإحداثيات صُحّحت تلقائيًا."}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link to="/investor/footprint/$district" params={{ district }} className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">افتح بصمة الحي</Link>
        <Link to="/investor/parcels/$parcelId" params={{ parcelId: p.parcel_id }} className="rounded-full border px-4 py-2 text-sm">صفحة الأرض</Link>
        <CompareButton id={p.parcel_id} />
      </div>
    </aside>
  );
}
