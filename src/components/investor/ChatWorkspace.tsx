import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { MarketInsightCard } from "@/components/investor/MarketInsightCard";
import { buildMarketInsight } from "@/lib/marketEngine";
import { ClientOnly, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, BarChart3, Briefcase, Columns2, ExternalLink, FileText, GitCompare, Inbox, LandPlot, Map as MapIcon, PanelRight, Plus, Printer, Radar, Search, Send, Sparkle, Sun, Users, X } from "lucide-react";
import logo from "@/assets/sarj_logo.png.asset.json";
import { askSarjAgent } from "@/lib/sarjAgent.functions";
import { usePortfolio } from "@/context/PortfolioProvider";
import { initialInquiries, initialParcels } from "@/data";
import { ADMIN_SCENARIOS, INVESTOR_SCENARIOS, type ChatMsg } from "@/data/chatScenarios";
import { isAvailable } from "@/lib/portfolioEngine";
import { getParcelInsight } from "@/lib/investorEngine";
import { mapCommand } from "@/lib/agentViz";
import type { MapCommand, UiPayload } from "@/lib/agentUi";
import type { Parcel } from "@/data/types";
import { ChatChart } from "@/components/chat/ChatChart";
import { AgentUiBlock } from "@/components/AgentChat";

const ChatMap = lazy(() => import("@/components/chat/ChatMap"));

type Mode = "investor" | "admin";
interface Thread { id: string; title: string; group: "اليوم" | "أمس" | "آخر 7 أيام"; msgs: ChatMsg[] }
type Report = Extract<UiPayload, { kind: "report" }>;
type Nego = Extract<UiPayload, { kind: "negotiation_report" }>;
type Panel = { kind: "map"; command: MapCommand } | { kind: "report"; ui: Report } | { kind: "nego"; ui: Nego } | null;

const CONFIG = {
  investor: {
    agent: "محلّل المواقع",
    role: "مستثمرة",
    question: "ما الذي تنوين بناءه؟",
    placeholder: "مثلًا: أبحث عن أرض لمستودع جنوب الرياض، ميزانيتي مليون ريال سنويًا",
    followPh: "اسألي عن أي أرض، اطلبي رسمًا أو تقريرًا، أو حرّكي الخريطة…",
    footer: "محلّل المواقع لا يرى أي استفسار أو بيانات تواصل",
    history: [
      { title: "أفضل ثلاثة مواقع لمستشفى شمال الرياض", q: "أعطني أفضل ثلاثة مواقع لمستشفى شمال الرياض", group: "اليوم" },
      { title: "تقرير السوق لشرق الرياض", q: "أعطني تقرير السوق لشرق الرياض", group: "أمس" },
      { title: "قرّب الخريطة على حي الملقا", q: "افتح الخريطة وقرّب على حي الملقا", group: "أمس" },
      { title: "ارسم هامش التفاوض في الشمال", q: "ارسم لي أيام العرض مقابل فرق السعر في شمال الرياض", group: "آخر 7 أيام" },
      { title: "قطع سكنية ضمن 3 ملايين", q: "قطع سكنية للبيع ضمن 3 ملايين", group: "آخر 7 أيام" },
    ] as { title: string; q: string; group: Thread["group"] }[],
    starters: [
      { icon: Radar, title: "حلّل نطاق الوصول", body: "أيّ الأراضي التجارية الكبيرة لها أوسع شارع لدخول الشاحنات؟", q: "أبغى أرض تجارية كبيرة يهمني دخول الشاحنات، وأرني إياها على الخريطة" },
      { icon: BarChart3, title: "اعثر على هامش تفاوض", body: "أي الأراضي معروضة أطول من وسيط شريحتها؟", q: "أعطني تقرير هامش التفاوض لأراضي سكنية شمال الرياض تحت 3.5 مليون" },
      { icon: Columns2, title: "قارن أرضين برسم", body: "ارسم الفرق بين الرمال والمناخ في سعر المتر", q: "قارن بين SRE-015 وSRE-081 وارسم سعر المتر" },
    ],
  },
  admin: {
    agent: "مساعد الفريق",
    role: "إدارة المحفظة",
    question: "ما الذي نحسمه اليوم؟",
    placeholder: "مثلًا: عندنا مشترٍ يريد أرضًا تجارية في الشمال، من غيره ينتظر وماذا نعرض؟",
    followPh: "اسأل عن مشترٍ، اطلب تقريرًا أو رسمًا، أو حرّك الخريطة…",
    footer: "مساعد الفريق يرى المحفظة والاستفسارات · للاستخدام الداخلي",
    history: [
      { title: "مشترٍ يريد تجاريًا في الشمال", q: "أريد أرضًا تجارية في الشمال", group: "اليوم" },
      { title: "ارسم فجوة العرض والطلب", q: "ارسم فجوة العرض والطلب لكل المناطق", group: "أمس" },
      { title: "قرّب الخريطة على الأراضي الراكدة", q: "افتح الخريطة على الأراضي الراكدة", group: "آخر 7 أيام" },
    ] as { title: string; q: string; group: Thread["group"] }[],
    starters: [
      { icon: Users, title: "طابق المنتظرين", body: "من ينتظر رداً، وأي أرض تناسبه اليوم؟", q: "طابق الاستفسارات المنتظرة مع المخزون، ومن نستبعد؟" },
      { icon: FileText, title: "تقرير منطقة", body: "تشخيص الشمال مع رسم الفجوة والخريطة", q: "جهّز تقرير الفريق لشمال الرياض وافتح الخريطة عليه" },
      { icon: BarChart3, title: "ارسم الفجوة", body: "صافي العرض ناقص الطلب لكل منطقة ونوع", q: "ارسم فجوة العرض والطلب" },
    ],
  },
} as const;

