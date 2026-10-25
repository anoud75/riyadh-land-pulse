import { useMemo, useState } from "react";
import { ChatChart } from "@/components/chat/ChatChart";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Send } from "lucide-react";
import { askSarjAgent } from "@/lib/sarjAgent.functions";
import { usePortfolio } from "@/context/PortfolioProvider";
import { initialInquiries, initialParcels } from "@/data";
import { ADMIN_SCENARIOS, INVESTOR_SCENARIOS, type ChatMsg } from "@/data/chatScenarios";
import type { UiPayload } from "@/lib/agentUi";
import type { Parcel } from "@/data/types";

const AREA_AR: Record<string, string> = { North: "شمال", South: "جنوب", East: "شرق", West: "غرب", Central: "وسط" };

export function AgentChat({ mode }: { mode: "investor" | "admin" }) {
  const { parcels, inquiries } = usePortfolio();
  const scenarios = mode === "investor" ? INVESTOR_SCENARIOS : ADMIN_SCENARIOS;
  const preloaded = useMemo(() => scenarios.map((s) => ({ id: s.id, title: s.title, msgs: s.build(parcels, mode === "admin" ? inquiries : []) })), [scenarios, parcels, inquiries, mode]);
  const [live, setLive] = useState<{ id: string; title: string; msgs: ChatMsg[] }[]>([]);
  const all = [...live, ...preloaded];
  const [activeId, setActiveId] = useState<string>(preloaded[0]?.id ?? "");
  const active = all.find((c) => c.id === activeId);
  const ask = useServerFn(askSarjAgent);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");

  const newChat = () => {
    const id = `live-${Date.now()}`;
    setLive((l) => [{ id, title: "محادثة جديدة", msgs: [] }, ...l]);
    setActiveId(id);
  };

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;
    let id = activeId;
    let base = active?.msgs ?? [];
    if (!active || !id.startsWith("live-")) {
      // continuing a preloaded chat forks it into a live one
      id = `live-${Date.now()}`;
      setLive((l) => [{ id, title: text.slice(0, 40), msgs: base }, ...l]);
      setActiveId(id);
    }
    const next = [...base, { role: "user" as const, text }];
    const put = (msgs: ChatMsg[]) => setLive((l) => l.map((c) => (c.id === id ? { ...c, title: c.title === "محادثة جديدة" ? text.slice(0, 40) : c.title, msgs } : c)));
    setTimeout(() => put(next));
    setInput("");
    setBusy(true);
    const r = await ask({
      data: {
        mode,
        messages: next.map((m) => ({ role: m.role, content: m.text })),
        extraParcels: parcels.filter((p) => !initialParcels.some((x) => x.parcel_id === p.parcel_id)),
        extraInquiries: mode === "admin" ? inquiries.filter((i) => !initialInquiries.some((x) => x.inquiry_id === i.inquiry_id)) : [],
      },
    }).catch(() => null);
    setBusy(false);
    put([...next, { role: "assistant", text: r?.ok ? r.text : (r?.error ?? "تعذّر الوصول إلى الوكيل."), ui: r?.ok ? r.ui : null }]);
  };

  return (
    <div dir="rtl" className="grid h-[75vh] grid-cols-1 overflow-hidden rounded-3xl border bg-surface md:grid-cols-[240px_1fr]">
      <aside className="hidden flex-col border-l md:flex">
        <button onClick={newChat} className="m-3 flex items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-2 text-sm text-primary-foreground"><Plus className="size-4" />محادثة جديدة</button>
        <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
          {all.map((c) => (
            <button key={c.id} onClick={() => setActiveId(c.id)} className={`w-full rounded-xl px-3 py-2 text-right text-sm ${c.id === activeId ? "bg-secondary font-medium" : "hover:bg-secondary/60"}`}>{c.title}</button>
          ))}
        </div>
      </aside>
      <section className="flex min-h-0 flex-col">
        <header className="flex items-center gap-2 border-b px-4 py-3">
          <span className="grid size-7 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">س</span>
          <div className="font-semibold">{mode === "investor" ? "محلّل المواقع" : "مساعد الفريق"}</div>
          <span className="mr-auto text-xs text-muted-foreground">{mode === "investor" ? `يقرأ ${parcels.length} أرضًا — بلا وصول للاستفسارات` : `يقرأ ${parcels.length} أرضًا و${inquiries.length} استفسارًا`}</span>
          <button onClick={newChat} className="rounded-full border px-2.5 py-1 text-xs md:hidden">جديدة</button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
          {active?.msgs.length === 0 && <p className="text-muted-foreground">اسأل أي سؤال عن المحفظة — كل رقم يأتي من أدوات الحساب.</p>}
          {active?.msgs.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="mr-auto w-fit max-w-[85%] rounded-2xl bg-ink px-3.5 py-2 text-ink-foreground">{m.text}</div>
            ) : (
              <div key={i}>
                <p className="whitespace-pre-line leading-relaxed">{m.text}</p>
                {m.ui && <AgentUiBlock ui={m.ui} />}
              </div>
            ),
          )}
          {busy && <div className="text-xs text-muted-foreground">يستدعي أدوات المحفظة…</div>}
        </div>
        <form className="flex gap-2 border-t p-3" onSubmit={(e) => { e.preventDefault(); send(input); }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="اكتب سؤالك…" className="min-w-0 flex-1 rounded-full border bg-background px-4 py-2 outline-none focus:ring-2 focus:ring-ring" />
          <button type="submit" disabled={busy} aria-label="إرسال" className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"><Send className="size-4 -scale-x-100" /></button>
        </form>
      </section>
    </div>
  );
}

