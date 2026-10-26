import { Link } from "@tanstack/react-router";
import { ArrowUpLeft, Info } from "lucide-react";
import type { ReactNode } from "react";
import { AREA_AR, LAND_AR, type Inquiry, type Parcel } from "@/data/types";
import { getLeadsAtRisk, getQuickWins, getTodayBriefs, LEAD_RISK_DAYS } from "@/lib/adminEngine";
import { useTip } from "@/components/admin/chartKit";

const M = (n: number) => `${(n / 1e6).toFixed(1)} مليون`;

function Shell({ title, sub, how, insight, to, cta, children, show, hide }: { title: string; sub: string; how: string; insight: ReactNode; to: "/admin/inquiries" | "/admin/portfolio" | "/admin/add" | "/admin/offer"; cta: string; children: ReactNode; show: ReturnType<typeof useTip>["show"]; hide: () => void }) {
  return (
    <section className="flex min-w-0 flex-col rounded-xl border bg-card p-4">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0"><h2 className="text-sm font-semibold">{title}</h2><p className="text-xs text-muted-foreground">{sub}</p></div>
        <button type="button" aria-label={`كيف يُحسب: ${title}`} className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring" onMouseEnter={(e) => show(e, how)} onFocus={(e) => show(e, how)} onMouseLeave={hide} onBlur={hide}><Info className="size-4" /></button>
      </header>
      <div className="my-4 flex-1">{children}</div>
      <footer className="flex items-end justify-between gap-3 border-t pt-3 text-xs leading-5">
        <p className="min-w-0 text-muted-foreground">{insight}</p>
        <Link to={to} className="inline-flex shrink-0 items-center gap-1 font-medium text-primary hover:underline">{cta}<ArrowUpLeft className="size-3.5" /></Link>
      </footer>
    </section>
  );
}