export function ChatWorkspace({ mode = "investor" }: { mode?: Mode }) {
  const cfg = CONFIG[mode];
  const { parcels, inquiries, investorName } = usePortfolio();
  const first = mode === "admin" ? "فريق سرج" : /[\u0600-\u06FF]/.test(investorName) ? (investorName.split(" ")[0] ?? "العنود") : "العنود";
  const preloaded = useMemo<Thread[]>(() => [
    ...(mode === "admin" ? ADMIN_SCENARIOS : INVESTOR_SCENARIOS).map((s, i) => ({ id: s.id, title: s.title, group: (i < 2 ? "اليوم" : "أمس") as Thread["group"], msgs: s.build(parcels, inquiries) })),
    ...cfg.history.map((h, i) => ({ id: `h${i}`, title: h.title, group: h.group, msgs: [{ role: "user" as const, text: h.q }] })),
  ], [parcels, inquiries, mode, cfg]);
  const [live, setLive] = useState<Thread[]>([]);
  const threads = [...live, ...preloaded.filter((p) => !live.some((l) => l.id === p.id))];
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [sideOpen, setSideOpen] = useState(true);
  const [panel, setPanel] = useState<Panel>(null);
  const active = threads.find((t) => t.id === activeId) ?? null;
  const ask = useServerFn(askSarjAgent);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [active?.msgs.length, busy]);
  useEffect(() => {
    inputRef.current?.focus();
    const last = [...(active?.msgs ?? [])].reverse().find((m) => m.role === "assistant");
    setPanel(last ? panelFor(last) : null);
    if (active && active.msgs.length === 1 && active.msgs[0]!.role === "user" && !busy && !live.some((l) => l.id === active.id)) run(active.msgs[0]!.text, active.id, [], active.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const run = async (text: string, id: string, base: ChatMsg[], title: string) => {
    const next: ChatMsg[] = [...base, { role: "user", text }];
    setLive((l) => [{ id, title, group: "اليوم", msgs: next }, ...l.filter((t) => t.id !== id)]);
    setActiveId(id);
    setBusy(true);
    const r = await ask({
      data: {
        mode,
        messages: next.map((m) => ({ role: m.role, content: m.text })),
        extraParcels: parcels.filter((p) => !initialParcels.some((x) => x.parcel_id === p.parcel_id)),
        extraInquiries: mode === "admin" ? inquiries.filter((q) => !initialInquiries.some((x) => x.inquiry_id === q.inquiry_id)) : [],
      },
    }).catch(() => null);
    setBusy(false);
    const msg: ChatMsg = r?.ok
      ? { role: "assistant", text: r.text, ui: r.ui ?? null, uis: r.uis ?? [], suggestions: r.suggestions }
      : { role: "assistant", text: r?.error ?? "تعذّر الوصول إلى المساعد الآن." };
    setLive((l) => l.map((t) => (t.id === id ? { ...t, msgs: [...next, msg] } : t)));
    const p = panelFor(msg);
    if (p) setPanel(p);
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
  const unanswered = inquiries.filter((i) => i.status === "new").length;

  return (
    <div dir="rtl" className="fixed inset-0 z-40 flex bg-background">
      {sideOpen && (
        <aside className="flex w-72 shrink-0 flex-col border-l bg-surface">
          <div className="flex items-center justify-between px-4 pt-4">
            <Link to="/"><img src={logo.url} alt="سرج" className="h-8" /></Link>
            <button aria-label="إخفاء القائمة" onClick={() => setSideOpen(false)} className="grid size-8 place-items-center rounded-lg hover:bg-secondary"><PanelRight className="size-4" /></button>
          </div>
          <button onClick={() => { setActiveId(null); setInput(""); setPanel(null); }} className="mx-4 mt-5 flex items-center justify-center gap-2 rounded-2xl bg-ink py-3 text-sm font-medium text-ink-foreground"><Plus className="size-4" />محادثة جديدة</button>
          <label className="mx-4 mt-3 flex items-center gap-2 rounded-2xl bg-secondary px-3 py-2.5 text-sm">
            <Search className="size-4 text-muted-foreground" />
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="ابحث في المحادثات" className="min-w-0 flex-1 bg-transparent outline-none" />
          </label>
          <nav className="mx-2 mt-4 space-y-0.5 border-b pb-3">
            {mode === "investor" ? (
              <>
                <Link to="/investor" className={navItem}><span className="flex items-center gap-2"><LandPlot className="size-4" />الأراضي</span><span className="font-mono text-xs text-muted-foreground">{parcels.filter(isAvailable).length}</span></Link>
                <button onClick={() => setPanel({ kind: "map", command: mapCommand(parcels, {}) })} className={`${navItem} w-full`}><span className="flex items-center gap-2"><MapIcon className="size-4" />الخريطة</span></button>
                <Link to="/investor/compare" className={navItem}><span className="flex items-center gap-2"><GitCompare className="size-4" />المقارنة</span></Link>
                <Link to="/investor/inquiries" className={navItem}><span className="flex items-center gap-2"><Send className="size-4" />استفساراتي</span></Link>
              </>
            ) : (
              <>
                <Link to="/admin" className={navItem}><span className="flex items-center gap-2"><Sun className="size-4" />اليوم</span></Link>
                <Link to="/admin/portfolio" className={navItem}><span className="flex items-center gap-2"><Briefcase className="size-4" />المحفظة</span><span className="font-mono text-xs text-muted-foreground">{parcels.length}</span></Link>
                <Link to="/admin/inquiries" className={navItem}><span className="flex items-center gap-2"><Inbox className="size-4" />الاستفسارات</span><span className="rounded-full bg-destructive/10 px-2 text-xs text-destructive">{unanswered} بلا رد</span></Link>
                <button onClick={() => setPanel({ kind: "map", command: mapCommand(parcels, {}) })} className={`${navItem} w-full`}><span className="flex items-center gap-2"><MapIcon className="size-4" />الخريطة</span></button>
                <Link to="/admin/performance" className={navItem}><span className="flex items-center gap-2"><BarChart3 className="size-4" />الأداء</span></Link>
              </>
            )}
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
            <span className="grid size-9 place-items-center rounded-full bg-accent font-semibold text-accent-foreground">{mode === "admin" ? "س" : /[\u0600-\u06FF]/.test(first) ? first[0] : "ع"}</span>
            <div><div className="text-sm font-semibold">{mode === "admin" ? "فريق سرج" : investorName || "العنود السميل"}</div><div className="text-xs text-muted-foreground">{cfg.role}</div></div>
          </div>
        </aside>
      )}

      <main className="relative flex min-w-0 flex-1 flex-col">
        {!sideOpen && <button aria-label="إظهار القائمة" onClick={() => setSideOpen(true)} className="absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-lg border bg-surface"><PanelRight className="size-4" /></button>}
        <div className="flex min-h-0 flex-1">
          {!active ? (
            <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6">
              <div className="sarj-orb size-28 rounded-full" />
              <h1 className="mt-8 text-center text-3xl font-bold leading-snug"><span className="text-primary">أهلًا {first}</span><br />{cfg.question}</h1>
              <Composer value={input} onChange={setInput} onSend={() => send(input)} busy={busy} inputRef={inputRef} big placeholder={cfg.placeholder} />
              <div className="mt-5 grid w-full max-w-2xl gap-3 sm:grid-cols-3">
                {cfg.starters.map((s) => (
                  <button key={s.title} onClick={() => send(s.q)} className="rounded-2xl border bg-surface p-4 text-right transition hover:-translate-y-0.5 hover:shadow-md">
                    <s.icon className="size-5 text-primary" />
                    <div className="mt-3 font-semibold">{s.title}</div>
                    <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.body}</div>
                  </button>
                ))}
              </div>
              <p className="mt-10 text-center text-xs text-muted-foreground">{parcels.length} أرضًا في المحفظة · لقطة البيانات 11 أغسطس 2026 · {cfg.footer}</p>
            </div>
          ) : (
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-3xl space-y-8 px-6 py-10">
                  {active.msgs.map((m, i) => m.role === "user" ? (
                    <div key={i} className="mr-auto w-fit max-w-[80%] rounded-3xl bg-secondary px-5 py-3 leading-relaxed">{m.text}</div>
                  ) : (
                    <AssistantTurn key={i} m={m} mode={mode} agent={cfg.agent} onPanel={setPanel} onAsk={send} />
                  ))}
                  {busy && <div className="flex items-center gap-3 text-sm text-muted-foreground"><span className="sarj-orb size-5 rounded-full" />يحلّل البيانات…</div>}
                  <div ref={endRef} />
                </div>
              </div>
              <div className="mx-auto w-full max-w-3xl px-6 pb-6">
                <Composer value={input} onChange={setInput} onSend={() => send(input)} busy={busy} inputRef={inputRef} placeholder={cfg.followPh} />
              </div>
            </div>
          )}
          {panel && <SidePanel panel={panel} mode={mode} onClose={() => setPanel(null)} onAsk={send} />}
        </div>
      </main>
    </div>
  );
}

function payloads(m: ChatMsg): UiPayload[] {
  return m.uis?.length ? m.uis : m.ui ? [m.ui] : [];
}

function panelFor(m: ChatMsg): Panel {
  const list = payloads(m);
  const rep = list.find((u) => u.kind === "report") as Report | undefined;
  if (rep) return { kind: "report", ui: rep };
  const nego = list.find((u) => u.kind === "negotiation_report") as Nego | undefined;
  if (nego) return { kind: "nego", ui: nego };
  const map = list.find((u) => u.kind === "map");
  if (map && map.kind === "map") return { kind: "map", command: map.command };
  return null;
}

function Composer({ value, onChange, onSend, busy, inputRef, big, placeholder }: { value: string; onChange: (v: string) => void; onSend: () => void; busy: boolean; inputRef: React.RefObject<HTMLTextAreaElement | null>; big?: boolean; placeholder: string }) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSend(); }} className={`w-full rounded-3xl border bg-surface shadow-lg transition focus-within:border-primary/60 ${big ? "mt-8 max-w-2xl p-4" : "flex items-end gap-2 p-3"}`}>
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

