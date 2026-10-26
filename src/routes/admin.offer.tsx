import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, Copy, Search, Send, UserRound, X } from "lucide-react";
import { usePortfolio } from "@/context/PortfolioProvider";
import { getActionableWaitingInquiries } from "@/lib/sarjAgentTools";
import { closestAlternatives, getFeasibility, INTENT_AR, matchReasons, USE_AR, waitDaysOf } from "@/lib/adminEngine";
import { AREA_AR, DEAL_AR, LAND_AR, type Parcel } from "@/data/types";
import { ParcelSnapshot } from "@/components/investor/ParcelSnapshot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmt } from "@/components/admin/charts";

export const Route = createFileRoute("/admin/offer")({
  validateSearch: (search: Record<string, unknown>) => ({ inquiry: typeof search.inquiry === "string" ? search.inquiry : undefined }),
  head: () => ({ meta: [
    { title: "اعرض أرضًا — فريق سرج" },
    { name: "description", content: "اختر المستفسر والأراضي المناسبة، ثم راجع العرض وسجّله." },
    { property: "og:title", content: "اعرض أرضًا — فريق سرج" },
    { property: "og:description", content: "مسار واضح من طلب المستثمر إلى عرض الأراضي المناسبة." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Offer,
});

function Offer() {
  const { parcels, inquiries, offers, sendOffer } = usePortfolio();
  const { inquiry } = Route.useSearch();
  const waiting = useMemo(() => getActionableWaitingInquiries(parcels, inquiries).sort((a, b) => b.matches.length - a.matches.length), [parcels, inquiries]);
  const [inqId, setInqId] = useState(inquiry ?? "");
  const [step, setStep] = useState(inquiry && inquiries.some((i) => i.inquiry_id === inquiry) ? 2 : 1);
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const [complete, setComplete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const w = waiting.find((x) => x.inquiry_id === inqId);
  const inq = inquiries.find((i) => i.inquiry_id === inqId);
  const matches = (w?.matches ?? []).map((id) => parcels.find((p) => p.parcel_id === id)).filter((p): p is Parcel => p !== undefined);
  const list = matches.length ? matches : inq ? closestAlternatives(parcels, inq) : [];
  const feas = inq ? getFeasibility(parcels, inq) : null;
  const chosen = list.filter((p) => picked.includes(p.parcel_id));
  const sent = offers.filter((o) => o.inquiry_id === inqId);
  const first = inq?.investor_name.split(" ")[0] ?? "";
  const use = inq ? USE_AR[inq.wants_to] ?? inq.wants_to : "";
  const message = inq && chosen.length ? `مرحبًا ${first}،\nبناءً على طلبك (${use})، ${matches.length ? "هذه الأراضي المناسبة لطلبك" : "هذه أقرب البدائل المتاحة، مع اختلافات عن طلبك"}:\n\n${chosen.map((p) => {
    const r = matchReasons(p, inq);
    return `• ${p.district_ar} (${p.parcel_id})\n${LAND_AR[p.land_type]} · ${DEAL_AR[p.listing_type]} · ${fmt(p.area_sqm)} م²\n${fmt(p.total_price_sar ?? 0)} ريال${p.listing_type === "lease" ? " سنويًا" : ""} · شارع ${p.street_width_m} م${r.warn.length ? `\nملاحظة: ${r.warn.join("، ")}` : ""}`;
  }).join("\n\n")}${note.trim() ? `\n\n${note.trim()}` : ""}\n\nيسعدنا ترتيب زيارة للموقع متى ناسبك.\nفريق سرج` : "";
  const choose = (id: string) => { setInqId(id); setPicked([]); setNote(""); setComplete(false); setCopied(false); setStep(2); };
  const toggle = (id: string) => { setPicked((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]); setCopied(false); };
  const copy = async () => { try { await navigator.clipboard.writeText(message); setCopied(true); setCopyError(false); } catch { setCopyError(true); } };
  const register = () => { if (!inq || !chosen.length || complete) return; chosen.forEach((p) => sendOffer(inq.inquiry_id, p.parcel_id, note.trim() || undefined)); setComplete(true); };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-bold">اعرض أرضًا</h1>
        <Button asChild variant="ghost" size="sm"><Link to="/admin/inquiries">الاستفسارات<ArrowLeft /></Link></Button>
      </header>
      <nav aria-label="مراحل العرض" className="flex border-b pb-4">
        {["المستفسر", "الأراضي", "مراجعة العرض"].map((label, n) => <div key={label} className="flex min-w-0 flex-1 items-center gap-2">
          <Button variant="ghost" size="sm" disabled={complete || n + 1 > step} onClick={() => setStep(n + 1)} aria-current={step === n + 1 ? "step" : undefined} className={`h-auto min-w-0 whitespace-normal px-1 ${step === n + 1 ? "text-primary" : "text-muted-foreground"}`}>
            <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs ${step >= n + 1 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{step > n + 1 ? <Check /> : n + 1}</span>{label}
          </Button>{n < 2 && <span className="mx-1 h-px flex-1 bg-border" />}
        </div>)}
      </nav>

      {step === 1 ? <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-semibold">لمن تريد عرض الأرض؟</h2><p className="mt-1 text-xs text-muted-foreground">{waiting.length} مستفسرًا بانتظار رد · الأكثر مطابقة أولًا</p></div>
          <div className="relative w-full sm:w-64"><Search className="absolute right-3 top-2.5 size-4 text-muted-foreground" /><Input aria-label="ابحث عن مستفسر" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="اسم المستفسر أو رقم الطلب" className="pr-9" /></div>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {waiting.filter((x) => `${x.investor_name} ${x.inquiry_id}`.toLowerCase().includes(query.trim().toLowerCase())).map((x) => {
            const i = inquiries.find((q) => q.inquiry_id === x.inquiry_id);
            if (!i) return null;
            return <Button key={x.inquiry_id} variant="outline" onClick={() => choose(x.inquiry_id)} className="h-auto w-full justify-start whitespace-normal rounded-lg p-4 text-right shadow-none">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground"><UserRound /></span>
              <span className="min-w-0 flex-1 space-y-2">
                <span className="flex flex-wrap items-center justify-between gap-1"><b>{i.investor_name}</b><span className="text-[11px] font-normal text-muted-foreground">{waitDaysOf(i)} يومًا انتظار</span></span>
                <span className="block text-xs font-normal text-muted-foreground">{USE_AR[i.wants_to] ?? i.wants_to} · {AREA_AR[i.area_of_city_wanted]} · {DEAL_AR[i.prefers]}</span>
                <span className="flex flex-wrap justify-between gap-1 text-xs"><span>{i.budget_sar == null ? "الميزانية غير محددة" : `${fmt(i.budget_sar)} ريال`}</span><span className={x.matches.length ? "text-primary" : "text-muted-foreground"}>{x.matches.length ? `${x.matches.length} أراضٍ مناسبة` : "استعراض البدائل"}</span></span>
              </span><ArrowLeft className="text-muted-foreground" />
            </Button>;
          })}
        </div>
        {!waiting.some((x) => `${x.investor_name} ${x.inquiry_id}`.toLowerCase().includes(query.trim().toLowerCase())) && <p className="py-8 text-center text-sm text-muted-foreground">لا توجد استفسارات بهذه البيانات.</p>}
      </section> : inq && <>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary"><UserRound className="size-5 text-primary" /></span><div><div className="flex flex-wrap items-baseline gap-2"><b>{inq.investor_name}</b><span className="text-xs text-muted-foreground">{inq.inquiry_id}</span><span className="text-xs text-primary">{INTENT_AR[inq.intent] ?? inq.intent}</span></div><p className="mt-1 text-xs text-muted-foreground">{use} · {AREA_AR[inq.area_of_city_wanted]} · {LAND_AR[inq.land_type_wanted]} · {DEAL_AR[inq.prefers]}</p></div></div>
          <div className="flex items-center gap-3"><div className="text-sm font-semibold">{inq.budget_sar == null ? "ميزانية غير محددة" : `${fmt(inq.budget_sar)} ريال`}<div className="text-[11px] font-normal text-muted-foreground">الميزانية</div></div>{!complete && <Button variant="ghost" size="sm" onClick={() => setStep(1)}>تغيير</Button>}</div>
        </div>
        {complete ? <section className="mx-auto max-w-2xl space-y-5 py-6">
          <div className="flex items-center gap-3"><CheckCircle2 className="size-10 text-primary" /><div><h2 className="text-xl font-semibold">تم تسجيل العرض لـ{first}</h2><p className="mt-1 text-sm text-muted-foreground">{chosen.length} أراضٍ · مسجّل في هذه الجلسة فقط، ولم يُرسل إلى المستثمر.</p></div></div>
          <div className="divide-y border-y">{chosen.map((p) => <div key={p.parcel_id} className="flex items-center justify-between gap-3 py-3 text-sm"><span>{p.district_ar} <span className="text-xs text-muted-foreground">{p.parcel_id}</span></span><b>{fmt(p.total_price_sar ?? 0)} ريال</b></div>)}</div>
          <div className="flex flex-wrap gap-2"><Button onClick={copy}><Copy />{copied ? "تم نسخ الرسالة" : "نسخ الرسالة"}</Button><Button variant="outline" onClick={() => { setInqId(""); setPicked([]); setNote(""); setComplete(false); setStep(1); }}>عرض جديد</Button><Button asChild variant="ghost"><Link to="/admin/inquiries">العودة للاستفسارات</Link></Button></div>
        </section> : step === 2 ? <section className="space-y-4">
          <div className="flex items-center justify-between gap-2"><h2 className="font-semibold">{matches.length ? `الأراضي المناسبة (${list.length})` : "أقرب البدائل"}</h2><span className="text-xs text-muted-foreground">{chosen.length} محددة</span></div>
          {(w?.flag || feas) && <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs leading-6 text-destructive"><AlertTriangle className="mt-1 size-4 shrink-0" /><span>{feas ? `المساحات ضمن الميزانية من ${fmt(feas.min)} إلى ${fmt(feas.max)} م²؛ المجمع يحتاج ${fmt(feas.required)} م² على الأقل.` : w?.flag}{!matches.length && " البدائل أدناه تختلف عن الطلب؛ تظهر الفروقات في الرسالة."}</span></div>}
          <div className="grid gap-4 lg:grid-cols-2">{list.map((p) => {
            const r = matchReasons(p, inq); const on = picked.includes(p.parcel_id);
            return <article key={p.parcel_id} className={`overflow-hidden rounded-lg border bg-card ${on ? "border-primary ring-1 ring-primary" : "border-border"}`}>
              <ParcelSnapshot parcel={p} className="h-32" />
              <div className="space-y-3 p-4"><div className="flex items-start justify-between gap-2"><div><h3 className="font-semibold">{p.district_ar}</h3><p className="mt-1 text-xs text-muted-foreground">{p.parcel_id} · {LAND_AR[p.land_type]} · {DEAL_AR[p.listing_type]}</p></div><Button aria-label={`${on ? "إزالة" : "اختيار"} ${p.parcel_id}`} aria-pressed={on} variant={on ? "default" : "outline"} size="sm" onClick={() => toggle(p.parcel_id)}>{on ? <Check /> : null}{on ? "محددة" : "اختيار"}</Button></div>
              <div className="text-xl font-bold">{fmt(p.total_price_sar ?? 0)} <span className="text-xs font-normal text-muted-foreground">ريال{p.listing_type === "lease" ? " / سنة" : ""}</span></div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground"><span>{fmt(p.area_sqm)} م²</span><span>شارع {p.street_width_m} م</span><span>{p.days_on_market} يومًا معروضة</span></div>
              <ul className="space-y-1.5 border-t pt-3 text-xs">{r.ok.map((t) => <li key={t} className="flex gap-2"><Check className="size-3.5 shrink-0 text-primary" />{t}</li>)}{r.warn.map((t) => <li key={t} className="flex gap-2 text-destructive"><AlertTriangle className="size-3.5 shrink-0" />{t}</li>)}</ul></div>
            </article>;
          })}</div>
          {!list.length && <div className="border-y py-8 text-center text-sm text-muted-foreground">لا توجد أرض يمكن عرضها حاليًا.<Button asChild variant="link"><Link to="/admin/add">أضف أرضًا</Link></Button></div>}
          <footer className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t bg-background py-3"><Button variant="ghost" onClick={() => setStep(1)}><ArrowRight />رجوع</Button><Button disabled={!chosen.length} onClick={() => { setStep(3); setCopied(false); }}>مراجعة العرض{chosen.length > 0 && ` (${chosen.length})`}<ArrowLeft /></Button></footer>
        </section> : <section className="space-y-4">
          <h2 className="font-semibold">راجع العرض قبل تسجيله</h2>
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <div className="space-y-4"><div className="whitespace-pre-wrap rounded-lg border bg-card p-5 text-sm leading-7" aria-label="رسالة العرض">{message}</div><Button variant="outline" size="sm" onClick={copy}><Copy />{copied ? "تم نسخ الرسالة" : "نسخ الرسالة"}</Button></div>
            <div className="space-y-4"><div><h3 className="text-sm font-semibold">الأراضي المحددة ({chosen.length})</h3><ul className="mt-2 divide-y border-y">{chosen.map((p) => <li key={p.parcel_id} className="flex items-center justify-between gap-2 py-2 text-sm"><span>{p.district_ar}<span className="mr-2 text-xs text-muted-foreground">{p.parcel_id}</span></span><Button aria-label={`إزالة ${p.parcel_id} من العرض`} title="إزالة من العرض" variant="ghost" size="icon" onClick={() => toggle(p.parcel_id)}><X /></Button></li>)}</ul><Button variant="link" size="sm" onClick={() => setStep(2)}>تعديل الأراضي</Button></div>
            <label className="block text-sm font-medium" htmlFor="offer-note">ملاحظة للمستثمر <span className="font-normal text-muted-foreground">(اختياري)</span></label><textarea id="offer-note" value={note} onChange={(e) => { setNote(e.target.value); setCopied(false); }} rows={3} placeholder="أضف تفاصيل الزيارة أو شروط العرض…" className="w-full rounded-md border bg-background p-3 text-sm" />
            <p className="text-xs leading-6 text-muted-foreground">التسجيل يحفظ العرض في هذه الجلسة فقط. لا يتم إرسال رسالة تلقائيًا؛ انسخها وشاركها مع المستثمر.</p>
            <Button className="w-full" disabled={!chosen.length} onClick={register}><Send />تسجيل العرض</Button>
            {sent.length > 0 && <p className="text-xs text-muted-foreground">{sent.length} أراضٍ سبق تسجيلها لهذا المستفسر في الجلسة.</p>}</div>
          </div>
          <Button variant="ghost" onClick={() => setStep(2)}><ArrowRight />رجوع للأراضي</Button>
        </section>}
        {copyError && <p role="alert" className="text-sm text-destructive">تعذّر النسخ. يمكنك تحديد نص الرسالة ونسخه مباشرة.</p>}
      </>}
    </div>
  );
}
