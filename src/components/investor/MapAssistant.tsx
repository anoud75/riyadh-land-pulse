import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Send } from "lucide-react";
import type { Parcel } from "@/data/types";
import { answerQuery } from "@/lib/assistant";
import { EMPTY_FILTERS, type MapFilters } from "@/lib/mapStats";
import { getParcelInsight } from "@/lib/investorEngine";
import { usePortfolio } from "@/context/PortfolioProvider";
import { useServerFn } from "@tanstack/react-start";
import { askSarjAgent } from "@/lib/sarjAgent.functions";
import { initialParcels } from "@/data";
import { pct, sar } from "./format";
import { PriceLine } from "./ParcelCard";
import { AgentUiBlock } from "@/components/AgentChat";
import type { UiPayload } from "@/lib/agentUi";

interface Msg {
  id: number;
  role: "user" | "assistant";
  text: string;
  top?: string | null;
  chips?: string[];
  more?: string[];
  ui?: UiPayload | null;
}

const GREETING =
  "اسأليني عن أي أرض — مثلًا: «أبغى أرض تجارية كبيرة شرق الرياض، يهمني دخول الشاحنات». أرشّح من 120 أرضًا وأصفّي الخريطة مباشرة.";

export function MapAssistant({
  parcels,
  onApplyFilters,
  onFocusParcel,
}: {
  parcels: Parcel[];
  onApplyFilters: (f: MapFilters) => void;
  onFocusParcel: (p: Parcel) => void;
}) {
  const { toggleCompare } = usePortfolio();
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 0, role: "assistant", text: GREETING }]);
  const [input, setInput] = useState("");
  const filtersRef = useRef<MapFilters>(EMPTY_FILTERS);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const [busy, setBusy] = useState(false);
  const ask = useServerFn(askSarjAgent);
  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;
    const history = msgs.filter((m) => m.id > 0).map((m) => ({ role: m.role, content: m.text }));
    setMsgs((m) => [...m, { id: m.length, role: "user", text }]);
    setInput("");
    setBusy(true);
    const extra = parcels.filter((p) => !initialParcels.some((x) => x.parcel_id === p.parcel_id));
    const r = await ask({ data: { mode: "investor", messages: [...history, { role: "user", content: text }], extraParcels: extra } }).catch(() => null);
    setBusy(false);
    if (r?.ok) {
      const f: MapFilters = r.filters
        ? { ...EMPTY_FILTERS, area: r.filters.area as MapFilters["area"], landType: r.filters.landType as MapFilters["landType"], dealType: r.filters.dealType as MapFilters["dealType"], minStreet: r.filters.minStreet, maxBudget: r.filters.maxBudget }
        : filtersRef.current;
      filtersRef.current = f;
      const ids = r.parcelIds;
      setMsgs((m) => [...m, { id: m.length, role: "assistant", text: r.text, top: ids[0] ?? null, more: ids.slice(1, 4), chips: ["أضفها للمقارنة"], ui: r.ui?.kind === "negotiation_report" ? r.ui : null }]);
      if (r.filters) onApplyFilters(f);
      const top = parcels.find((p) => p.parcel_id === ids[0]);
      if (top) onFocusParcel(top);
      return;
    }
    // fallback: deterministic rule-based analyst
    const answer = answerQuery(parcels, text, filtersRef.current);
    filtersRef.current = answer.filters;
    setMsgs((m) => [
      ...m,
      { id: m.length, role: "assistant", text: `${r && !r.ok ? r.error : "تعذّر الوصول إلى الوكيل."} أجبتُ بالمحلل الثابت:\n${answer.text}`, top: answer.top?.parcel_id ?? null, chips: answer.chips },
    ]);
    onApplyFilters(answer.filters);
    if (answer.top) onFocusParcel(answer.top);
  };

  const chip = (c: string, topId: string | null | undefined) => {
    if (c === "أضفها للمقارنة" && topId) toggleCompare(topId);
    else send(c);
  };

  return (
    <section className="flex h-full flex-col rounded-3xl border bg-surface shadow-lg" aria-label="المساعد">
      <header className="border-b px-4 py-3">
        <div className="text-xs text-muted-foreground">المساعد</div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">س</span>
          <span className="font-semibold">محلّل المواقع</span>
          <span className="mr-auto flex items-center gap-1 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            يقرأ {parcels.length} أرضًا
          </span>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {msgs.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="mr-auto w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-secondary px-3.5 py-2 text-sm">
              {m.text}
            </div>
          ) : (
            <div key={m.id} className="flex gap-2">
              <span className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">س</span>
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-line text-sm leading-relaxed">{m.text}</p>
                {m.ui && <AgentUiBlock ui={m.ui} />}
                {!m.ui && m.top && <AssistantParcelCard id={m.top} onOpen={onFocusParcel} />}
                {m.more?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.more.map((id) => {
                      const p = parcels.find((x) => x.parcel_id === id);
                      return p ? <button key={id} onClick={() => onFocusParcel(p)} className="rounded-full bg-secondary px-2.5 py-1 text-xs hover:bg-accent">{p.district_ar} · {id}</button> : null;
                    })}
                  </div>
                ) : null}
                {m.chips?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.chips.map((c) => (
                      <button
                        key={c}
                        onClick={() => chip(c, m.top)}
                        className="rounded-full border px-3 py-1 text-xs hover:bg-secondary"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ),
        )}
        {busy && <div className="text-xs text-muted-foreground">يستدعي أدوات المحفظة…</div>}
      </div>

      <form
        className="flex items-center gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="اكتب ما تنوي بناءه…"
          className="min-w-0 flex-1 rounded-full border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          aria-label="إرسال"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"
        >
          <Send className="size-4 -scale-x-100" />
        </button>
      </form>
    </section>
  );
}

function AssistantParcelCard({ id, onOpen }: { id: string; onOpen: (p: Parcel) => void }) {
  const { parcels } = usePortfolio();
  const ins = getParcelInsight(parcels, id);
  if (!ins) return null;
  const p = ins.parcel;
  return (
    <div className="mt-2 rounded-2xl border p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold">{p.district_ar}</div>
          <div className="text-xs text-muted-foreground">
            <span className="font-mono">{p.parcel_id}</span> · {sar(p.area_sqm)} م² · شارع {p.street_width_m} م
          </div>
        </div>
        <PriceLine p={p} />
      </div>
      {ins.priceDeltaPct != null && (
        <p className="mt-2 text-xs text-muted-foreground">
          سعر المتر {pct(ins.priceDeltaPct)} عن وسيط الشريحة
          {ins.segment.medianClosingDays != null && ` · ${p.days_on_market} يومًا مقابل وسيط إغلاق ${ins.segment.medianClosingDays}`}
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <button onClick={() => onOpen(p)} className="rounded-full bg-secondary px-3 py-1 text-xs hover:bg-accent">
          يفتح سجل الأرض {p.parcel_id}
        </button>
        <Link
          to="/investor/parcels/$parcelId"
          params={{ parcelId: p.parcel_id }}
          className="rounded-full border px-3 py-1 text-xs hover:bg-secondary"
        >
          صفحة الأرض
        </Link>
      </div>
    </div>
  );
}