export function AgentUiBlock({ ui }: { ui: UiPayload }) {
  const { parcels } = usePortfolio();
  const find = (id: string) => parcels.find((p) => p.parcel_id === id);
  if (ui.kind === "cards")
    return <div className="mt-3 grid gap-2 sm:grid-cols-2">{ui.parcelIds.map((id) => find(id)).filter(Boolean).map((p) => <MiniCard key={p!.parcel_id} p={p!} />)}</div>;
  if (ui.kind === "negotiation_report") {
    const rec = ui.parcelIds.map(find).filter(Boolean) as Parcel[];
    return (
      <div className="mt-3 rounded-2xl border p-3">
        <div className="mb-2 font-semibold">تقرير هامش التفاوض</div>
        <div className="mb-3 flex items-center gap-2 text-xs">
          {[["حُلّلت", ui.funnel.analyzed], ["ضمن الميزانية", ui.funnel.in_budget], ["موصى بها", ui.funnel.recommended]].map(([l, v], i) => (
            <span key={i} className="flex items-center gap-2">{i > 0 && <span className="text-muted-foreground">←</span>}<span className="rounded-full bg-secondary px-2.5 py-1"><b className="font-mono">{v}</b> {l}</span></span>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_200px]">
          <div className="space-y-2">{rec.map((p) => <MiniCard key={p.parcel_id} p={p} badge={`×${ui.multipliers[p.parcel_id] ?? "—"}`} />)}</div>
          <MiniMap highlight={ui.parcelIds} />
        </div>
      </div>
    );
  }
  if (ui.kind === "diagnosis") {
    const d = ui.data;
    const row = (l: string, v: string | number | null) => <div className="flex justify-between gap-3 border-b py-1 last:border-0"><span className="text-muted-foreground">{l}</span><b className="font-mono">{typeof v === "number" ? v.toLocaleString("en-US") : (v ?? "—")}</b></div>;
    return (
      <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs">
        <div className="rounded-2xl border p-3"><div className="mb-1 font-semibold">تجاري {AREA_AR[d.area]} — نفاد</div>{row("أراضٍ متاحة", d.commercial.available_parcels)}{row("مشترون مفتوحون", d.commercial.open_inquiries)}{row("ميزانيات ضائعة (ريال)", d.commercial.buyer_budgets_total_sar)}</div>
        <div className="rounded-2xl border p-3"><div className="mb-1 font-semibold">سكني {AREA_AR[d.area]} — فائض</div>{row("أراضٍ متاحة", d.residential.available_parcels)}{row("استفسارات", d.residential.open_inquiries)}{row("وسيط الإغلاق (يوم)", d.residential.sale_median_closing_days)}{row("التنازل السعري %", d.residential.sale_price_concession_pct)}</div>
      </div>
    );
  }
  if (ui.kind === "chart") return <div className="mt-3"><ChatChart spec={ui.chart} /></div>;
  if (ui.kind !== "excluded") return null;
  return (
    <div className="mt-3 rounded-2xl border p-3 text-xs">
      <div className="mb-1 font-semibold">مستبعدون من المطابقة — لا مخزون</div>
      {ui.rows.map((r) => <div key={r.inquiry_id} className="flex justify-between border-b py-1 last:border-0"><span>{r.name} <span className="font-mono text-muted-foreground">{r.inquiry_id}</span></span><span className="text-muted-foreground">{r.segment} · {r.wait_days} يومًا</span></div>)}
    </div>
  );
}

function MiniCard({ p, badge }: { p: Parcel; badge?: string }) {
  return (
    <Link to="/investor/parcels/$parcelId" params={{ parcelId: p.parcel_id }} className="block rounded-xl border bg-background p-2.5 hover:bg-secondary">
      <div className="flex items-center justify-between"><b>{p.district_ar}</b>{badge && <span className="rounded-full bg-primary px-2 text-xs text-primary-foreground">{badge}</span>}</div>
      <div className="text-xs text-muted-foreground"><span className="font-mono">{p.parcel_id}</span> · {p.area_sqm.toLocaleString("en-US")} م² · شارع {p.street_width_m} م · {p.total_price_sar != null ? `${p.total_price_sar.toLocaleString("en-US")} ريال` : "السعر غير مسجل"}</div>
    </Link>
  );
}

/** Small schematic map of Riyadh parcels with the recommended ones highlighted. */
function MiniMap({ highlight }: { highlight: string[] }) {
  const { parcels } = usePortfolio();
  const lat0 = 24.45, lat1 = 25.05, lng0 = 46.45, lng1 = 47.0;
  const xy = (p: Parcel): [number, number] => [((p.lng - lng0) / (lng1 - lng0)) * 200, ((lat1 - p.lat) / (lat1 - lat0)) * 200];
  return (
    <Link to="/investor/map" className="block rounded-xl border bg-secondary/40" aria-label="افتح الخريطة">
      <svg viewBox="0 0 200 200" className="w-full">
        {parcels.map((p) => { const [x, y] = xy(p); const h = highlight.includes(p.parcel_id); return h ? null : <circle key={p.parcel_id} cx={x} cy={y} r={2} className="fill-muted-foreground/40" />; })}
        {parcels.filter((p) => highlight.includes(p.parcel_id)).map((p) => { const [x, y] = xy(p); return <g key={p.parcel_id}><circle cx={x} cy={y} r={5} className="fill-primary" /><text x={x + 7} y={y + 3} fontSize={8} className="fill-foreground">{p.parcel_id}</text></g>; })}
      </svg>
    </Link>
  );
}
