import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { usePortfolio } from "@/context/PortfolioProvider";
import { AREAS, AREA_AR, LAND_AR, DEAL_AR, type Parcel } from "@/data/types";
import { isAvailable, isPriced } from "@/lib/portfolioEngine";
import { CompareButton, Fact, ParcelCard, PriceLine } from "@/components/investor/ParcelCard";
import { sar } from "@/components/investor/format";

type Search = {
  all?: boolean;
  area?: string;
  land?: string;
  deal?: string;
  budget?: number;
  street?: number;
  sort?: "newest" | "price" | "street" | "days";
};

export const Route = createFileRoute("/investor/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    all: s.all === true || s.all === "true" ? true : undefined,
    area: typeof s.area === "string" ? s.area : undefined,
    land: typeof s.land === "string" ? s.land : undefined,
    deal: typeof s.deal === "string" ? s.deal : undefined,
    budget: Number(s.budget) > 0 ? Number(s.budget) : undefined,
    street: Number(s.street) > 0 ? Number(s.street) : undefined,
    sort: ["newest", "price", "street", "days"].includes(String(s.sort)) ? (s.sort as Search["sort"]) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "الأراضي — واجهة المستثمر — سرج" },
      { name: "description", content: "الأراضي المتاحة في الرياض مع فلاتر القطاع والميزانية وعرض الشارع." },
      { property: "og:title", content: "الأراضي — سرج" },
      { property: "og:description", content: "تصفّح الأراضي المتاحة." },
    ],
  }),
  component: Lands,
});

const CHIPS: { label: string; search: Search }[] = [
  { label: "مستودع", search: { land: "commercial", sort: "street" } },
  { label: "معرض سيارات", search: { land: "commercial", street: 36 } },
  { label: "مجمع سكني", search: { land: "residential", deal: "sale" } },
  { label: "بيت عائلة", search: { land: "residential", deal: "sale", sort: "price" } },
  { label: "مكاتب", search: { land: "commercial", deal: "lease" } },
  { label: "محل تجزئة", search: { land: "commercial", deal: "lease", sort: "price" } },
  { label: "مطعم", search: { land: "commercial", deal: "lease" } },
  { label: "مستشفى", search: { land: "commercial", deal: "sale" } },
];

function applyFilters(parcels: Parcel[], s: Search) {
  let list = parcels.filter((p) =>
    (s.all || isAvailable(p)) &&
    (!s.area || p.area_of_city === s.area) &&
    (!s.land || p.land_type === s.land) &&
    (!s.deal || p.listing_type === s.deal) &&
    (!s.street || p.street_width_m >= s.street) &&
    // A missing price cannot be compared to a budget — it stays visible rather than guessed.
    (!s.budget || !isPriced(p) || p.total_price_sar! <= s.budget),
  );
  if (s.sort === "price") {
    // Parcels without a price never enter a price ranking: they go to the end.
    const priced = list.filter(isPriced).sort((a, b) => a.price_per_sqm_sar! - b.price_per_sqm_sar!);
    list = [...priced, ...list.filter((p) => !isPriced(p))];
  } else if (s.sort === "street") list = [...list].sort((a, b) => b.street_width_m - a.street_width_m);
  else if (s.sort === "days") list = [...list].sort((a, b) => b.days_on_market - a.days_on_market);
  else list = [...list].sort((a, b) => b.listed_date.localeCompare(a.listed_date));
  return list;
}

