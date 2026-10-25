import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { usePortfolio } from "@/context/PortfolioProvider";
import { AREA_AR, DEAL_AR, LAND_AR } from "@/data/types";
import { compareParcels, type ParcelInsight } from "@/lib/investorEngine";
import { pct, sar } from "@/components/investor/format";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import geoRaw from "@/data/riyadhDistricts.json";
import type { DistrictCollection } from "@/lib/districtStats";
import { districtPopulation2026, POP_ESTIMATE_NOTE } from "@/lib/districtPopulation";
import { populationAt, servicesNear, SERVICE_RADIUS_M } from "@/lib/compareMetrics";
import type { OpenPlacesFile } from "@/lib/openPlaces";
import { CATEGORY_AR, type PlaceCategory } from "@/lib/siteSuitability";

export const Route = createFileRoute("/investor/compare")({
  head: () => ({
    meta: [
      { title: "المقارنة — سرج" },
      { name: "description", content: "اختر الأراضي والمعايير وقارن السعر والموقع والخدمات والكثافة السكانية جنبًا إلى جنب." },
      { property: "og:title", content: "المقارنة — سرج" },
      { property: "og:description", content: "مقارنة الأراضي بالمعايير التي تختارها." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Compare,
});

const GEO = geoRaw as unknown as DistrictCollection;
const POPS = districtPopulation2026(GEO);

type Ctx = { services: Partial<Record<PlaceCategory, number>> | null; population: number | null };
type Row = { key: string; group: string; label: string; value: (i: ParcelInsight, c: Ctx) => ReactNode; best?: (i: ParcelInsight, c: Ctx) => number | null; dir?: 1 | -1; note?: string };

const svc = (cat: PlaceCategory): Row => ({
  key: `svc-${cat}`, group: "الخدمات", label: `${CATEGORY_AR[cat]} (≤ ${SERVICE_RADIUS_M / 1000} كم)`,
  value: (_i, c) => (c.services ? c.services[cat] ?? 0 : "…"), best: (_i, c) => (c.services ? c.services[cat] ?? 0 : null), dir: 1,
});

const ROWS: Row[] = [
  { key: "area", group: "الموقع", label: "المنطقة", value: (i) => AREA_AR[i.parcel.area_of_city] },
  { key: "district", group: "الموقع", label: "الحي", value: (i) => i.parcel.district_ar },
  { key: "type", group: "الموقع", label: "النوع", value: (i) => `${LAND_AR[i.parcel.land_type]} · ${DEAL_AR[i.parcel.listing_type]}` },
  { key: "street", group: "الموقع", label: "عرض الشارع", value: (i) => `${i.parcel.street_width_m} م`, best: (i) => i.parcel.street_width_m, dir: 1 },
  { key: "price", group: "السعر", label: "السعر الإجمالي", value: (i) => (i.parcel.missingPrice ? "غير مسجل" : `${sar(i.parcel.total_price_sar)} ريال`), best: (i) => i.parcel.total_price_sar, dir: -1 },
  { key: "ppsqm", group: "السعر", label: "سعر المتر", value: (i) => (i.parcel.missingPrice ? "غير مسجل" : `${sar(i.parcel.price_per_sqm_sar)} ريال`), best: (i) => i.parcel.price_per_sqm_sar, dir: -1 },
  { key: "size", group: "السعر", label: "المساحة", value: (i) => `${sar(i.parcel.area_sqm)} م²`, best: (i) => i.parcel.area_sqm, dir: 1 },
  { key: "median", group: "السوق", label: "وسيط سعر المتر في الشريحة", value: (i) => (i.segment.insufficientSample ? "عينة غير كافية" : `${sar(i.segment.medianPricePerSqm)} ريال`) },
  { key: "delta", group: "السوق", label: "الفرق عن الوسيط", value: (i) => (i.segment.insufficientSample ? "عينة غير كافية" : pct(i.priceDeltaPct) ?? "—"), best: (i) => (i.segment.insufficientSample ? null : i.priceDeltaPct), dir: -1 },
  { key: "dom", group: "السوق", label: "أيام في السوق", value: (i) => `${i.parcel.days_on_market} يومًا` },
  { key: "dommult", group: "السوق", label: "هامش التفاوض (أيام السوق ÷ وسيط الإغلاق)", value: (i) => (i.domMultiplier == null ? "عينة غير كافية" : `×${i.domMultiplier}`), best: (i) => i.domMultiplier, dir: 1 },
  { key: "deals", group: "السوق", label: "صفقات مغلقة في الشريحة", value: (i) => i.segment.closedDeals },
  { key: "pop", group: "السكان", label: "الكثافة السكانية للحي (2026)", value: (_i, c) => (c.population == null ? "غير متاح" : `${sar(c.population)} نسمة`), best: (_i, c) => c.population, dir: 1, note: POP_ESTIMATE_NOTE },
  ...(["hospital", "school", "pharmacy", "supermarket", "mosque", "cafe", "restaurant", "park", "gym", "shopping_mall"] as PlaceCategory[]).map(svc),
];
const GROUPS = [...new Set(ROWS.map((r) => r.group))];
const DEFAULT_KEYS = ["area", "type", "price", "ppsqm", "size", "delta", "pop", "svc-hospital", "svc-school", "svc-supermarket"];

function Compare() {
  const { parcels, compareIds, toggleCompare } = usePortfolio();
  const items = compareParcels(parcels, compareIds);
  const [keys, setKeys] = useState<string[]>(DEFAULT_KEYS);
  const [places, setPlaces] = useState<OpenPlacesFile | null>(null);
  const [openP, setOpenP] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    import("@/data/overturePlaces.json").then((m) => setPlaces(m.default as unknown as OpenPlacesFile));
  }, []);

  const ctx = useMemo(() => {
    const out: Record<string, Ctx> = {};
    for (const i of items) {
      const p = i.parcel;
      out[p.parcel_id] = { services: places ? servicesNear(places, p.lat, p.lng) : null, population: populationAt(GEO, POPS, p.lat, p.lng)?.population ?? null };
    }
    return out;
  }, [items, places]);

  const rows = ROWS.filter((r) => keys.includes(r.key));
  const bestOf = (r: Row) => {
    if (!r.best) return null;
    const vals = items.map((i) => r.best!(i, ctx[i.parcel.parcel_id]!)).filter((v): v is number => v != null);
    if (vals.length < 2 || new Set(vals).size < 2) return null;
    return r.dir === 1 ? Math.max(...vals) : Math.min(...vals);
  };
  const toggleKey = (k: string) => setKeys((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  const MAX_COMPARE = 5;
  const atLimit = compareIds.length >= MAX_COMPARE;
  const pick = (id: string) => {
    if (!compareIds.includes(id) && atLimit) {
      setHint("أقصى عدد للمقارنة هو ٥ أراضٍ — أزل واحدة أولًا.");
      return;
    }
    toggleCompare(id);
  };
  const toggleGroup = (g: string) => {
    const gk = ROWS.filter((r) => r.group === g).map((r) => r.key);
    const all = gk.every((k) => keys.includes(k));
    setKeys((s) => (all ? s.filter((k) => !gk.includes(k)) : [...new Set([...s, ...gk])]));
  };

  return (
    <div>
      <h1 className="text-3xl font-bold">المقارنة</h1>
      <p className="mt-2 text-muted-foreground">اختر الأراضي والمعايير، وتظهر علامة «الأفضل» حيث يصحّ الترتيب.</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Popover open={openP} onOpenChange={setOpenP}>
          <PopoverTrigger className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm hover:border-primary">
            الأراضي ({items.length}) <ChevronDown className="size-4" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-0">
            <Command>
              <CommandInput placeholder="ابحث بالحي أو الرقم…" />
              <CommandList>
                <CommandEmpty>لا نتائج</CommandEmpty>
                <CommandGroup>
                  {parcels.map((p) => {
                    const on = compareIds.includes(p.parcel_id);
                    return (
                      <CommandItem key={p.parcel_id} value={`${p.district_ar} ${p.parcel_id}`} onSelect={() => toggleCompare(p.parcel_id)}>
                        <Check className={`size-4 ${on ? "opacity-100 text-primary" : "opacity-0"}`} />
                        <span className="flex-1">{p.district_ar} · {LAND_AR[p.land_type]}</span>
                        <span className="font-mono text-xs text-muted-foreground">{p.parcel_id}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm hover:border-primary">
            المعايير ({keys.length}) <ChevronDown className="size-4" />
          </PopoverTrigger>
          <PopoverContent align="start" className="max-h-[420px] w-80 overflow-y-auto">
            {GROUPS.map((g) => (
              <div key={g} className="mb-3">
                <button onClick={() => toggleGroup(g)} className="mb-1 text-xs font-semibold text-primary">{g}</button>
                {ROWS.filter((r) => r.group === g).map((r) => (
                  <label key={r.key} className="flex cursor-pointer items-center gap-2 py-1 text-sm">
                    <Checkbox checked={keys.includes(r.key)} onCheckedChange={() => toggleKey(r.key)} />
                    {r.label}
                  </label>
                ))}
              </div>
            ))}
          </PopoverContent>
        </Popover>

        {items.map((i) => (
          <span key={i.parcel.parcel_id} className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground">
            {i.parcel.district_ar}
            <button aria-label={`إزالة ${i.parcel.district_ar}`} onClick={() => toggleCompare(i.parcel.parcel_id)}><X className="size-3" /></button>
          </span>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="mt-8 rounded-2xl border bg-card p-8 text-center text-muted-foreground">اختر أرضين أو أكثر من قائمة «الأراضي» لبدء المقارنة.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-4" />
                {items.map((i) => (
                  <th key={i.parcel.parcel_id} className="p-4 text-right align-top">
                    <div className="text-lg font-semibold">{i.parcel.district_ar}</div>
                    <div className="font-mono text-xs text-muted-foreground">{i.parcel.parcel_id}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const b = bestOf(r);
                const newGroup = idx === 0 || rows[idx - 1]!.group !== r.group;
                return [
                  newGroup && (
                    <tr key={`g-${r.group}`} className="bg-muted/50"><td colSpan={items.length + 1} className="px-4 py-2 text-xs font-semibold text-muted-foreground">{r.group}</td></tr>
                  ),
                  <tr key={r.key} className="border-b last:border-0">
                    <td className="p-4 text-muted-foreground" title={r.note}>{r.label}{r.note && <div className="text-[10px]">تقدير</div>}</td>
                    {items.map((i) => {
                      const c = ctx[i.parcel.parcel_id]!;
                      const isBest = b != null && r.best!(i, c) === b;
                      return (
                        <td key={i.parcel.parcel_id} className={`p-4 font-mono ${isBest ? "text-primary" : ""}`}>
                          {r.value(i, c)} {isBest && <span className="font-sans text-xs">● الأفضل</span>}
                        </td>
                      );
                    })}
                  </tr>,
                ];
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">الخدمات: Overture Maps · الكثافة السكانية: {POP_ESTIMATE_NOTE}</p>
    </div>
  );
}