export function TodaySmartVisuals({ parcels, inquiries }: { parcels: Parcel[]; inquiries: Inquiry[] }) {
  const b = getTodayBriefs(parcels, inquiries);
  const qw = getQuickWins(parcels, inquiries);
  const lr = getLeadsAtRisk(inquiries);
  const maxRiskWait = Math.max(1, ...lr.rows.map((r) => r.wait));
  const ST: Record<string, string> = { new: "جديد", contacted: "تم التواصل", negotiating: "تفاوض" };
  const { show, setTip, layer } = useTip();
  const hide = () => setTip(null);
  const hov = (body: ReactNode) => ({ onMouseEnter: (e: React.SyntheticEvent) => show(e, body), onFocus: (e: React.SyntheticEvent) => show(e, body), onMouseLeave: hide, onBlur: hide, tabIndex: 0 });

  const topBudget = Math.max(1, ...b.waiting.top.map((w) => w.budget));
  const topShare = b.waiting.totalBudget ? b.waiting.top.reduce((s, w) => s + w.budget, 0) / b.waiting.totalBudget : 0;
  const R = 34, C = 2 * Math.PI * R;
  const maxDays = Math.max(1, ...b.stagnant.rows.map((r) => r.days));
  const maxWait = Math.max(1, ...b.shortages.map((s) => s.waiting));

  return (
    <div className="space-y-4">
    <div className="grid gap-4 lg:grid-cols-2">
      <Shell show={show} hide={hide} title="صفقات جاهزة للإغلاق" sub={`${qw.count} مشترين لهم أرض مطابقة الآن`}
        how="استفسارات «جديد» لها أرض متاحة ومسعّرة في نفس المنطقة والنوع ونوع الصفقة، ضمن الميزانية (وبمساحة تكفي إن كان الطلب مجمعًا). القيمة = سعر أرخص أرض مطابقة لكل مشترٍ."
        insight={<>قيمة محتملة <b className="text-foreground">{M(qw.value)}</b> ريال بانتظار عرض واحد.</>} to="/admin/offer" cta="اعرض أرضًا">
        <ul className="divide-y">
          {qw.rows.map((r) => (
            <li key={r.id} className="flex cursor-default items-center justify-between gap-3 rounded py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring" {...hov(<><b>{r.name}</b> · {r.id}<br />أفضل مطابقة: {r.parcelId} · {r.district}<br />{r.matches} أراضٍ مطابقة · الميزانية {r.budget ? `${M(r.budget)} ريال` : "غير محددة"}</>)}>
              <div className="min-w-0"><div className="truncate font-medium">{r.name}</div><div className="truncate text-muted-foreground">{r.parcelId} · {r.district}</div></div>
              <div className="shrink-0 text-left"><div className="font-semibold tabular-nums">{M(r.price)}</div><div className="text-muted-foreground">{r.matches} مطابقة</div></div>
            </li>
          ))}
        </ul>
      </Shell>

      <Shell show={show} hide={hide} title="مستثمرون معرّضون للفقدان" sub={`${lr.count} استفسارًا مفتوحًا منذ ${LEAD_RISK_DAYS}+ يومًا`}
        how={`كل استفسار غير مغلق مضى على تاريخه ${LEAD_RISK_DAYS} يومًا أو أكثر حتى لقطة 11 أغسطس 2026، مرتبة من الأقدم. الأحمر = أكثر من 60 يومًا.`}
        insight={<>ميزانيات معرّضة للضياع <b className="text-foreground">{M(lr.budget)}</b> ريال — ابدأ بالأقدم.</>} to="/admin/inquiries" cta="الاستفسارات">
        <ul className="space-y-2.5">
          {lr.rows.map((r) => (
            <li key={r.id} className="grid cursor-default grid-cols-[7rem_1fr_3rem] items-center gap-2 rounded text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring" {...hov(<><b>{r.name}</b> · {r.id}<br />الحالة: {ST[r.status] ?? r.status}<br />ينتظر {r.wait} يومًا · الميزانية {r.budget ? `${M(r.budget)} ريال` : "غير محددة"}</>)}>
              <span className="truncate">{r.name}</span>
              <div className="h-2 rounded-full bg-muted"><div className={`h-full rounded-full ${r.wait > 60 ? "bg-destructive/80" : "bg-primary/70"}`} style={{ width: `${(r.wait / maxRiskWait) * 100}%` }} /></div>
              <span className="text-left tabular-nums text-muted-foreground">{r.wait} يوم</span>
            </li>
          ))}
        </ul>
      </Shell>
    </div>
    <div className="grid gap-4 lg:grid-cols-3">
      <Shell show={show} hide={hide} title="يحتاج ردًّا اليوم" sub={`${b.waiting.count} بلا رد · وسيط الانتظار ${b.waiting.medianWait} يومًا`}
        how="الاستفسارات بحالة «جديد». الحلقة = حصة أعلى 3 ميزانيات من مجموع ميزانيات من لم يُرد عليهم. الانتظار = الأيام من تاريخ الاستفسار حتى لقطة 11 أغسطس 2026."
        insight={<>أعلى 3 مشترين يمثلون <b className="text-foreground">{Math.round(topShare * 100)}%</b> من الميزانيات المنتظرة.</>} to="/admin/inquiries" cta="الاستفسارات">
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 80 80" className="size-24 shrink-0 -rotate-90" {...hov(<>مجموع الميزانيات: <b>{M(b.waiting.totalBudget)}</b> ريال<br />أعلى 3: {Math.round(topShare * 100)}%</>)}>
            <circle cx="40" cy="40" r={R} fill="none" className="stroke-muted" strokeWidth="9" />
            <circle cx="40" cy="40" r={R} fill="none" className="stroke-primary" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${topShare * C} ${C}`} />
            <text x="40" y="44" textAnchor="middle" className="rotate-90 fill-foreground text-[13px] font-semibold" style={{ transformOrigin: "40px 40px" }}>{b.waiting.count}</text>
          </svg>
          <ul className="min-w-0 flex-1 space-y-2">
            {b.waiting.top.map((w) => (
              <li key={w.id} className="cursor-default rounded outline-none focus-visible:ring-2 focus-visible:ring-ring" {...hov(<><b>{w.name}</b> · {w.id}<br />{LAND_AR[w.type]} · {AREA_AR[w.area]}<br />الميزانية {M(w.budget)} ريال · ينتظر {w.wait} يومًا</>)}>
                <div className="flex justify-between gap-2 text-xs"><span className="truncate">{w.name}</span><span className="tabular-nums text-muted-foreground">{M(w.budget)}</span></div>
                <div className="mt-1 h-1.5 rounded-full bg-muted"><div className={`h-full rounded-full ${w.wait > 45 ? "bg-destructive/80" : "bg-primary/70"}`} style={{ width: `${(w.budget / topBudget) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </div>
      </Shell>

      <Shell show={show} hide={hide} title="أراضٍ معرّضة للركود" sub={`${b.stagnant.overDouble} تجاوزت ضعف الوسيط`}
        how={`أطول 5 أراضٍ متاحة بقاءً في العرض. الخط العمودي = وسيط أيام الإغلاق في الصفقات المغلقة (${b.stagnant.median} يومًا). الأحمر = أكثر من ضعف الوسيط.`}
        insight={<>أطول أرض معروضة منذ <b className="text-foreground">{b.stagnant.rows[0]?.days ?? 0}</b> يومًا — راجع تسعيرها.</>} to="/admin/portfolio" cta="المحفظة">
        <ul className="space-y-2.5">
          {b.stagnant.rows.map((r) => {
            const over = r.days > 2 * b.stagnant.median;
            return (
              <li key={r.id} className="grid cursor-default grid-cols-[5.5rem_1fr_3rem] items-center gap-2 rounded text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring" {...hov(<><b>{r.district}</b> · {r.id}<br />{r.days} يومًا في العرض<br />الوسيط {b.stagnant.median} يومًا · {(r.days / Math.max(1, b.stagnant.median)).toFixed(1)}×</>)}>
                <span className="truncate">{r.district}</span>
                <div className="relative h-2 rounded-full bg-muted">
                  <div className={`absolute inset-y-0 right-0 rounded-full ${over ? "bg-destructive/80" : "bg-primary/70"}`} style={{ width: `${(r.days / maxDays) * 100}%` }} />
                  <div className="absolute -inset-y-1 w-0.5 bg-foreground" style={{ right: `${(b.stagnant.median / maxDays) * 100}%` }} />
                </div>
                <span className="text-left tabular-nums text-muted-foreground">{r.days} يوم</span>
              </li>
            );
          })}
        </ul>
      </Shell>

      <Shell show={show} hide={hide} title="فرص لسدّ النقص" sub="طلب مفتوح بلا أي أرض متاحة"
        how="الشرائح (المنطقة × نوع الأرض) التي فيها استفسارات مفتوحة وصفر أراضٍ متاحة. شدة اللون = عدد المنتظرين؛ الميزانية = مجموع ميزانياتهم."
        insight={b.shortages.length ? <><b className="text-foreground">{b.shortages.length}</b> شرائح بلا مخزون — أولها {LAND_AR[b.shortages[0]!.landType]} {AREA_AR[b.shortages[0]!.area]}.</> : "لا توجد شريحة بلا مخزون."} to="/admin/add" cta="أضف أرضًا">
        {b.shortages.length ? (
          <div className="grid grid-cols-2 gap-2">
            {b.shortages.map((s) => (
              <div key={`${s.area}${s.landType}`} className="cursor-default rounded-lg border border-warning/30 p-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring" style={{ backgroundColor: `color-mix(in oklab, var(--warning) ${10 + (s.waiting / maxWait) * 35}%, transparent)` }}
                {...hov(<><b>{LAND_AR[s.landType]} · {AREA_AR[s.area]}</b><br />{s.waiting} ينتظرون · 0 أرض متاحة<br />الميزانيات {s.budget ? `${M(s.budget)} ريال` : "غير محددة"}</>)}>
                <div className="text-xs font-medium">{LAND_AR[s.landType]} · {AREA_AR[s.area]}</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">{s.waiting}<span className="mr-1 text-xs font-normal text-muted-foreground">ينتظرون</span></div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground">كل الشرائح المطلوبة فيها أرض متاحة.</p>}
      </Shell>
    </div>
      {layer}
    </div>
  );
}
