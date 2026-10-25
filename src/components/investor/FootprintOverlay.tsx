import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Parcel } from "@/data/types";
import { FOOTPRINT_DISTRICTS, YEARS, getDistrictFootprint, type DistrictFootprint } from "@/data/districtSeries";
import { ThreeArmedFootprintSVG } from "./ThreeArmedFootprintSVG";
import { sar } from "./format";

const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

/** Smoothly tween every numeric bar value when the year or district changes. */
function useTweened(target: DistrictFootprint, ms = 550): DistrictFootprint {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = from.current;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      const next: DistrictFootprint = {
        ...target,
        price: target.price.map((p, i) => ({ ...p, residential: lerp(start.price[i]?.residential ?? 0, p.residential, e), commercial: lerp(start.price[i]?.commercial ?? 0, p.commercial, e) })),
        deals: target.deals.map((d, i) => ({ ...d, sale: lerp(start.deals[i]?.sale ?? 0, d.sale, e), lease: lerp(start.deals[i]?.lease ?? 0, d.lease, e) })),
        population: target.population.map((p, i) => ({ ...p, male: lerp(start.population[i]?.male ?? 0, p.male, e), female: lerp(start.population[i]?.female ?? 0, p.female, e) })),
      };
      setShown(next);
      from.current = next;
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return shown;
}

const SRC = { sarj: "سرج", gastat: "مؤشر الهيئة", estimate: "تقدير" } as const;
const glass = "rounded-2xl border border-border/60 bg-background/90 shadow-xl backdrop-blur-md";

export function FootprintOverlay({
  parcels, district, year, onDistrict, onYear, onClose,
}: {
  parcels: Parcel[]; district: string; year: number;
  onDistrict: (d: string) => void; onYear: (y: number) => void; onClose: () => void;
}) {
  const [target, setTarget] = useState(() => getDistrictFootprint(parcels, district, year));
  useEffect(() => setTarget(getDistrictFootprint(parcels, district, year)), [parcels, district, year]);
  const data = useTweened(target);
  const cur = data.price.find((p) => p.year === year)!;
  const thousands = (n: number) => `${sar(Math.round(n / 1000))} ألف`;

  return (
    <div dir="rtl" className="contents tabular-nums">
      <div className="pointer-events-none absolute inset-0 z-[500]"
        style={{ background: "radial-gradient(circle at calc(50% - 160px) 50%, transparent 70px, color-mix(in oklab, var(--background) 45%, transparent) 260px)" }} />

      {/* glyph */}
      <div className="pointer-events-none absolute inset-0 z-[600] flex items-center justify-center pr-[320px]">
        <div className={`${glass} pointer-events-auto w-[min(600px,64vh)] p-4`}>
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-bold">{data.district}</h2>
            <span className="text-sm text-muted-foreground">{year}</span>
          </div>
          <ThreeArmedFootprintSVG data={data} overlay />
          <div className="flex justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-chart-blue" />سكني · بيع · ذكور</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-primary" />تجاري · إيجار · إناث</span>
          </div>
        </div>
      </div>

      {/* district picker */}
      <div className="absolute inset-x-0 top-16 z-[1000] flex justify-center px-4">
        <div className={`${glass} flex flex-wrap justify-center gap-1.5 rounded-full p-1`}>
          {FOOTPRINT_DISTRICTS.map((d) => (
            <button key={d.ar} onClick={() => onDistrict(d.ar)} aria-pressed={d.ar === data.district}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${d.ar === data.district ? "bg-foreground text-background" : "hover:bg-secondary"}`}>
              {d.ar}
            </button>
          ))}
          <button onClick={onClose} aria-label="إغلاق بصمة الحي" className="rounded-full px-2 hover:bg-secondary"><X className="size-4" /></button>
        </div>
      </div>

      {/* year selector + footnote */}
      <div className="absolute inset-x-0 bottom-4 z-[1000] flex flex-col items-center gap-2 px-4">
        <div className={`${glass} flex items-center gap-1 rounded-full p-1`}>
          <span className="px-2 text-xs text-muted-foreground">السنة</span>
          {YEARS.map((y) => (
            <button key={y} onClick={() => onYear(y)} aria-pressed={y === year}
              className={`rounded-full px-2.5 py-1 text-sm transition-colors ${y === year ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}>
              {y}
            </button>
          ))}
        </div>
        <p className={`${glass} max-w-2xl rounded-xl px-3 py-1.5 text-center text-[11px] leading-relaxed text-muted-foreground`}>
          المصدر: الهيئة العامة للإحصاء — الرقم القياسي لأسعار العقارات (أرض سكنية/تجارية، المملكة، 2023 = 100) والتقديرات السكانية لمنطقة الرياض حتى 2022{data.popSource === "estimate" ? "، مُسقطة إلى 2026 بنمو 2.5% سنويًا (تقدير)" : ""}.
          سعر 2026 من سجل سرج؛ 2019–2020 تقدير، وتوزيع الجنس تقديري.
        </p>
      </div>

      {/* numbers panel */}
      <aside className={`${glass} absolute bottom-28 right-4 top-16 z-[1001] w-[min(300px,85vw)] space-y-4 overflow-y-auto p-4 text-sm`}>
        <div>
          <div className="text-xs text-muted-foreground">{data.parcelsInDistrict} أرض · {data.closedDeals} صفقة مغلقة</div>
          <div className="mt-2 font-medium">سعر المتر {year} · ريال</div>
          <div className="mt-1 flex justify-between"><span>سكني <small className="text-muted-foreground">({SRC[cur.residentialSrc]})</small></span><span className="font-semibold">{sar(cur.residential)}</span></div>
          <div className="flex justify-between"><span>تجاري <small className="text-muted-foreground">({SRC[cur.commercialSrc]})</small></span><span className="font-semibold">{sar(cur.commercial)}</span></div>
        </div>
        <div>
          <div className="font-medium">الصفقات حسب أيام العرض</div>
          {data.deals.map((d) => (
            <div key={d.label} className="flex justify-between"><span>{d.label}</span><span>بيع {d.sale} · إيجار {d.lease}</span></div>
          ))}
          <p className="mt-1 text-xs text-muted-foreground">
            {data.medianDays == null ? "عينة غير كافية — لا يُعرض وسيط." : `الوسيط ${data.medianDays} يومًا.`} لقطة 11 أغسطس 2026.
          </p>
        </div>
        <div>
          <div className="font-medium">سكان منطقة الرياض {data.popYear}{data.popSource === "estimate" ? " (تقدير: GASTAT 2022 + نمو 2.5% سنويًا)" : " · GASTAT"}</div>
          <div className="text-xs text-muted-foreground">الإجمالي {thousands(data.populationTotal)}</div>
          {data.population.map((p) => (
            <div key={p.band} className="flex justify-between"><span>{p.band}</span><span>ذ {thousands(p.male)} · إ {thousands(p.female)}</span></div>
          ))}
          {year > 2022 && <p className="mt-1 text-xs text-muted-foreground">آخر إصدار للهيئة 2022.</p>}
        </div>
      </aside>
    </div>
  );
}