function AssistantTurn({ m, mode, agent, onPanel, onAsk }: { m: ChatMsg; mode: Mode; agent: string; onPanel: (p: Panel) => void; onAsk: (q: string) => void }) {
  const { parcels } = usePortfolio();
  const list = payloads(m);
  const cards = list.find((u) => u.kind === "cards" || u.kind === "negotiation_report") as { parcelIds: string[] } | undefined;
  const ids = cards?.parcelIds ?? [];
  const lines = m.text.split("\n").filter(Boolean);
  const hasMap = list.some((u) => u.kind === "map");
  const chips = m.suggestions ?? (ids.length
    ? (mode === "admin"
      ? ["من ينتظر أرضًا مثل هذه؟", "ارسم أيام العرض لهذه الأراضي", "جهّز تقريرًا لهذه المنطقة"]
      : ["أرني أراضي البيع فقط", "ارسم سعر المتر لهذه الأراضي", ids.length >= 2 ? `قارن بين ${ids[0]} و${ids[1]}` : "وسّع البحث إلى شمال الرياض"])
    : []);
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Sparkle className="size-3.5 text-primary" />{agent}{ids.length ? ` · ${ids.length} نتائج من ${parcels.filter(isAvailable).length} أرضًا متاحة` : ""}</div>
      {lines.length > 0 && (
        <div className="max-w-2xl rounded-3xl rounded-tr-md border bg-surface px-5 py-4 shadow-sm">
          {lines.map((l, i) => <p key={i} className={`leading-8 ${i ? "mt-2 text-foreground/85" : "text-[15px] text-foreground"}`}>{l}</p>)}
        </div>
      )}

      {list.map((u, i) => {
        if (u.kind === "cards") return <div key={i} className="mt-5 grid gap-3 md:grid-cols-2">{u.parcelIds.map((id) => parcels.find((p) => p.parcel_id === id)).filter(Boolean).map((p) => <RichCard key={p!.parcel_id} p={p!} mode={mode} />)}</div>;
        if (u.kind === "market_insight") { const mp = parcels.find((p) => p.parcel_id === u.parcelId); return mp ? <div key={i} className="mt-5"><MarketInsightCard insight={buildMarketInsight(mp, parcels)} /></div> : null; }
        if (u.kind === "chart") return <div key={i} className="mt-5"><ChatChart spec={u.chart} onPick={(id) => onPanel({ kind: "map", command: mapCommand(parcels, { parcel_ids: [id] }) })} /></div>;
        if (u.kind === "negotiation_report") return <PanelLink key={i} icon={BarChart3} title="تقرير هامش التفاوض" sub={`${u.funnel.recommended} مرشّحة من ${u.funnel.analyzed}`} onClick={() => onPanel({ kind: "nego", ui: u })} />;
        if (u.kind === "report") return <PanelLink key={i} icon={FileText} title={u.title} sub={`${u.sections.length} أقسام · افتح للطباعة أو الحفظ PDF`} onClick={() => onPanel({ kind: "report", ui: u })} />;
        if (u.kind === "map") return <PanelLink key={i} icon={MapIcon} title="الخريطة" sub={u.command.label} onClick={() => onPanel({ kind: "map", command: u.command })} />;
        if (u.kind === "suitability") return <SuitabilityBlock key={i} ui={u} />;
        return <AgentUiBlock key={i} ui={u} />;
      })}
      {ids.length > 0 && !hasMap && <PanelLink icon={MapIcon} title="المواقع على الخريطة" sub={`${ids.length} مواقع`} onClick={() => onPanel({ kind: "map", command: mapCommand(parcels, { parcel_ids: ids }) })} />}
      {chips.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {chips.map((q) => <button key={q} onClick={() => onAsk(q)} className="rounded-full border bg-surface px-4 py-2 text-sm hover:bg-secondary">{q}</button>)}
        </div>
      )}
    </div>
  );
}

