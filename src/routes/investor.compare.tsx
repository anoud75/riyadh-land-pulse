import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, ChevronDown, Trophy, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { scoreLands, WEIGHT_LABELS } from "@/lib/weightedCompare";
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
  const [step, setStep] = useState(0);
  const [weights, setWeights] = useState<Record<string, number>>({});

  useEffect(() => {
    import("@/data/overturePlaces.json").then((m) => setPlaces(m.default as unknown as OpenPlacesFile));
  }, []);

  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(null), 3000);
    return () => clearTimeout(t);
  }, [hint]);

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

  const ranked = rows.filter((r) => r.best);
  const wOf = (k: string) => weights[k] ?? 3;
  const setW = (k: string, v: number) => setWeights((s) => ({ ...s, [k]: v }));
  const totalW = ranked.reduce((s, r) => s + wOf(r.key), 0);
  const results = useMemo(() => {
    const vals: Record<string, Record<string, number | null>> = {};
    for (const i of items) {
      const c = ctx[i.parcel.parcel_id]!;
      vals[i.parcel.parcel_id] = Object.fromEntries(ranked.map((r) => [r.key, r.best!(i, c)]));
    }
    return scoreLands(items.map((i) => i.parcel.parcel_id), ranked.map((r) => ({ key: r.key, label: r.label, dir: r.dir ?? 1, weight: wOf(r.key) })), vals);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, ctx, keys, weights]);
  const byId = Object.fromEntries(items.map((i) => [i.parcel.parcel_id, i]));
  const STEPS = ["الأراضي", "المعايير", "الأهمية", "النتيجة"];
  const canGo = (s: number) => s === 0 || (items.length >= 2 && (s === 1 || ranked.length > 0));
  const WeightSelect = ({ k }: { k: string }) => (
    <select value={wOf(k)} onChange={(e) => setW(k, Number(e.target.value))} aria-label="الأهمية" className="rounded-md border bg-background px-2 py-1 text-xs">
      {WEIGHT_LABELS.map((l, n) => <option key={n} value={n}>{n} · {l}</option>)}
    </select>
  );

  return (
    <div>
      <h1 className="text-3xl font-bold">المقارنة</h1>
      <p className="mt-2 text-muted-foreground">خذ وقتك: اختر الأراضي، ثم المعايير، ثم حدّد أهمية كل معيار لك، وشاهد الأنسب.</p>

      <ol className="mt-6 flex flex-wrap gap-2">
        {STEPS.map((s, n) => (
          <li key={s}>
            <button disabled={!canGo(n)} onClick={() => setStep(n)} className={`rounded-full border px-4 py-2 text-sm disabled:opacity-40 ${step === n ? "border-primary bg-primary text-primary-foreground" : n < step ? "border-primary text-primary" : "bg-card"}`}>
              {n + 1}. {s}
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-2xl border bg-card p-6">
        {step === 0 && (
          <div>
            <h2 className="text-lg font-semibold">اختر من ٢ إلى ٥ أراضٍ</h2>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Popover open={openP} onOpenChange={setOpenP}>
                <PopoverTrigger className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm hover:border-primary">
                  الأراضي ({items.length}/{MAX_COMPARE}) <ChevronDown className="size-4" />
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
                            <CommandItem key={p.parcel_id} value={`${p.district_ar} ${p.parcel_id}`} onSelect={() => pick(p.parcel_id)}>
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
              {hint && <span className="text-xs text-destructive">{hint}</span>}
              {items.map((i) => (
                <span key={i.parcel.parcel_id} className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground">
                  {i.parcel.district_ar} · {i.parcel.parcel_id}
                  <button aria-label={`إزالة ${i.parcel.district_ar}`} onClick={() => toggleCompare(i.parcel.parcel_id)}><X className="size-3" /></button>
                </span>
              ))}
            </div>
            {items.length < 2 && <p className="mt-4 text-sm text-muted-foreground">{items.length === 0 ? "اختر أرضين على الأقل." : "اختر أرضًا ثانية — أقل عدد للمقارنة أرضان."}</p>}
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold">ما المعايير التي تهمك؟</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {GROUPS.map((g) => (
                <div key={g} className="rounded-xl border p-3">
                  <button onClick={() => toggleGroup(g)} className="mb-2 text-sm font-semibold text-primary">{g}</button>
                  {ROWS.filter((r) => r.group === g).map((r) => (
                    <label key={r.key} className="flex cursor-pointer items-center gap-2 py-1 text-sm">
                      <Checkbox checked={keys.includes(r.key)} onCheckedChange={() => toggleKey(r.key)} />
                      <span className="flex-1">{r.label}</span>
                      {!r.best && <span className="text-[10px] text-muted-foreground">للعرض فقط</span>}
                    </label>
                  ))}
                </div>
              ))}
            </div>
            {ranked.length === 0 && <p className="mt-4 text-sm text-destructive">اختر معيارًا واحدًا قابلًا للترتيب على الأقل.</p>}
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold">كم يهمك كل معيار؟</h2>
            <p className="mt-1 text-sm text-muted-foreground">٠ = غير مهم، ٥ = أساسي. النسبة توضح وزن المعيار في النتيجة.</p>
            <div className="mt-4 space-y-4">
              {ranked.map((r) => {
                const w = wOf(r.key);
                const share = totalW ? Math.round((w / totalW) * 100) : 0;
                return (
                  <div key={r.key} className="grid items-center gap-3 sm:grid-cols-[1fr_200px_140px]">
                    <div>
                      <div className="text-sm font-medium">{r.label}</div>
                      <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} /></div>
                    </div>
                    <Slider min={0} max={5} step={1} value={[w]} onValueChange={(v) => setW(r.key, v[0] ?? 0)} aria-label={r.label} />
                    <div className="text-sm"><span className="font-semibold">{WEIGHT_LABELS[w]}</span> <span className="text-muted-foreground">· {share}%</span></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && results.length > 0 && (() => {
          const win = results[0]!;
          const wp = byId[win.id]!.parcel;
          const tie = results[1] && results[1].score === win.score;
          return (
            <div>
              <div className="rounded-2xl border border-primary/40 bg-primary/5 p-5">
                <div className="flex items-center gap-2 text-sm text-primary"><Trophy className="size-4" /> {tie ? "تعادل في المرتبة الأولى" : "الأنسب لك حسب معاييرك"}</div>
                <div className="mt-2 text-2xl font-bold">أرض {wp.parcel_id} في حي {wp.district_ar}</div>
                <div className="mt-1 text-sm text-muted-foreground">نسبة التوافق {win.score} من 100{win.reasons.length > 0 && <> · تفوّقت في: {win.reasons.join("، ")}</>}</div>
                {win.skipped.length > 0 && <div className="mt-1 text-xs text-muted-foreground">لم تُحتسب لعدم توفر البيانات: {win.skipped.join("، ")}</div>}
              </div>

              <div className="mt-5 space-y-2">
                {results.map((r, n) => (
                  <div key={r.id} className="grid grid-cols-[2rem_1fr_3rem] items-center gap-3 text-sm">
                    <span className="font-mono text-muted-foreground">{n + 1}</span>
                    <div>
                      <div>{byId[r.id]!.parcel.district_ar} <span className="font-mono text-xs text-muted-foreground">{r.id}</span>{r.skipped.length > 0 && <span className="text-[10px] text-muted-foreground"> · بيانات ناقصة: {r.skipped.join("، ")}</span>}</div>
                      <div className="mt-1 h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${r.score}%` }} /></div>
                    </div>
                    <span className="font-mono font-semibold">{r.score}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-3 text-right">المعيار</th>
                      <th className="p-3 text-right">الأهمية</th>
                      {results.map((r) => (
                        <th key={r.id} className="p-3 text-right align-top">
                          <div className="font-semibold">{byId[r.id]!.parcel.district_ar}</div>
                          <div className="font-mono text-xs text-muted-foreground">{r.id}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const b = bestOf(row);
                      return (
                        <tr key={row.key} className="border-b last:border-0">
                          <td className="p-3 text-muted-foreground" title={row.note}>{row.label}{row.note && <div className="text-[10px]">تقدير</div>}</td>
                          <td className="p-3">{row.best ? <WeightSelect k={row.key} /> : <span className="text-[10px] text-muted-foreground">للعرض فقط</span>}</td>
                          {results.map((r) => {
                            const i = byId[r.id]!;
                            const c = ctx[r.id]!;
                            const isBest = b != null && row.best!(i, c) === b;
                            const cell = r.cells[row.key];
                            return (
                              <td key={r.id} className={`p-3 font-mono ${isBest ? "text-primary" : ""}`}>
                                {row.value(i, c)} {isBest && <span className="font-sans text-xs">● الأفضل</span>}
                                {row.best && wOf(row.key) > 0 && <div className="font-sans text-[10px] text-muted-foreground">{cell?.points == null ? "لم يُحتسب" : `${cell.points} نقطة`}</div>}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">غيّر الأهمية من الجدول مباشرة وستتحدث النتيجة فورًا.</p>
            </div>
          );
        })()}

        <div className="mt-6 flex flex-wrap justify-between gap-2">
          <div className="flex gap-2">
            {step > 0 && <button onClick={() => setStep(step - 1)} className="rounded-full border px-4 py-2 text-sm">السابق</button>}
            {step === 3 && <button onClick={() => setStep(2)} className="rounded-full border px-4 py-2 text-sm">عدّل الأهمية</button>}
            {step === 3 && <button onClick={() => { setWeights({}); setKeys(DEFAULT_KEYS); setStep(0); }} className="rounded-full border px-4 py-2 text-sm">ابدأ من جديد</button>}
          </div>
          {step < 3 && <button disabled={!canGo(step + 1)} onClick={() => setStep(step + 1)} className="rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground disabled:opacity-40">{step === 2 ? "اعرض النتيجة" : "التالي"}</button>}
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">الخدمات: Overture Maps · الكثافة السكانية: {POP_ESTIMATE_NOTE}</p>
    </div>
  );
}
