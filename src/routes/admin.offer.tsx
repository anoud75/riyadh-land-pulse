import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, Check, Send } from "lucide-react";
import { usePortfolio } from "@/context/PortfolioProvider";
import { getActionableWaitingInquiries } from "@/lib/sarjAgentTools";
import { closestAlternatives, getFeasibility, matchReasons, waitDaysOf } from "@/lib/adminEngine";
import { AREA_AR, DEAL_AR, LAND_AR, type Parcel } from "@/data/types";
import { MiniMap } from "@/components/AgentChat";
import { fmt } from "@/components/admin/charts";

export const Route = createFileRoute("/admin/offer")({
  head: () => ({
    meta: [
      { title: "اعرض أرضاً — لوحة فريق سرج" },
      { name: "description", content: "اختر مشتريًا ينتظر، وقارن الأراضي المناسبة له، وأرسل عرضًا واضحًا في رسالة واحدة." },
      { property: "og:title", content: "اعرض أرضاً — لوحة فريق سرج" },
      { property: "og:description", content: "طابق مشتريًا بأرض وأرسل العرض." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Offer,
});

function Offer() {
  const { parcels, inquiries, offers, sendOffer } = usePortfolio();
  const waiting = useMemo(() => getActionableWaitingInquiries(parcels, inquiries).sort((a, b) => b.matches.length - a.matches.length), [parcels, inquiries]);
  const [inqId, setInqId] = useState(waiting[0]?.inquiry_id ?? "");
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [justSent, setJustSent] = useState(false);
  const w = waiting.find((x) => x.inquiry_id === inqId);
  const inq = inquiries.find((i) => i.inquiry_id === inqId);
  const matches = (w?.matches ?? []).map((id) => parcels.find((p) => p.parcel_id === id)).filter(Boolean) as Parcel[];
  const alts = inq && !matches.length ? closestAlternatives(parcels, inq) : [];
  const list = matches.length ? matches : alts;
  const feas = inq ? getFeasibility(parcels, inq) : null;
  const sent = offers.filter((o) => o.inquiry_id === inqId);
  const chosen = list.filter((p) => picked.includes(p.parcel_id));
  const choose = (id: string) => { setInqId(id); setPicked([]); setNote(""); setJustSent(false); };
  const toggle = (id: string) => setPicked((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const first = inq?.investor_name.split(" ")[0] ?? "";
  const message = inq && chosen.length
    ? `مرحبًا ${first}،\nبناءً على طلبك (${inq.wants_to})، نرشّح لك:\n${chosen.map((p) => `• ${p.district_ar} (${p.parcel_id}): ${fmt(p.area_sqm)} م²، ${fmt(p.total_price_sar ?? 0)} ريال${p.listing_type === "lease" ? " سنويًا" : ""}، شارع ${p.street_width_m} م`).join("\n")}${note.trim() ? `\n\n${note.trim()}` : ""}\n\nيسعدنا ترتيب زيارة للموقع متى ناسبك.\nفريق سرج`
    : "";
  const send = () => { if (!inq) return; chosen.forEach((p) => sendOffer(inq.inquiry_id, p.parcel_id, note.trim() || undefined)); setPicked([]); setNote(""); setJustSent(true); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">اعرض أرضاً</h1>
        <p className="mt-1 text-sm text-muted-foreground">١ اختر مشتريًا ينتظر · ٢ اختر أرضًا أو أكثر تناسبه · ٣ راجع الرسالة وأرسلها.</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-[17rem_1fr_20rem]">
        {/* 1 · buyers */}
        <aside className="rounded-2xl border bg-card p-3">
          <div className="px-2 pb-2 text-xs text-muted-foreground">{waiting.length} مشترين بانتظار رد</div>
          <div className="max-h-[640px] space-y-1 overflow-y-auto">
            {waiting.map((x) => {
              const i = inquiries.find((q) => q.inquiry_id === x.inquiry_id)!;
              const on = x.inquiry_id === inqId;
              const d = waitDaysOf(i);
              return (
                <button key={x.inquiry_id} onClick={() => choose(x.inquiry_id)} className={`w-full rounded-xl p-3 text-right text-sm transition ${on ? "bg-accent ring-1 ring-primary" : "hover:bg-secondary"}`}>
                  <div className="flex justify-between gap-2"><b className="truncate">{x.investor_name}</b><span className={`shrink-0 text-xs ${d > 30 ? "text-destructive" : "text-muted-foreground"}`}>ينتظر {d} يومًا</span></div>
                  <div className="mt-1 truncate text-xs text-muted-foreground">{AREA_AR[i.area_of_city_wanted]} · {LAND_AR[i.land_type_wanted]} · {DEAL_AR[i.prefers]} · {i.budget_sar ? `${fmt(i.budget_sar)} ريال` : "بلا ميزانية"}</div>
                  <div className={`mt-1.5 text-xs ${x.matches.length ? "text-primary" : "text-destructive"}`}>{x.matches.length ? `${x.matches.length} أراضٍ مناسبة` : (x.flag ?? "لا توجد أرض مناسبة")}</div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* 2 · parcels */}
        <section className="space-y-3">
          {inq && (
            <div className="rounded-2xl border bg-card p-4 text-sm">
              <div className="flex flex-wrap justify-between gap-2"><b className="text-base">{inq.investor_name}</b><span className="font-mono text-xs text-muted-foreground">{inq.inquiry_id}</span></div>
              <p className="mt-1 text-muted-foreground">يريد: {inq.wants_to} · الميزانية {inq.missingBudget ? "غير محددة" : `${fmt(inq.budget_sar!)} ريال`}</p>
            </div>
          )}
          {(w?.flag || feas) && (
            <div className="flex gap-2 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div>{feas ? `المساحات المتاحة ضمن ميزانيته بين ${fmt(feas.min)} و${fmt(feas.max)} م²، ولا تكفي لمجمع سكني (يلزم ${fmt(feas.required)} م² على الأقل).` : w?.flag === "لا مخزون في الشريحة" ? "لا نملك حاليًا أي أرض في الشريحة التي يطلبها." : w?.flag}{!matches.length && alts.length > 0 && " هذه أقرب البدائل المتاحة — اعرضها بوضوح على أنها بديل."}</div>
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {list.map((p) => {
              const r = inq ? matchReasons(p, inq) : null;
              const on = picked.includes(p.parcel_id);
              return (
                <button key={p.parcel_id} onClick={() => toggle(p.parcel_id)} className={`overflow-hidden rounded-2xl border bg-card text-right transition ${on ? "ring-2 ring-primary" : "hover:shadow-md"}`}>
                  <div className="relative h-28 bg-gradient-to-br from-accent to-secondary">
                    <div className="absolute inset-0 opacity-70"><MiniMap highlight={[p.parcel_id]} /></div>
                    <span className={`absolute left-3 top-3 grid size-7 place-items-center rounded-full border-2 ${on ? "border-primary bg-primary text-primary-foreground" : "border-card bg-card/80"}`}>{on && <Check className="size-4" />}</span>
                    {!matches.length && <span className="absolute right-3 top-3 rounded-full bg-card px-2 py-0.5 text-[11px]">بديل</span>}
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between gap-2"><div><b>{p.district_ar}</b><div className="font-mono text-xs text-muted-foreground">{p.parcel_id} · {LAND_AR[p.land_type]} · {DEAL_AR[p.listing_type]}</div></div></div>
                    <div className="mt-2 text-xl font-bold">{fmt(p.total_price_sar ?? 0)} <span className="text-xs font-normal text-muted-foreground">ريال</span></div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs"><div><b className="font-mono">{fmt(p.area_sqm)}</b><div className="text-muted-foreground">م²</div></div><div><b className="font-mono">{p.street_width_m}</b><div className="text-muted-foreground">عرض الشارع</div></div><div><b className="font-mono">{p.days_on_market}</b><div className="text-muted-foreground">يومًا معروضة</div></div></div>
                    {r && (
                      <ul className="mt-3 space-y-0.5 border-t pt-2 text-xs">
                        {r.ok.map((t) => <li key={t} className="flex gap-1.5 text-foreground/80"><Check className="size-3.5 shrink-0 text-primary" />{t}</li>)}
                        {r.warn.map((t) => <li key={t} className="flex gap-1.5 text-destructive"><AlertTriangle className="size-3.5 shrink-0" />{t}</li>)}
                      </ul>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {!list.length && inq && <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">لا توجد أرض يمكن عرضها الآن. <Link to="/admin/add" className="text-primary">أضف أرضًا لهذه الشريحة</Link></div>}
        </section>

        {/* 3 · message */}
        <aside className="space-y-3 rounded-2xl border bg-card p-4">
          <h2 className="font-semibold">معاينة العرض</h2>
          {chosen.length ? (
            <>
              <pre className="whitespace-pre-wrap rounded-xl bg-secondary/60 p-3 font-sans text-sm leading-relaxed">{message}</pre>
              <label className="block text-sm">ملاحظة تضيفها (اختياري)
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="مثلًا: المالك مرن في السعر للدفع النقدي" className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" />
              </label>
              <button onClick={send} className="flex w-full items-center justify-center gap-2 rounded-full bg-ink py-2.5 text-sm text-ink-foreground"><Send className="size-4" />أرسل العرض ({chosen.length})</button>
            </>
          ) : <p className="text-sm text-muted-foreground">اختر أرضًا واحدة أو أكثر من البطاقات لتظهر الرسالة هنا.</p>}
          {justSent && <div className="rounded-xl bg-primary/10 p-3 text-sm text-primary">أُرسل العرض إلى {first}.</div>}
          {sent.length > 0 && (
            <div className="border-t pt-3">
              <div className="mb-2 text-xs text-muted-foreground">العروض المرسلة لهذا المشتري</div>
              <ul className="space-y-1.5 text-sm">{sent.map((o, n) => <li key={n} className="flex justify-between gap-2"><span className="font-mono text-xs">{o.parcel_id}</span><span className="text-xs text-muted-foreground">أُرسل · بانتظار الرد · {new Date(o.at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}</span></li>)}</ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