function SuitabilityBlock({ ui }: { ui: Extract<UiPayload, { kind: "suitability" }> }) {
  const tone = (s: number | null) => (s == null ? "bg-muted text-muted-foreground" : s >= 70 ? "bg-primary text-primary-foreground" : s >= 45 ? "bg-accent text-accent-foreground" : "bg-destructive/15 text-destructive");
  return (
    <div className="mt-5 grid gap-3 md:grid-cols-2">
      {ui.results.map((r) => (
        <div key={r.district} className="rounded-2xl border bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <div><div className="font-semibold">{r.district}</div><div className="text-xs text-muted-foreground">{r.label}</div></div>
            <span className={`grid size-12 place-items-center rounded-full text-lg font-bold ${tone(r.score)}`}>{r.score ?? "—"}</span>
          </div>
          {r.services && (
            <ul className="mt-3 grid grid-cols-2 gap-1 text-xs">
              {r.services.map((s) => <li key={s.category} className="flex justify-between rounded-lg bg-secondary px-2 py-1"><span>{s.label_ar}</span><span className="font-medium">{s.minutes == null ? "غير موجود" : `${s.minutes} د`}</span></li>)}
            </ul>
          )}
          {r.population2026 != null && <div className="mt-2 text-xs text-muted-foreground">السكان 2026 (تقدير): <b className="text-foreground">{r.population2026.toLocaleString("en-US")}</b></div>}
          <ul className="mt-3 space-y-1 text-sm text-foreground/80">{r.reasons.map((x) => <li key={x}>• {x}</li>)}</ul>
          <div className="mt-2 text-[11px] text-muted-foreground">المصدر: {ui.source} · {r.found} مكانًا · أوقات القيادة تقديرية</div>
        </div>
      ))}
    </div>
  );
}

