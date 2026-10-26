import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, type ReactNode } from "react";
import { useTip } from "@/components/admin/chartKit";
import { usePortfolio } from "@/context/PortfolioProvider";
import { getFeasibility, getInquiryBriefs, INTENT_AR, maskPhone, STAGE_AR, STAGES, USE_AR } from "@/lib/adminEngine";
import { AREA_AR, LAND_AR, DEAL_AR } from "@/data/types";
import { fmt } from "@/components/admin/charts";

export const Route = createFileRoute("/admin/inquiries")({
  head: () => ({
    meta: [
      { title: "الاستفسارات — لوحة فريق سرج" },
      { name: "description", content: "عمر الاستفسارات، مسار التحويل، وكشف الأرقام عند الحاجة." },
      { property: "og:title", content: "الاستفسارات — لوحة فريق سرج" },
      { property: "og:description", content: "متابعة الاستفسارات ومعرفة من ينتظر ردًّا." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Inquiries,
});

const STATUS_AR: Record<string, string> = { new: "بلا رد", contacted: "تواصل", negotiating: "تفاوض" };
const M = (n: number) => fmt(n);
const card = "rounded-3xl border bg-card p-5";

function Inquiries() {
  const { parcels, inquiries, revealLog, revealPhone } = usePortfolio();
  const revealed = new Set(revealLog.map((r) => r.inquiry_id));
  const b = getInquiryBriefs(parcels, inquiries);
  const { show, setTip, layer } = useTip();
  const hide = () => setTip(null);
  const hov = (body: ReactNode) => ({ onMouseEnter: (e: React.SyntheticEvent) => show(e, body), onFocus: (e: React.SyntheticEvent) => show(e, body), onMouseLeave: hide, onBlur: hide, tabIndex: 0 });
  const maxB = Math.max(1, ...b.buckets.map((x) => x.n));
  const maxCell = Math.max(1, ...b.matrix.flatMap((r) => r.cells));
  const maxUse = Math.max(1, ...b.uses.map((u) => Math.max(u.demand, u.supply)));
  const worst = [...b.uses].filter((u) => u.short).sort((x, y) => x.supply / x.demand - y.supply / y.demand)[0];
  const glut = [...b.uses].sort((x, y) => y.supply / y.demand - x.supply / x.demand)[0];
  const list = [...inquiries].sort((a, c) => a.date.localeCompare(c.date));
  const bucketTone = ["bg-primary/30", "bg-primary/55", "bg-primary", "bg-primary/90 brightness-75"];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className={card}>
          <header className="flex items-baseline justify-between gap-2"><h2 className="font-semibold">ما يريد المستثمرون بناءه، وما نستطيع خدمته</h2><span className="text-xs text-muted-foreground">{b.open} استفسارًا</span></header>
          <p className="mt-1 text-xs text-muted-foreground">البنفسجي = عدد من طلبوا الاستخدام. الرمادي = الأراضي المتاحة التي تفي بالمنطقة والنوع والصفقة (ومساحة 2,000 م² للمجمّع). الأحمر حيث لا يكفي المعروض.</p>
          <div className="mt-4 grid grid-cols-[6.5rem_1fr_1fr] gap-x-3 text-[11px] text-muted-foreground"><span /><span>← الطلب</span><span>ما نستطيع خدمته</span></div>
          <ul className="mt-1 divide-y">
            {b.uses.map((u) => (
              <li key={u.use} className="grid cursor-default grid-cols-[6.5rem_1fr_1fr] items-center gap-x-3 rounded py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring" {...hov(<><b>{u.label}</b><br />{u.demand} طلبات · {u.supply} أرض تخدمها<br />{u.short ? "المعروض أقل من الطلب" : `${(u.supply / u.demand).toFixed(1)} أرض لكل طالب`}</>)}>
                <span className={`truncate font-medium ${u.short ? "text-destructive" : ""}`}>{u.label}</span>
                <div className="flex items-center gap-2"><span className="w-5 tabular-nums text-primary">{u.demand}</span><div className="h-2.5 flex-1 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(u.demand / maxUse) * 100}%` }} /></div></div>
                <div className="flex items-center gap-2"><span className="w-5 tabular-nums text-muted-foreground">{u.supply}</span><div className="h-2.5 flex-1 rounded-full bg-muted"><div className={`h-full rounded-full ${u.short ? "bg-destructive/80" : "bg-muted-foreground/35"}`} style={{ width: `${(u.supply / maxUse) * 100}%` }} /></div></div>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t pt-3 text-xs leading-5 text-muted-foreground">
            {worst ? <>الفجوة الحادة: <b className="text-destructive">{worst.label}</b> — {worst.demand} يطلبونه و{worst.supply} أرض فقط تخدمه. </> : null}
            {glut ? <>أما <b className="text-foreground">{glut.label}</b> فلدينا {glut.supply} أرض لـ{glut.demand} طلبات — فائض يحتاج تسويقًا لا استحواذًا.</> : null}
          </p>
        </section>

        <section className={card}>
          <header className="flex items-baseline justify-between gap-2"><h2 className="font-semibold">كم انتظر من لم يُردّ عليه</h2><span className="text-xs text-muted-foreground">{b.unanswered} بلا رد</span></header>
          <p className="mt-1 text-xs text-muted-foreground">أيام الانتظار حتى لقطة 11 أغسطس 2026 · الوسيط {b.medianWait} يومًا.</p>
          <div className="mt-4 flex h-28 items-end gap-2">
            {b.buckets.map((x, n) => (
              <div key={x.label} className="flex flex-1 cursor-default flex-col items-center gap-1 rounded outline-none focus-visible:ring-2 focus-visible:ring-ring" {...hov(<><b>{x.label}</b><br />{x.n} استفسارًا بلا رد</>)}>
                <span className="text-sm font-semibold tabular-nums">{x.n}</span>
                <div className={`w-full rounded-t-lg ${bucketTone[n]}`} style={{ height: `${Math.max(6, (x.n / maxB) * 80)}px` }} />
                <span className="text-[11px] text-muted-foreground">{x.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 border-t pt-3 text-xs leading-5 text-muted-foreground"><b className="text-foreground">{b.over30}</b> تجاوزوا الشهر، و<b className="text-destructive">{b.over60}</b> تجاوزوا الشهرين.</p>

          <h3 className="mt-4 text-sm font-semibold">النيّة مقابل مرحلة الخط</h3>
          <div className="mt-2 grid grid-cols-[5.5rem_repeat(3,1fr)] gap-1.5 text-xs">
            <span />{STAGES.map((s) => <span key={s} className="text-center text-[11px] text-muted-foreground">{STAGE_AR[s]}</span>)}
            {b.matrix.map((r) => (
              <Fragment key={r.intent}>
                <span className="self-center text-muted-foreground">{INTENT_AR[r.intent]}</span>
                {r.cells.map((n, k) => (
                  <div key={k} className={`grid h-9 cursor-default place-items-center rounded-lg font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring ${n / maxCell > 0.5 ? "text-primary-foreground" : ""}`} style={{ backgroundColor: `color-mix(in oklab, var(--primary) ${8 + (n / maxCell) * 82}%, transparent)` }} {...hov(<><b>{INTENT_AR[r.intent]}</b> · {STAGE_AR[STAGES[k]!]}<br />{n} استفسارات</>)}>{n}</div>
                ))}
              </Fragment>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground"><b className="text-foreground">{b.comparingUnanswered}</b> ممن <b className="text-foreground">يقارنون خيارات</b> لم يُلمَسوا — هؤلاء يقرّرون عند أول رد.</p>
        </section>
      </div>

      <section className={card}>
        <header className="flex items-baseline justify-between gap-2"><h2 className="font-semibold">أعلى ستة في الخط بلا ردّ</h2><span className="text-xs text-muted-foreground">مرتّبة بالنيّة ثم بالانتظار</span></header>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-xs text-muted-foreground"><tr className="border-b">{["الرقم", "المستثمر", "الهاتف", "يريد أن يبني", "الشريحة", "الميزانية", "النيّة", "الانتظار", ""].map((h) => <th key={h} className="py-2 text-right font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {b.top.map(({ i, wait, matches }) => (
                <tr key={i.inquiry_id}>
                  <td className="py-2.5 font-mono text-xs text-muted-foreground">{i.inquiry_id}</td>
                  <td className="font-medium">{i.investor_name}</td>
                  <td><span className="font-mono text-xs" dir="ltr">{revealed.has(i.inquiry_id) ? i.phone : maskPhone(i.phone)}</span>{!revealed.has(i.inquiry_id) && <button onClick={() => revealPhone(i.inquiry_id)} className="mr-1.5 rounded-full border px-2 py-0.5 text-[11px] hover:bg-muted">الكشف</button>}</td>
                  <td>{USE_AR[i.wants_to] ?? i.wants_to}</td>
                  <td><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{LAND_AR[i.land_type_wanted]} · {DEAL_AR[i.prefers]} · {AREA_AR[i.area_of_city_wanted]}</span></td>
                  <td className="tabular-nums font-medium">{i.missingBudget ? "—" : M(i.budget_sar ?? 0)}</td>
                  <td><span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">{INTENT_AR[i.intent] ?? i.intent}</span></td>
                  <td><span className={`rounded-md px-2 py-0.5 text-xs tabular-nums ${wait > 30 ? "bg-destructive/10 text-destructive" : "bg-muted"}`}>{wait} يومًا</span></td>
                  <td className="text-left">{matches ? <Link to="/admin/offer" className="text-xs font-medium text-primary hover:underline">اعرض أرضًا ({matches})</Link> : <span className="text-xs text-muted-foreground">لا مطابقة</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <details className={`${card} group`}>
        <summary className="cursor-pointer list-none font-semibold">كل الاستفسارات ({inquiries.length}) <span className="text-xs font-normal text-muted-foreground group-open:hidden">— اضغط للعرض</span></summary>
        <div className="mt-3 divide-y">
          {list.map((i) => {
            const feas = getFeasibility(parcels, i);
            return (
              <div key={i.inquiry_id} className="py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><span className="font-mono text-xs text-muted-foreground">{i.inquiry_id}</span> · <b>{i.investor_name}</b> · {USE_AR[i.wants_to] ?? i.wants_to}</div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs" dir="ltr">{revealed.has(i.inquiry_id) ? i.phone : maskPhone(i.phone)}</span>
                    {!revealed.has(i.inquiry_id) && <button onClick={() => revealPhone(i.inquiry_id)} className="rounded-full border px-2 py-0.5 text-xs">الكشف</button>}
                    <span className={`rounded-full px-2 py-0.5 text-xs ${i.status === "new" ? "bg-destructive/10 text-destructive" : "bg-secondary"}`}>{STATUS_AR[i.status] ?? i.status}</span>
                  </div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{AREA_AR[i.area_of_city_wanted]} · {LAND_AR[i.land_type_wanted]} · {DEAL_AR[i.prefers]} · {i.missingBudget ? "بلا ميزانية" : `${fmt(i.budget_sar ?? 0)} ريال`} · {i.date}</div>
                {feas && <div className="mt-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">تنبيه جدوى: الأراضي المطابقة لميزانيتها مساحتها {feas.min}–{feas.max} م² فقط، ولا تكفي لمجمع سكني (يحتاج {fmt(feas.required)} م² على الأقل). اقترح بيت عائلة أو رفع الميزانية.</div>}
              </div>
            );
          })}
        </div>
      </details>

      {layer}
    </div>
  );
}
