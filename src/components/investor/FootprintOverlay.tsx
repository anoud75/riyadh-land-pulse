import { X } from "lucide-react";
import type { Parcel } from "@/data/types";
import { FOOTPRINT_DISTRICTS, YEARS, getDistrictFootprint } from "@/data/districtSeries";
import { ThreeArmedFootprintSVG } from "./ThreeArmedFootprintSVG";
import { sar } from "./format";

export function FootprintOverlay({
  parcels,
  district,
  year,
  onDistrict,
  onYear,
  onClose,
}: {
  parcels: Parcel[];
  district: string;
  year: number;
  onDistrict: (d: string) => void;
  onYear: (y: number) => void;
  onClose: () => void;
}) {
  const data = getDistrictFootprint(parcels, district, year);
  const cur = data.price.find((p) => p.year === year)!;
  return (
    <>
      {/* soft fade on the map edges, clear lens in the middle */}
      <div
        className="pointer-events-none absolute inset-0 z-[500]"
        style={{ background: "radial-gradient(circle at 50% 50%, transparent 90px, color-mix(in oklab, var(--background) 55%, transparent) 200px)" }}
      />
      <div className="pointer-events-none absolute inset-0 z-[600] flex items-center justify-center">
        <div className="w-[min(620px,62vh)] pt-6">
          <h2 className="text-center text-3xl font-bold [text-shadow:0_0_8px_var(--background)]">{data.district}</h2>
          <ThreeArmedFootprintSVG data={data} overlay />
        </div>
      </div>

      {/* district picker */}
      <div className="absolute inset-x-0 top-20 z-[1000] flex justify-center px-4">
        <div className="flex flex-wrap justify-center gap-1.5 rounded-full border bg-surface/95 p-1 shadow-sm">
          {FOOTPRINT_DISTRICTS.map((d) => (
            <button key={d.ar} onClick={() => onDistrict(d.ar)} aria-pressed={d.ar === data.district}
              className={`rounded-full px-3 py-1 text-sm ${d.ar === data.district ? "bg-foreground text-background" : "hover:bg-secondary"}`}>
              {d.ar}
            </button>
          ))}
          <button onClick={onClose} aria-label="إغلاق بصمة الحي" className="rounded-full px-2 hover:bg-secondary"><X className="size-4" /></button>
        </div>
      </div>

      {/* year selector */}
      <div className="absolute inset-x-0 bottom-5 z-[1000] flex justify-center">
        <div className="flex items-center gap-1 rounded-full border bg-surface/95 p-1 shadow-sm">
          <span className="px-2 text-xs text-muted-foreground">السنة</span>
          {YEARS.map((y) => (
            <button key={y} onClick={() => onYear(y)} aria-pressed={y === year}
              className={`rounded-full px-2.5 py-1 font-mono text-sm ${y === year ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}>
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* numbers panel */}
      <aside className="absolute bottom-20 right-4 top-36 z-[1001] w-[min(300px,85vw)] space-y-4 overflow-y-auto rounded-3xl border bg-surface/95 p-4 text-sm shadow-xl">
        <div>
          <div className="text-xs text-muted-foreground">{data.parcelsInDistrict} أرض · {data.closedDeals} صفقة مغلقة</div>
          <div className="mt-2 font-medium">سعر المتر {year}</div>
          <div className="mt-1 flex justify-between"><span>سكني</span><span className="font-mono">{sar(cur.residential)}{cur.residentialReal ? " ●" : ""}</span></div>
          <div className="flex justify-between"><span>تجاري</span><span className="font-mono">{sar(cur.commercial)}{cur.commercialReal ? " ●" : ""}</span></div>
          <p className="mt-1 text-xs text-muted-foreground">● من سجل سرج. باقي الأرقام توضيحية.</p>
        </div>
        <div>
          <div className="font-medium">الصفقات حسب أيام العرض</div>
          {data.deals.map((d) => (
            <div key={d.label} className="flex justify-between font-mono"><span>{d.label}</span><span>بيع {d.sale} · إيجار {d.lease}</span></div>
          ))}
          <p className="mt-1 text-xs text-muted-foreground">
            {data.medianDays == null ? "عينة غير كافية — لا يُعرض وسيط." : `الوسيط ${data.medianDays} يومًا.`}
          </p>
        </div>
        <div>
          <div className="font-medium">الهرم السكاني</div>
          {data.population.map((p) => (
            <div key={p.band} className="flex justify-between font-mono"><span>{p.band}</span><span>ذ {sar(p.male)} · إ {sar(p.female)}</span></div>
          ))}
          <p className="mt-1 text-xs text-muted-foreground">بيانات توضيحية — ليست من الهيئة العامة للإحصاء</p>
        </div>
      </aside>
    </>
  );
}