function PanelLink({ icon: Icon, title, sub, onClick }: { icon: typeof MapIcon; title: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="mt-3 flex w-full items-center gap-3 rounded-2xl border bg-surface p-4 text-right hover:border-primary/60">
      <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground"><Icon className="size-5" /></span>
      <span className="flex-1"><span className="block font-semibold">{title}</span><span className="text-xs text-muted-foreground">{sub}</span></span>
      <ExternalLink className="size-4 text-muted-foreground" />
    </button>
  );
}

function RichCard({ p, mode }: { p: Parcel; mode: Mode }) {
  const { parcels } = usePortfolio();
  const ins = getParcelInsight(parcels, p.parcel_id);
  const lease = p.listing_type === "lease";
  const stat = (v: string | number, l: string) => <div><div className="font-mono font-semibold">{typeof v === "number" ? v.toLocaleString("en-US") : v}</div><div className="text-xs text-muted-foreground">{l}</div></div>;
  const body = (
    <>
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
    </>
  );
  const cls = "block rounded-2xl border bg-surface p-4 transition hover:shadow-md";
  return mode === "admin"
    ? <Link to="/admin/portfolio" className={cls}>{body}</Link>
    : <Link to="/investor/parcels/$parcelId" params={{ parcelId: p.parcel_id }} className={cls}>{body}</Link>;
}

