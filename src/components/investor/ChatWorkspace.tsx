import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, BarChart3, Columns2, ExternalLink, GitCompare, LandPlot, Map as MapIcon, MessageSquare, PanelRight, Plus, Radar, Search, Send, Sparkle, X } from "lucide-react";
import logo from "@/assets/sarj_logo.png.asset.json";
import { askSarjAgent } from "@/lib/sarjAgent.functions";
import { usePortfolio } from "@/context/PortfolioProvider";
import { initialParcels } from "@/data";
import { INVESTOR_SCENARIOS, type ChatMsg } from "@/data/chatScenarios";
import { isAvailable } from "@/lib/portfolioEngine";
import { getParcelInsight } from "@/lib/investorEngine";
import type { UiPayload } from "@/lib/agentUi";
import type { Parcel } from "@/data/types";

interface Thread { id: string; title: string; group: "اليوم" | "أمس" | "آخر 7 أيام"; msgs: ChatMsg[] }

const MORE_HISTORY: { title: string; q: string; group: Thread["group"] }[] = [
  { title: "أفضل ثلاثة مواقع لمستشفى شمال الرياض", q: "أعطني أفضل ثلاثة مواقع لمستشفى شمال الرياض", group: "اليوم" },
  { title: "مستودع شرق الرياض بميزانية 6 ملايين", q: "أبغى أرض لمستودع شرق الرياض بميزانية 6 ملايين", group: "أمس" },
  { title: "أراضٍ بعرض شارع 40 مترًا فأكثر", q: "أرني أراضي بعرض شارع 40 مترًا فأكثر", group: "أمس" },
  { title: "معرض سيارات على طريق رئيسي", q: "أبغى أرض تجارية لمعرض سيارات على شارع عريض", group: "آخر 7 أيام" },
  { title: "قطع سكنية ضمن 3 ملايين", q: "قطع سكنية للبيع ضمن 3 ملايين", group: "آخر 7 أيام" },
];

const STARTERS = [
  { icon: Radar, title: "حلّل نطاق الوصول", body: "أيّ الأراضي التجارية الكبيرة لها أوسع شارع لدخول الشاحنات؟", q: "أبغى أرض تجارية كبيرة يهمني دخول الشاحنات" },
  { icon: BarChart3, title: "اعثر على هامش تفاوض", body: "أي الأراضي معروضة أطول من وسيط شريحتها؟", q: "أعطني تقرير هامش التفاوض لأراضي سكنية شمال الرياض تحت 3.5 مليون" },
  { icon: Columns2, title: "قارن أرضين", body: "ما الفرق بين الرمال والمناخ في السعر والمدة؟", q: "قارن بين SRE-015 وSRE-081" },
];

