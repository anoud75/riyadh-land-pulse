import { Link } from "@tanstack/react-router";
import type { Parcel } from "@/data/types";
import { AREA_AR, DEAL_AR, LAND_AR } from "@/data/types";
import { usePortfolio } from "@/context/PortfolioProvider";
import { sar, STATUS_AR } from "./format";

export function CompareButton({ id }: { id: string }) {
  const { compareIds, toggleCompare } = usePortfolio();
  const on = compareIds.includes(id);
  return (
    <button
      onClick={(e) => { e.preventDefault(); toggleCompare(id); }}
      aria-pressed={on}
      className={`rounded-full border px-3 py-1 text-xs ${on ? "border-primary bg-accent text-accent-foreground" : "hover:bg-secondary"}`}
    >
      {on ? "في المقارنة ✓" : "أضف للمقارنة"}
    </button>
  );
}

export function PriceLine({ p }: { p: Parcel }) {
  if (p.missingPrice)
    return <div className="text-sm text-destructive">السعر غير مسجل — لا تدخل الترتيب بالسعر</div>;
  return (
    <div>
      <span className="font-mono text-xl font-semibold">{sar(p.total_price_sar)}</span>{" "}
      <span className="text-xs text-muted-foreground">ريال{p.listing_type === "lease" ? " / سنة" : ""}</span>
    </div>
  );
}

export function ParcelCard({ p }: { p: Parcel }) {
  return (
    <Link
      to="/investor/parcels/$parcelId"
      params={{ parcelId: p.parcel_id }}
      className="flex flex-col overflow-hidden rounded-2xl border bg-card transition-colors hover:border-primary"
    >
      <ParcelSnapshot parcel={p} className="aspect-[16/7] w-full shrink-0" />
      <div className="flex flex-1 flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">{p.district_ar}</h3>
          <div className="text-xs text-muted-foreground">
            {AREA_AR[p.area_of_city]} · {LAND_AR[p.land_type]} · {DEAL_AR[p.listing_type]} · <span className="font-mono">{p.parcel_id}</span>
          </div>
        </div>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{STATUS_AR[p.status]}</span>
      </div>
      <div className="mt-4"><PriceLine p={p} /></div>
      <dl className="mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-xs">
        <Fact k="المساحة" v={`${sar(p.area_sqm)} م²`} />
        <Fact k="الشارع" v={`${p.street_width_m} م`} />
        <Fact k="في السوق" v={`${p.days_on_market} يومًا`} />
      </dl>
      {p.coordinatesCorrected && <div className="mt-2 text-xs text-muted-foreground">الإحداثيات صُحّحت تلقائيًا</div>}
      <div className="mt-4"><CompareButton id={p.parcel_id} /></div>
      </div>
    </Link>
  );
}

export function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="mt-0.5 font-mono">{v}</dd>
    </div>
  );
}