function SidePanel({ panel, mode, onClose, onAsk }: { panel: NonNullable<Panel>; mode: Mode; onClose: () => void; onAsk: (q: string) => void }) {
  const { parcels, inquiries } = usePortfolio();
  const title = panel.kind === "map" ? `الخريطة · ${panel.command.label}` : panel.kind === "nego" ? "تقرير هامش التفاوض" : panel.ui.title;
  const visible = useMemo(() => parcels.filter((p) => isAvailable(p) || (panel.kind === "map" && panel.command.parcelIds.includes(p.parcel_id))), [parcels, panel]);
  return (
    <aside className="sarj-print m-3 flex w-[min(620px,50vw)] shrink-0 flex-col overflow-hidden rounded-3xl border bg-surface shadow-xl">
      <header className="flex items-center justify-between gap-2 px-6 pt-5 pb-3">
        <h2 className="truncate text-xl font-bold">{title}</h2>
        <div className="flex items-center gap-1 print:hidden">
          {panel.kind !== "map" && <button aria-label="طباعة أو حفظ PDF" onClick={() => window.print()} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm hover:bg-secondary"><Printer className="size-4" />PDF</button>}
          <button aria-label="إغلاق" onClick={onClose} className="grid size-8 place-items-center rounded-lg hover:bg-secondary"><X className="size-4" /></button>
        </div>
      </header>
      {panel.kind === "map" ? (
        <>
          <div className="relative min-h-0 flex-1 border-t">
            <ClientOnly fallback={<div className="grid h-full place-items-center text-sm text-muted-foreground">يحمّل الخريطة…</div>}>
              <Suspense fallback={<div className="grid h-full place-items-center text-sm text-muted-foreground">يحمّل الخريطة…</div>}>
                <ChatMap command={panel.command} parcels={visible} inquiries={mode === "admin" ? inquiries : undefined} onPick={(id) => onAsk(mode === "admin" ? `من المشترين يناسبه ${id}؟` : `حدّثني عن ${id}`)} />
              </Suspense>
            </ClientOnly>
          </div>
          <div className="flex flex-wrap gap-2 border-t px-4 py-3 text-sm">
            {["قرّب على حي الملقا", "أرني كل الشمال", "اعرض الرياض كاملة"].map((q) => <button key={q} onClick={() => onAsk(q)} className="rounded-full border px-3 py-1.5 hover:bg-secondary">{q}</button>)}
          </div>
        </>
      ) : panel.kind === "nego" ? <NegoBody ui={panel.ui} mode={mode} /> : <ReportBody ui={panel.ui} />}
    </aside>
  );
}

function ReportBody({ ui }: { ui: Report }) {
  const [tab, setTab] = useState<"sum" | "tables" | "src">("sum");
  const tabs = [["sum", "الملخّص"], ["tables", "الجداول"], ["src", "المصادر"]] as const;
  const sections = tab === "sum" ? ui.sections.filter((s) => !s.table) : tab === "tables" ? ui.sections.filter((s) => s.table) : [];
  return (
    <>
      <div className="mx-6 flex w-fit gap-1 rounded-xl bg-secondary p-1 text-sm print:hidden">
        {tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-lg px-4 py-1.5 ${tab === k ? "bg-primary text-primary-foreground" : ""}`}>{l}</button>)}
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
        {tab === "src" && <p className="text-sm leading-relaxed text-muted-foreground">كل الأرقام محسوبة من سجلّ سرج (لقطة 11 أغسطس 2026) بدوال ثابتة، لا يكتبها النموذج. الوسائط تُعرض فقط للشرائح التي فيها 3 صفقات مغلقة فأكثر.</p>}
        {sections.map((s, i) => (
          <section key={i}>
            <h3 className="font-semibold">{s.heading}</h3>
            <p className="mt-1 text-sm leading-relaxed text-foreground/80">{s.text}</p>
            {s.chart && <div className="mt-3"><ChatChart spec={s.chart} /></div>}
            {s.table && (
              <div className="mt-3 overflow-x-auto rounded-2xl border">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/60 text-xs text-muted-foreground"><tr>{s.table.headers.map((h) => <th key={h} className="p-2.5 text-right">{h}</th>)}</tr></thead>
                  <tbody>{s.table.rows.map((r, j) => <tr key={j} className="border-t">{r.map((c, k) => <td key={k} className="p-2.5 font-mono">{c == null ? "—" : typeof c === "number" ? c.toLocaleString("en-US") : c}</td>)}</tr>)}</tbody>
                </table>
              </div>
            )}
          </section>
        ))}
      </div>
    </>
  );
}

function NegoBody({ ui, mode }: { ui: Nego; mode: Mode }) {
  const { parcels } = usePortfolio();
  const rows = ui.parcelIds.map((id) => parcels.find((p) => p.parcel_id === id)).filter(Boolean) as Parcel[];
  const max = Math.max(...rows.map((p) => ui.multipliers[p.parcel_id] ?? 0), 1);
  return (
    <div className="flex-1 overflow-y-auto px-6 py-5">
      <div className="mb-5 flex items-center gap-6 rounded-2xl border p-4">
        <div className="border-l pl-6"><div className="text-xs text-muted-foreground">المواقع المحلّلة</div><div className="font-mono text-3xl font-bold">{ui.funnel.analyzed}</div></div>
        <div className="flex flex-wrap gap-4 text-sm"><span>داخل الميزانية <b className="font-mono">{ui.funnel.in_budget}</b></span><span className="text-primary">مرشّحة <b className="font-mono">{ui.funnel.recommended}</b></span></div>
      </div>
      <div className="overflow-hidden rounded-2xl border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs text-muted-foreground"><tr><th className="p-3 text-right">الأرض</th><th className="p-3 text-right">مدة العرض</th><th className="p-3 text-right">السعر</th><th className="p-3 text-right">تجاوز وسيط الإغلاق</th></tr></thead>
          <tbody>
            {rows.map((p) => { const m = ui.multipliers[p.parcel_id] ?? 0; return (
              <tr key={p.parcel_id} className="border-t">
                <td className="p-3"><div className="font-semibold">{p.district_ar}</div><div className="font-mono text-xs text-muted-foreground">{p.parcel_id}</div></td>
                <td className="p-3 font-mono">{p.days_on_market} يومًا</td>
                <td className="p-3 font-mono">{p.total_price_sar?.toLocaleString("en-US") ?? "—"}</td>
                <td className="p-3"><div className="flex items-center gap-2"><b className="font-mono">×{m}</b><span className="h-1.5 w-20 rounded-full bg-secondary"><span className="block h-full rounded-full bg-primary" style={{ width: `${(m / max) * 100}%` }} /></span></div></td>
              </tr>
            ); })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">المضاعف = أيام العرض ÷ وسيط أيام الإغلاق في الشريحة نفسها{mode === "admin" ? "" : "، من الصفقات المغلقة في سجلّ سرج وحده"}.</p>
    </div>
  );
}
