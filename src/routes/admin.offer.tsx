import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { usePortfolio } from "@/context/PortfolioProvider";
import { getActionableWaitingInquiries } from "@/lib/sarjAgentTools";
import { getFeasibility } from "@/lib/adminEngine";
import { fmt } from "@/components/admin/charts";

export const Route = createFileRoute("/admin/offer")({
  head: () => ({
    meta: [
      { title: "اعرض أرضاً — لوحة فريق سرج" },
      { name: "description", content: "طابق استفسارًا بأرض متاحة وأرسل العرض." },
      { property: "og:title", content: "اعرض أرضاً — لوحة فريق سرج" },
      { property: "og:description", content: "طابق وأرسل عرض أرض." },
    ],
  }),
  component: Offer,
});

function Offer() {
  const { parcels, inquiries, offers, sendOffer } = usePortfolio();
  const waiting = getActionableWaitingInquiries(parcels, inquiries);
  const [inqId, setInqId] = useState(waiting.find((w) => w.matches.length)?.inquiry_id ?? waiting[0]?.inquiry_id ?? "");
  const w = waiting.find((x) => x.inquiry_id === inqId);
  const inq = inquiries.find((i) => i.inquiry_id === inqId);
  const [pid, setPid] = useState("");
  const parcel = parcels.find((p) => p.parcel_id === (pid || w?.matches[0]));
  const feas = inq ? getFeasibility(parcels, inq) : null;
  const sent = offers.filter((o) => o.inquiry_id === inqId);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">اعرض أرضاً</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm">الاستفسار
          <select value={inqId} onChange={(e) => { setInqId(e.target.value); setPid(""); }} className="mt-1 w-full rounded-xl border bg-background px-3 py-2">
            {waiting.map((x) => <option key={x.inquiry_id} value={x.inquiry_id}>{x.inquiry_id} · {x.investor_name} · {x.matches.length} مطابقة</option>)}
          </select>
        </label>
        <label className="text-sm">الأرض
          <select value={parcel?.parcel_id ?? ""} onChange={(e) => setPid(e.target.value)} className="mt-1 w-full rounded-xl border bg-background px-3 py-2">
            {!w?.matches.length && <option value="">لا أرض مطابقة</option>}
            {w?.matches.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
      </div>
      {inq && (
        <section className="rounded-2xl border bg-card p-5 text-sm">
          <div><b>{inq.investor_name}</b> يريد {inq.wants_to} · ميزانية {inq.missingBudget ? "غير محددة" : `${fmt(inq.budget_sar!)} ريال`}</div>
          {parcel && <div className="mt-2">الأرض: {parcel.district_ar} {parcel.parcel_id} · {fmt(parcel.area_sqm)} م² · {fmt(parcel.total_price_sar ?? 0)} ريال · شارع {parcel.street_width_m}م{inq.budget_sar ? ` · يتبقى ${fmt(inq.budget_sar - (parcel.total_price_sar ?? 0))} ريال` : ""}</div>}
          {(w?.flag || feas) && <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-destructive">{w?.flag}</div>}
          <button disabled={!parcel} onClick={() => parcel && sendOffer(inq.inquiry_id, parcel.parcel_id)} className="mt-4 rounded-full bg-ink px-5 py-2 text-ink-foreground disabled:opacity-40">أرسل العرض</button>
          {sent.length > 0 && <ul className="mt-3 space-y-1 text-muted-foreground">{sent.map((o, n) => <li key={n}>أُرسل {o.parcel_id} · {new Date(o.at).toLocaleString("ar-SA")}</li>)}</ul>}
        </section>
      )}
    </div>
  );
}
