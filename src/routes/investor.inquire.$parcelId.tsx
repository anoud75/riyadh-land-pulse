import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { usePortfolio } from "@/context/PortfolioProvider";
import { AREAS, AREA_AR, DEAL_AR, LAND_AR, SNAPSHOT_DATE, type Area, type DealType, type LandType } from "@/data/types";
import { computeHeadroom, suggestAlternatives } from "@/lib/investorEngine";
import { sar } from "@/components/investor/format";

export const Route = createFileRoute("/investor/inquire/$parcelId")({
  head: ({ params }) => ({
    meta: [
      { title: `استفسار عن ${params.parcelId} — سرج` },
      { name: "description", content: "راجع استفسارك المعبّأ مسبقًا وأرسله لفريق سرج." },
      { property: "og:title", content: "استفسارك — سرج" },
      { property: "og:description", content: "استفسار معبّأ مسبقًا عن أرض." },
    ],
  }),
  component: Inquire,
});

function Inquire() {
  const { parcelId } = Route.useParams();
  const { parcels, investorName, submitInvestorInquiry } = usePortfolio();
  const navigate = useNavigate();
  const [pid, setPid] = useState(parcelId);
  const p = parcels.find((x) => x.parcel_id === pid);
  const [name, setName] = useState(investorName);
  const [phone, setPhone] = useState("");
  const [use, setUse] = useState(p?.land_type === "commercial" ? "مستودع" : "بيت عائلة");
  const [land, setLand] = useState<LandType>(p?.land_type ?? "commercial");
  const [area, setArea] = useState<Area>(p?.area_of_city ?? "South");
  const [deal, setDeal] = useState<DealType>(p?.listing_type ?? "lease");
  const [budget, setBudget] = useState<number>(p?.listing_type === "lease" ? 1_000_000 : p?.total_price_sar ?? 0);
  const [note, setNote] = useState("يهمني دخول الشاحنات.");
  const [draft, setDraft] = useState(false);
  if (!p) return <p>لم نجد هذه الأرض.</p>;

  const headroom = computeHeadroom(budget || null, p);
  const alt = suggestAlternatives(parcels, p, budget || null)[0];
  const field = "w-full rounded-xl border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    submitInvestorInquiry(
      {
        date: SNAPSHOT_DATE,
        investor_name: name,
        phone,
        wants_to: `${use} — ${note}`,
        land_type_wanted: land,
        area_of_city_wanted: area,
        prefers: deal,
        budget_sar: budget || null,
        budget_basis: deal === "lease" ? "annual rent" : "total purchase",
        intent: "ready to move",
        channel: "platform",
        status: "new",
      },
      p.parcel_id,
    );
    navigate({ to: "/investor/inquiries" });
  };

  return (
    <div className="max-w-3xl">
      <Link to="/investor/parcels/$parcelId" params={{ parcelId: p.parcel_id }} className="text-sm text-muted-foreground hover:text-foreground">‹ عودة إلى أرض {p.district_ar}</Link>
      <h1 className="mt-4 text-3xl font-bold">استفسارك عن أرض {p.district_ar}</h1>
      <p className="mt-2 text-muted-foreground">ملأنا ما عرفناه من محادثتك. راجعي وعدّلي ما تشائين قبل الإرسال.</p>

      <div className="mt-6 rounded-2xl border bg-card p-5">
        <div className="flex justify-between"><span className="font-semibold">{p.district_ar}</span><span className="font-mono text-xs text-muted-foreground">{p.parcel_id}</span></div>
        <div className="text-sm text-muted-foreground">{AREA_AR[p.area_of_city]} · {LAND_AR[p.land_type]} · {DEAL_AR[p.listing_type]} · {sar(p.area_sqm)} م² · شارع {p.street_width_m} م</div>
        <div className="mt-2 font-mono">{p.missingPrice ? "السعر غير مسجل" : `${sar(p.total_price_sar)} ريال${p.listing_type === "lease" ? " / سنة" : ""}`}</div>
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 text-sm">الاسم<input required className={field} value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="space-y-1.5 text-sm">الجوال<input dir="ltr" className={field} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05XX XXX XXX" /></label>
          <label className="space-y-1.5 text-sm">الاستخدام<input className={field} value={use} onChange={(e) => setUse(e.target.value)} /></label>
          <label className="space-y-1.5 text-sm">المنطقة
            <select className={field} value={area} onChange={(e) => setArea(e.target.value as Area)}>{AREAS.map((a) => <option key={a} value={a}>{AREA_AR[a]}</option>)}</select>
          </label>
          <label className="space-y-1.5 text-sm">نوع الأرض
            <select className={field} value={land} onChange={(e) => setLand(e.target.value as LandType)}>{Object.entries(LAND_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </label>
          <label className="space-y-1.5 text-sm">نوع الصفقة
            <select className={field} value={deal} onChange={(e) => setDeal(e.target.value as DealType)}>{Object.entries(DEAL_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </label>
          <label className="space-y-1.5 text-sm md:col-span-2">الميزانية (ريال{deal === "lease" ? " سنويًا" : ""})
            <input type="number" className={field} value={budget || ""} onChange={(e) => setBudget(Number(e.target.value))} />
          </label>
        </div>

        {headroom != null && (
          <div className={`rounded-2xl border p-4 text-sm ${headroom >= 0 ? "bg-accent text-accent-foreground" : "border-destructive text-destructive"}`}>
            {headroom >= 0
              ? <>يتبقى من ميزانيتك <span className="font-mono font-semibold">{sar(headroom)}</span> ريال بعد {p.listing_type === "lease" ? "الإيجار السنوي" : "السعر"} ({sar(budget)} − {sar(p.total_price_sar)}).</>
              : <>السعر يتجاوز ميزانيتك بـ <span className="font-mono">{sar(-headroom)}</span> ريال.</>}
          </div>
        )}

        {alt && (
          <div className="rounded-2xl border bg-card p-4 text-sm">
            <div className="font-medium">أرض أنسب لدخول الشاحنات ضمن ميزانيتك</div>
            <div className="mt-1 text-muted-foreground">
              {alt.district_ar} <span className="font-mono">{alt.parcel_id}</span> · شارع {alt.street_width_m} م مقابل {p.street_width_m} م · {sar(alt.total_price_sar)} ريال{alt.listing_type === "lease" ? " / سنة" : ""}
            </div>
            <button type="button" onClick={() => setPid(alt.parcel_id)} className="mt-3 rounded-full border px-4 py-1.5 hover:bg-secondary">أضفها</button>
          </div>
        )}

        <label className="block space-y-1.5 text-sm">ملاحظة<textarea rows={3} className={field} value={note} onChange={(e) => setNote(e.target.value)} /></label>
        <p className="text-xs text-muted-foreground">لن يُرسل شيء قبل ضغطك هذا الزر.</p>
        <div className="flex items-center gap-3">
          <button className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground">← إرسال الاستفسار</button>
          <button type="button" onClick={() => setDraft(true)} className="text-sm text-muted-foreground hover:text-foreground">احفظه مسودة</button>
          {draft && <span className="text-xs text-muted-foreground">حُفظت المسودة.</span>}
        </div>
      </form>
    </div>
  );
}
