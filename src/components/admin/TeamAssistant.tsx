import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Minus, Send, Sparkles } from "lucide-react";
import { askSarjAgent } from "@/lib/sarjAgent.functions";
import { usePortfolio } from "@/context/PortfolioProvider";
import { initialInquiries, initialParcels } from "@/data";
import { AgentUiBlock } from "@/components/AgentChat";
import type { UiPayload } from "@/lib/agentUi";

interface Msg { role: "user" | "assistant"; text: string; ui?: UiPayload | null }
const SUGGEST = ["أين العجز والفائض؟", "من ينتظر ردًا ولدينا له أرض؟", "تقرير رأس المال الراكد", "شخّص الشمال", "من نستبعد من المطابقة؟"];

export function TeamAssistant({ inline = false }: { inline?: boolean }) {
  const { parcels, inquiries } = usePortfolio();
  const ask = useServerFn(askSarjAgent);
  const [open, setOpen] = useState(inline);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;
    const next = [...msgs, { role: "user" as const, text }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    const r = await ask({
      data: {
        mode: "admin",
        messages: next.map((m) => ({ role: m.role, content: m.text })),
        extraParcels: parcels.filter((p) => !initialParcels.some((x) => x.parcel_id === p.parcel_id)),
        extraInquiries: inquiries.filter((i) => !initialInquiries.some((x) => x.inquiry_id === i.inquiry_id)),
      },
    }).catch(() => null);
    setBusy(false);
    setMsgs((m) => [...m, { role: "assistant", text: r?.ok ? r.text : (r?.error ?? "تعذّر الوصول إلى الوكيل."), ui: r?.ok ? r.ui : null }]);
  };

  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="fixed bottom-5 left-5 z-50 flex items-center gap-2 rounded-full bg-ink px-4 py-3 text-sm text-ink-foreground shadow-lg">
        <Sparkles className="size-4" />مساعد الفريق
      </button>
    );
  return (
    <section dir="rtl" className={inline ? "flex h-[70vh] w-full flex-col rounded-3xl border bg-surface" : "fixed bottom-5 left-5 z-50 flex h-[min(560px,75vh)] w-[min(380px,90vw)] flex-col rounded-3xl border bg-surface shadow-xl"} aria-label="مساعد الفريق">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div><div className="text-xs text-muted-foreground">يرى الأراضي والاستفسارات</div><div className="font-semibold">مساعد الفريق</div></div>
        {!inline && <button aria-label="تصغير" onClick={() => setOpen(false)} className="grid size-7 place-items-center rounded-full bg-secondary"><Minus className="size-4" /></button>}
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
        {msgs.length === 0 && (
          <div className="flex flex-wrap gap-1.5">
            {SUGGEST.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border px-3 py-1 text-xs hover:bg-secondary">{s}</button>)}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "mr-auto w-fit max-w-[85%] rounded-2xl bg-secondary px-3 py-2" : "whitespace-pre-line leading-relaxed"}>{m.text}{m.ui && <AgentUiBlock ui={m.ui} />}</div>
        ))}
        {busy && <div className="text-xs text-muted-foreground">يستدعي أدوات المحفظة…</div>}
      </div>
      <form className="flex gap-2 border-t p-3" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="اسأل عن الفجوات أو الاستفسارات…" className="min-w-0 flex-1 rounded-full border bg-background px-4 py-2 outline-none" />
        <button type="submit" aria-label="إرسال" className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground"><Send className="size-4 -scale-x-100" /></button>
      </form>
    </section>
  );
}
