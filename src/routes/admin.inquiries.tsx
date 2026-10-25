import { createFileRoute } from "@tanstack/react-router";
import { usePortfolio } from "@/context/PortfolioProvider";
import { getAging, getFeasibility, getFunnel, maskPhone } from "@/lib/adminEngine";
import { AREA_AR, LAND_AR, DEAL_AR } from "@/data/types";
import { AgingDots, Funnel, fmt } from "@/components/admin/charts";

export const Route = createFileRoute("/admin/inquiries")({
  head: () => ({
    meta: [
      { title: "الاستفسارات — لوحة فريق سرج" },
      { name: "description", content: "عمر الاستفسارات، مسار التحويل، وكشف الأرقام مع سجل تدقيق." },
      { property: "og:title", content: "الاستفسارات — لوحة فريق سرج" },
      { property: "og:description", content: "متابعة الاستفسارات وكشف الأرقام بسجل." },
    ],
  }),
  component: Inquiries,
});

const STATUS_AR: Record<string, string> = { new: "بلا رد", contacted: "تواصل", negotiating: "تفاوض" };

function Inquiries() {
  const { parcels, inquiries, revealLog, revealPhone, offers } = usePortfolio();
  const revealed = new Set(revealLog.map((r) => r.inquiry_id));
  const list = [...inquiries].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">الاستفسارات</h1>
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <section className="rounded-2xl border bg-card p-5"><h2 className="mb-3 font-semibold">عمر الاستفسارات (بالأيام منذ الوصول)</h2><AgingDots rows={getAging(inquiries)} /><p className="text-xs text-muted-foreground">بالأحمر: بلا رد منذ أكثر من 30 يومًا.</p></section>
        <section className="rounded-2xl border bg-card p-5"><h2 className="mb-3 font-semibold">مسار التحويل</h2><Funnel steps={getFunnel(inquiries, offers.length)} /></section>
      </div>
      <section className="divide-y rounded-2xl border bg-card">
        {list.map((i) => {
          const feas = getFeasibility(parcels, i);
          return (
            <div key={i.inquiry_id} className="p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><span className="font-mono text-xs text-muted-foreground">{i.inquiry_id}</span> · <b>{i.investor_name}</b> · {i.wants_to}</div>
                <div className="flex items-center gap-2">
                  <span className="font-mono" dir="ltr">{revealed.has(i.inquiry_id) ? i.phone : maskPhone(i.phone)}</span>
                  {!revealed.has(i.inquiry_id) && <button onClick={() => revealPhone(i.inquiry_id)} className="rounded-full border px-2 py-0.5 text-xs">الكشف</button>}
                  <span className={`rounded-full px-2 py-0.5 text-xs ${i.status === "new" ? "bg-destructive/10 text-destructive" : "bg-secondary"}`}>{STATUS_AR[i.status] ?? i.status}</span>
                </div>
              </div>
              <div className="mt-1 text-muted-foreground">{AREA_AR[i.area_of_city_wanted]} · {LAND_AR[i.land_type_wanted]} · {DEAL_AR[i.prefers]} · {i.missingBudget ? "بلا ميزانية" : `${fmt(i.budget_sar!)} ريال`} · {i.date}</div>
              {feas && (
                <div className="mt-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-destructive">
                  تنبيه جدوى: الأراضي المطابقة لميزانيتها مساحتها {feas.min}–{feas.max} م² فقط، ولا تكفي لمجمع سكني (يحتاج {fmt(feas.required)} م² على الأقل). اقترح بيت عائلة أو رفع الميزانية.
                </div>
              )}
            </div>
          );
        })}
      </section>
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="font-semibold">سجل كشف الأرقام</h2>
        {revealLog.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">لم يُكشف أي رقم في هذه الجلسة.</p> : (
          <ul className="mt-2 space-y-1 text-sm">{revealLog.map((r, n) => <li key={n}><span className="font-mono text-xs">{r.inquiry_id}</span> · {r.by} · {new Date(r.at).toLocaleString("ar-SA")}</li>)}</ul>
        )}
      </section>
    </div>
  );
}