export function ChatWorkspace() {
  const { parcels, investorName } = usePortfolio();
  const first = (investorName ?? "العنود").split(" ")[0];
  const preloaded = useMemo<Thread[]>(() => [
    ...INVESTOR_SCENARIOS.map((s, i) => ({ id: s.id, title: s.title, group: (i === 0 ? "اليوم" : i === 1 ? "اليوم" : "أمس") as Thread["group"], msgs: s.build(parcels, []) })),
    ...MORE_HISTORY.map((h, i) => ({ id: `h${i}`, title: h.title, group: h.group, msgs: [{ role: "user" as const, text: h.q }] })),
  ], [parcels]);
  const [live, setLive] = useState<Thread[]>([]);
  const threads = [...live, ...preloaded];
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [sideOpen, setSideOpen] = useState(true);
  const [report, setReport] = useState<Extract<UiPayload, { kind: "negotiation_report" }> | null>(null);
  const active = threads.find((t) => t.id === activeId) ?? null;
  const ask = useServerFn(askSarjAgent);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [active?.msgs.length, busy]);
  useEffect(() => { inputRef.current?.focus(); setReport(null); }, [activeId]);

  // history items that only hold a question are answered live on first open
  useEffect(() => {
    if (active && active.msgs.length === 1 && active.msgs[0]!.role === "user" && !busy && !live.some((l) => l.id === active.id)) run(active.msgs[0]!.text, active.id, [], active.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const run = async (text: string, id: string, base: ChatMsg[], title: string) => {
    const next: ChatMsg[] = [...base, { role: "user", text }];
    setLive((l) => [{ id, title, group: "اليوم", msgs: next }, ...l.filter((t) => t.id !== id)]);
    setActiveId(id);
    setBusy(true);
    const r = await ask({ data: { mode: "investor", messages: next.map((m) => ({ role: m.role, content: m.text })), extraParcels: parcels.filter((p) => !initialParcels.some((x) => x.parcel_id === p.parcel_id)) } }).catch(() => null);
    setBusy(false);
    const ui: UiPayload | null = r?.ok ? (r.ui ?? null) : null;
    setLive((l) => l.map((t) => (t.id === id ? { ...t, msgs: [...next, { role: "assistant", text: r?.ok ? r.text : (r?.error ?? "تعذّر الوصول إلى المحلّل الآن."), ui }] } : t)));
    if (ui?.kind === "negotiation_report") setReport(ui);
    inputRef.current?.focus();
  };

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;
    setInput("");
    if (active && live.some((l) => l.id === active.id)) run(text, active.id, active.msgs, active.title);
    else run(text, `live-${Date.now()}`, active?.msgs ?? [], active?.title ?? text.slice(0, 42));
  };

  const shown = threads.filter((t) => t.title.includes(filter));
  const groups = (["اليوم", "أمس", "آخر 7 أيام"] as const).map((g) => [g, shown.filter((t) => t.group === g)] as const).filter(([, l]) => l.length);
  const navItem = "flex items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-secondary";

  return (
    <div dir="rtl" className="fixed inset-0 flex bg-background">
      {sideOpen && (
        <aside className="flex w-72 shrink-0 flex-col border-l bg-surface">
          <div className="flex items-center justify-between px-4 pt-4">
            <Link to="/"><img src={logo.url} alt="سرج" className="h-8" /></Link>
            <button aria-label="إخفاء القائمة" onClick={() => setSideOpen(false)} className="grid size-8 place-items-center rounded-lg hover:bg-secondary"><PanelRight className="size-4" /></button>
          </div>
          <button onClick={() => { setActiveId(null); setInput(""); }} className="mx-4 mt-5 flex items-center justify-center gap-2 rounded-2xl bg-ink py-3 text-sm font-medium text-ink-foreground"><Plus className="size-4" />محادثة جديدة</button>
          <label className="mx-4 mt-3 flex items-center gap-2 rounded-2xl bg-secondary px-3 py-2.5 text-sm">
            <Search className="size-4 text-muted-foreground" />
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="ابحث في المحادثات" className="min-w-0 flex-1 bg-transparent outline-none" />
          </label>
          <nav className="mx-2 mt-4 space-y-0.5 border-b pb-3">
            <Link to="/investor" className={navItem}><span className="flex items-center gap-2"><LandPlot className="size-4" />الأراضي</span><span className="font-mono text-xs text-muted-foreground">{parcels.filter(isAvailable).length}</span></Link>
            <Link to="/investor/map" className={navItem}><span className="flex items-center gap-2"><MapIcon className="size-4" />الخريطة</span></Link>
            <Link to="/investor/compare" className={navItem}><span className="flex items-center gap-2"><GitCompare className="size-4" />المقارنة</span></Link>
            <Link to="/investor/inquiries" className={navItem}><span className="flex items-center gap-2"><Send className="size-4" />استفساراتي</span></Link>
          </nav>
          <div className="flex-1 overflow-y-auto px-2 py-3">
            {groups.map(([g, list]) => (
              <div key={g} className="mb-3">
                <div className="px-3 pb-1 text-xs text-muted-foreground">{g}</div>
                {list.map((t) => (
                  <button key={t.id} onClick={() => setActiveId(t.id)} className={`block w-full truncate rounded-xl px-3 py-2 text-right text-sm ${t.id === activeId ? "bg-accent font-medium text-accent-foreground" : "hover:bg-secondary"}`}>{t.title}</button>
                ))}
              </div>
            ))}
          </div>
          <div className="m-3 flex items-center gap-3 rounded-2xl border p-3">
            <span className="grid size-9 place-items-center rounded-full bg-accent font-semibold text-accent-foreground">{first[0]}</span>
            <div><div className="text-sm font-semibold">{investorName ?? "العنود السميل"}</div><div className="text-xs text-muted-foreground">مستثمرة</div></div>
          </div>
        </aside>
      )}

      <main className="relative flex min-w-0 flex-1 flex-col">
        {!sideOpen && <button aria-label="إظهار القائمة" onClick={() => setSideOpen(true)} className="absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-lg border bg-surface"><PanelRight className="size-4" /></button>}

        {!active ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6">
            <div className="sarj-orb size-28 rounded-full" />
            <h1 className="mt-8 text-center text-3xl font-bold leading-snug"><span className="text-primary">أهلًا {first}</span><br />ما الذي تنوين بناءه؟</h1>
            <Composer value={input} onChange={setInput} onSend={() => send(input)} busy={busy} inputRef={inputRef} big placeholder="مثلًا: أبحث عن أرض لمستودع جنوب الرياض، ميزانيتي مليون ريال سنويًا" />
            <div className="mt-5 grid w-full max-w-2xl gap-3 sm:grid-cols-3">
              {STARTERS.map((s) => (
                <button key={s.title} onClick={() => send(s.q)} className="rounded-2xl border bg-surface p-4 text-right transition hover:-translate-y-0.5 hover:shadow-md">
                  <s.icon className="size-5 text-primary" />
                  <div className="mt-3 font-semibold">{s.title}</div>
                  <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.body}</div>
                </button>
              ))}
            </div>
            <p className="mt-10 text-xs text-muted-foreground">{parcels.length} أرضًا في المحفظة · لقطة البيانات 11 أغسطس 2026 · محلّل المواقع لا يرى أي استفسار أو بيانات تواصل</p>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1">
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-3xl space-y-8 px-6 py-10">
                  {active.msgs.map((m, i) => m.role === "user" ? (
                    <div key={i} className="mr-auto w-fit max-w-[80%] rounded-3xl bg-secondary px-5 py-3 leading-relaxed">{m.text}</div>
                  ) : (
                    <AssistantTurn key={i} m={m} onOpenReport={setReport} onAsk={send} />
                  ))}
                  {busy && <div className="flex items-center gap-3 text-sm text-muted-foreground"><span className="sarj-orb size-5 rounded-full" />يحلّل المحفظة…</div>}
                  <div ref={endRef} />
                </div>
              </div>
              <div className="mx-auto w-full max-w-3xl px-6 pb-6">
                <Composer value={input} onChange={setInput} onSend={() => send(input)} busy={busy} inputRef={inputRef} placeholder="اسألي عن أي أرض، أو عدّلي قيودك…" />
              </div>
            </div>
            {report && <ReportPanel ui={report} onClose={() => setReport(null)} />}
          </div>
        )}
      </main>
    </div>
  );
}