function Lands() {
  const { parcels, investorName } = usePortfolio();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/investor/" });
  const [intent, setIntent] = useState("");
  const set = (patch: Partial<Search>) => navigate({ search: (prev) => ({ ...prev, ...patch }) });
  const list = applyFilters(parcels, search);
  const featured = parcels.find((p) => p.parcel_id === "SRE-015");
  const showFeatured = featured && list.some((p) => p.parcel_id === featured.parcel_id);
  const first = investorName.split(" ")[0] || "بك";
  const availableCount = parcels.filter(isAvailable).length;
  const select = "rounded-full border bg-surface px-3 py-1.5 text-sm";

  return (
    <div>
      <h1 className="text-3xl font-bold">أهلاً {first} — ما الذي تنوين بناءه؟</h1>
      <form
        onSubmit={(e) => { e.preventDefault(); navigate({ to: "/investor/chats" }); }}
        className="mt-5 flex gap-2 rounded-2xl border bg-surface p-2"
      >
        <input value={intent} onChange={(e) => setIntent(e.target.value)} placeholder="اكتبيه بجملة واحدة: مستودع جنوب الرياض بميزانية مليون ريال سنويًا…" className="flex-1 bg-transparent px-3 outline-none" />
        <button className="rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground">اسألي</button>
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <Link key={c.label} to="/investor" search={c.search} className="rounded-full border bg-surface px-3 py-1.5 text-sm hover:border-primary">{c.label}</Link>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-2 border-y py-4">
        <div className="flex rounded-full border bg-secondary p-0.5 text-sm">
          <button onClick={() => set({ all: undefined })} className={`rounded-full px-3 py-1 ${!search.all ? "bg-foreground text-background" : ""}`}>المتاحة {availableCount}</button>
          <button onClick={() => set({ all: true })} className={`rounded-full px-3 py-1 ${search.all ? "bg-foreground text-background" : ""}`}>الكل {parcels.length}</button>
        </div>
        <select className={select} value={search.area ?? ""} onChange={(e) => set({ area: e.target.value || undefined })}>
          <option value="">كل المناطق</option>
          {AREAS.map((a) => <option key={a} value={a}>{AREA_AR[a]}</option>)}
        </select>
        <select className={select} value={search.land ?? ""} onChange={(e) => set({ land: e.target.value || undefined })}>
          <option value="">سكني وتجاري</option>
          {Object.entries(LAND_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className={select} value={search.deal ?? ""} onChange={(e) => set({ deal: e.target.value || undefined })}>
          <option value="">بيع وإيجار</option>
          {Object.entries(DEAL_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="number" placeholder="الميزانية القصوى" className={`${select} w-36`} value={search.budget ?? ""} onChange={(e) => set({ budget: Number(e.target.value) || undefined })} />
        <input type="number" placeholder="أقل عرض شارع" className={`${select} w-32`} value={search.street ?? ""} onChange={(e) => set({ street: Number(e.target.value) || undefined })} />
        <select className={select} value={search.sort ?? "newest"} onChange={(e) => set({ sort: e.target.value as Search["sort"] })}>
          <option value="newest">الأحدث</option>
          <option value="price">سعر المتر</option>
          <option value="street">عرض الشارع</option>
          <option value="days">أيام في السوق</option>
        </select>
        <Link to="/investor" className="text-sm text-muted-foreground hover:text-foreground">مسح</Link>
        <span className="mr-auto text-sm text-muted-foreground">{list.length} نتيجة</span>
      </div>

      {showFeatured && featured && (
        <Link to="/investor/parcels/$parcelId" params={{ parcelId: featured.parcel_id }} className="mt-6 grid gap-6 rounded-2xl border bg-card p-6 hover:border-primary md:grid-cols-[1fr_auto]">
          <div>
            <div className="text-xs text-primary">مرشّحة</div>
            <h2 className="mt-1 text-2xl font-bold">{featured.district_ar}</h2>
            <div className="text-sm text-muted-foreground">{AREA_AR[featured.area_of_city]} · {LAND_AR[featured.land_type]} · {DEAL_AR[featured.listing_type]} · <span className="font-mono">{featured.parcel_id}</span></div>
            <div className="mt-4"><PriceLine p={featured} /></div>
            <div className="mt-4"><CompareButton id={featured.parcel_id} /></div>
          </div>
          <dl className="grid grid-cols-3 gap-6 self-end text-sm">
            <Fact k="المساحة" v={`${sar(featured.area_sqm)} م²`} />
            <Fact k="الشارع" v={`${featured.street_width_m} م`} />
            <Fact k="في السوق" v={`${featured.days_on_market} يومًا`} />
          </dl>
        </Link>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.filter((p) => !showFeatured || p.parcel_id !== "SRE-015").map((p) => <ParcelCard key={p.parcel_id} p={p} />)}
      </div>
      {!list.length && <p className="mt-10 text-center text-muted-foreground">لا توجد أرض تطابق هذه القيود.</p>}
    </div>
  );
}