function Composer({ value, onChange, onSend, busy, inputRef, big, placeholder }: { value: string; onChange: (v: string) => void; onSend: () => void; busy: boolean; inputRef: React.RefObject<HTMLTextAreaElement | null>; big?: boolean; placeholder: string }) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSend(); }} className={`w-full rounded-3xl border bg-surface shadow-lg transition focus-within:border-primary/60 focus-within:shadow-[var(--shadow-glow,0_0_0_4px_color-mix(in_oklab,var(--primary)_12%,transparent))] ${big ? "mt-8 max-w-2xl p-4" : "flex items-end gap-2 p-3"}`}>
      <textarea
        ref={inputRef}
        value={value}
        rows={big ? 2 : 1}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
        placeholder={placeholder}
        className="w-full flex-1 resize-none bg-transparent px-2 py-1.5 leading-relaxed outline-none"
      />
      <div className={big ? "mt-2 flex justify-end" : ""}>
        <button type="submit" disabled={busy || !value.trim()} aria-label="إرسال" className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground transition disabled:opacity-40"><ArrowLeft className="size-4" /></button>
      </div>
    </form>
  );
}

function AssistantTurn({ m, onOpenReport, onAsk }: { m: ChatMsg; onOpenReport: (u: Extract<UiPayload, { kind: "negotiation_report" }>) => void; onAsk: (q: string) => void }) {
  const { parcels } = usePortfolio();
  const ids = m.ui && "parcelIds" in m.ui ? m.ui.parcelIds : [];
  const lines = m.text.split("\n").filter(Boolean);
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Sparkle className="size-3.5 text-primary" />محلّل المواقع{ids.length ? ` · ${ids.length} نتائج من ${parcels.filter(isAvailable).length} أرضًا متاحة` : ""}</div>
      {lines[0] && <p className="text-lg font-semibold leading-relaxed">{lines[0]}</p>}
      {lines.slice(1).map((l, i) => <p key={i} className="mt-2 leading-relaxed text-foreground/80">{l}</p>)}

      {m.ui?.kind === "cards" && (
        <div className="mt-5 grid gap-3 md:grid-cols-2">{ids.map((id) => parcels.find((p) => p.parcel_id === id)).filter(Boolean).map((p) => <RichCard key={p!.parcel_id} p={p!} />)}</div>
      )}
      {m.ui?.kind === "negotiation_report" && (
        <button onClick={() => onOpenReport(m.ui as Extract<UiPayload, { kind: "negotiation_report" }>)} className="mt-5 flex w-full items-center gap-3 rounded-2xl border-2 border-primary/40 bg-surface p-4 text-right hover:border-primary">
          <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground"><BarChart3 className="size-5" /></span>
          <span className="flex-1"><span className="block font-semibold">تقرير هامش التفاوض</span><span className="text-xs text-muted-foreground">{m.ui.funnel.recommended} مرشّحة · {m.ui.funnel.analyzed - m.ui.funnel.recommended} أخرى</span></span>
          <ExternalLink className="size-4 text-muted-foreground" />
        </button>
      )}
      {ids.length > 0 && (
        <Link to="/investor/map" className="mt-3 flex items-center gap-3 rounded-2xl border bg-surface p-4 hover:bg-secondary">
          <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground"><MapIcon className="size-5" /></span>
          <span className="flex-1"><span className="block font-semibold">المواقع على الخريطة</span><span className="text-xs text-muted-foreground">{ids.length} مواقع</span></span>
          <span className="text-sm text-primary">اعرض الخريطة</span>
        </Link>
      )}
      {ids.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {["أرني أراضي البيع فقط", "وسّع البحث إلى شمال الرياض", ids.length >= 2 ? `قارن بين ${ids[0]} و${ids[1]}` : null].filter(Boolean).map((q) => (
            <button key={q} onClick={() => onAsk(q!)} className="rounded-full border bg-surface px-4 py-2 text-sm hover:bg-secondary">{q}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function RichCard({ p }: { p: Parcel }) {
  const { parcels } = usePortfolio();
  const ins = getParcelInsight(parcels, p.parcel_id);
  const lease = p.listing_type === "lease";
  const stat = (v: string | number, l: string) => <div><div className="font-mono font-semibold">{typeof v === "number" ? v.toLocaleString("en-US") : v}</div><div className="text-xs text-muted-foreground">{l}</div></div>;
  return (
    <Link to="/investor/parcels/$parcelId" params={{ parcelId: p.parcel_id }} className="block rounded-2xl border bg-surface p-4 transition hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div><div className="text-lg font-semibold">{p.district_ar}</div><div className="font-mono text-xs text-muted-foreground">{p.parcel_id} · {p.land_type === "commercial" ? "تجاري" : "سكني"}</div></div>
        <div className="flex gap-1.5">
          <span className="rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground">{lease ? "إيجار سنوي" : "بيع"}</span>
          <span className={`rounded-full px-2.5 py-1 text-xs ${p.days_on_market > 120 ? "bg-secondary" : "bg-primary-soft/30"}`}>{p.days_on_market > 120 ? `${p.days_on_market} يومًا` : "متاحة"}</span>
        </div>
      </div>
      <div className="mt-3 text-2xl font-bold">{p.total_price_sar != null ? p.total_price_sar.toLocaleString("en-US") : "السعر غير مسجل"} <span className="text-xs font-normal text-muted-foreground">ريال{lease ? " · إيجار سنوي" : ""}</span></div>
      <div className="mt-3 grid grid-cols-4 gap-2 border-b pb-3">{stat(p.area_sqm, "م²")}{stat(p.price_per_sqm_sar ?? "—", lease ? "ريال/م²/سنة" : "ريال/م²")}{stat(p.street_width_m, "عرض الشارع")}{stat(p.days_on_market, "يومًا")}</div>
      <p className="mt-3 text-xs text-muted-foreground">{ins?.priceDeltaPct != null ? `سعر المتر ${ins.priceDeltaPct > 0 ? "+" : ""}${ins.priceDeltaPct}% عن وسيط ${ins.segment.closedDeals} صفقات مغلقة` : "عينة غير كافية للمقارنة بالوسيط"}</p>
    </Link>
  );
}

function ReportPanel({ ui, onClose }: { ui: Extract<UiPayload, { kind: "negotiation_report" }>; onClose: () => void }) {
  const { parcels } = usePortfolio();
  const [tab, setTab] = useState<"sum" | "list" | "src">("sum");
  const rows = ui.parcelIds.map((id) => parcels.find((p) => p.parcel_id === id)).filter(Boolean) as Parcel[];
  const max = Math.max(...rows.map((p) => ui.multipliers[p.parcel_id] ?? 0), 1);
  const tabs = [["sum", "الملخّص"], ["list", "الأراضي المرشّحة"], ["src", "المصادر والحدود"]] as const;
  return (
    <aside className="m-3 flex w-[min(620px,50vw)] shrink-0 flex-col overflow-hidden rounded-3xl border bg-surface shadow-xl">
      <header className="flex items-center justify-between px-6 pt-5">
        <h2 className="text-xl font-bold">تقرير هامش التفاوض</h2>
        <button aria-label="إغلاق" onClick={onClose} className="grid size-8 place-items-center rounded-lg hover:bg-secondary"><X className="size-4" /></button>
      </header>
      <div className="mx-6 mt-4 flex w-fit gap-1 rounded-xl bg-secondary p-1 text-sm">
        {tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-lg px-4 py-1.5 ${tab === k ? "bg-primary text-primary-foreground" : ""}`}>{l}</button>)}
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {tab === "src" ? (
          <p className="text-sm leading-relaxed text-muted-foreground">المضاعف = أيام العرض ÷ وسيط أيام الإغلاق في الشريحة نفسها (المنطقة · النوع · الصفقة). الوسائط محسوبة من الصفقات المغلقة في سجلّ سرج وحده، والشريحة التي فيها أقل من ثلاث صفقات مغلقة لا يُعرض لها وسيط.</p>
        ) : (
          <>
            {tab === "sum" && (
              <div className="mb-5 flex items-center gap-6 rounded-2xl border p-4">
                <div className="border-l pl-6"><div className="text-xs text-muted-foreground">المواقع المحلّلة</div><div className="font-mono text-3xl font-bold">{ui.funnel.analyzed}</div></div>
                <div className="flex flex-wrap gap-4 text-sm"><span>داخل الميزانية <b className="font-mono">{ui.funnel.in_budget}</b></span><span className="text-primary">مرشّحة <b className="font-mono">{ui.funnel.recommended}</b></span><span className="text-muted-foreground">مستبعدة <b className="font-mono">{ui.funnel.analyzed - ui.funnel.in_budget}</b></span></div>
              </div>
            )}
            <div className="overflow-hidden rounded-2xl border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-xs text-muted-foreground"><tr><th className="p-3 text-right">الأرض</th><th className="p-3 text-right">مدة العرض</th><th className="p-3 text-right">السعر</th><th className="p-3 text-right">تجاوز وسيط الإغلاق</th><th /></tr></thead>
                <tbody>
                  {rows.map((p) => { const m = ui.multipliers[p.parcel_id] ?? 0; return (
                    <tr key={p.parcel_id} className="border-t">
                      <td className="p-3"><div className="font-semibold">{p.district_ar}</div><div className="font-mono text-xs text-muted-foreground">{p.parcel_id}</div></td>
                      <td className="p-3 font-mono">{p.days_on_market} يومًا</td>
                      <td className="p-3 font-mono">{p.total_price_sar?.toLocaleString("en-US") ?? "—"}</td>
                      <td className="p-3"><div className="flex items-center gap-2"><b className="font-mono">×{m}</b><span className="h-1.5 w-20 rounded-full bg-secondary"><span className="block h-full rounded-full bg-primary" style={{ width: `${(m / max) * 100}%` }} /></span></div></td>
                      <td className="p-3"><Link to="/investor/parcels/$parcelId" params={{ parcelId: p.parcel_id }} className="text-primary">افتح</Link></td>
                    </tr>
                  ); })}
                </tbody>
              </table>
            </div>
            <Link to="/investor/map" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm text-accent-foreground"><MapIcon className="size-4" />على الخريطة</Link>
          </>
        )}
      </div>
      <p className="border-t px-6 py-3 text-xs text-muted-foreground">الوسائط من الصفقات المغلقة في سجلّ سرج وحده.</p>
    </aside>
  );
}

export { MessageSquare };
