import { useState, type ReactNode, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

/** Shared frame for every team chart: title, how-to-read line, legend, filters, source. */
export function ChartCard({ title, howTo, legend, filters, source, children, aside }: {
  title: string; howTo: string; legend?: { label: string; className: string; shape?: "dot" | "bar" | "line" | "ring" }[];
  filters?: ReactNode; source?: string; children: ReactNode; aside?: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">{howTo}</p>
        </div>
        {aside}
      </div>
      {filters && <div className="mt-4 flex flex-wrap gap-2">{filters}</div>}
      {legend && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
          {legend.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span className={`${l.shape === "bar" ? "h-2.5 w-4 rounded-sm" : l.shape === "line" ? "h-0.5 w-5" : l.shape === "ring" ? "size-3 rounded-full border-2 border-dashed bg-transparent" : "size-2.5 rounded-full"} ${l.className}`} />
              {l.label}
            </span>
          ))}
        </div>
      )}
      <div className="mt-4">{children}</div>
      {source && <p className="mt-3 border-t pt-3 text-[11px] text-muted-foreground">المصدر: {source}</p>}
    </section>
  );
}

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Button type="button" size="sm" variant={on ? "default" : "outline"} onClick={onClick} aria-pressed={on} className="h-7 rounded-md px-2.5 shadow-none">{children}</Button>
  );
}

/** Chip group with an "all" option. */
export function ChipGroup<T extends string>({ value, onChange, options, allLabel = "الكل" }: { value: T | "all"; onChange: (v: T | "all") => void; options: [T, string][]; allLabel?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Chip on={value === "all"} onClick={() => onChange("all")}>{allLabel}</Chip>
      {options.map(([k, l]) => <Chip key={k} on={value === k} onClick={() => onChange(k)}>{l}</Chip>)}
    </div>
  );
}

export interface Tip { x: number; y: number; body: ReactNode; fixed?: boolean }
/** Hover tooltip positioned in % of the chart box. */
export function useTip() {
  const [tip, setTip] = useState<Tip | null>(null);
  const content = tip && (
    <div role="tooltip" dir="rtl" className={`pointer-events-none z-50 w-max max-w-[min(16rem,calc(100vw-24px))] rounded-lg border bg-popover px-3 py-2 text-xs leading-6 text-popover-foreground shadow-lg ${tip.fixed ? "fixed" : "absolute -translate-x-1/2 -translate-y-[calc(100%+10px)]"}`} style={{ left: tip.fixed ? tip.x : `${Math.max(20, Math.min(80, tip.x))}%`, top: tip.fixed ? tip.y : `${Math.max(15, tip.y)}%` }}>
      {tip.body}
    </div>
  );
  const show = (event: SyntheticEvent<Element>, body: ReactNode) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTip({ x: Math.max(12, Math.min(window.innerWidth - 268, rect.left + rect.width / 2)), y: Math.max(12, Math.min(window.innerHeight - 150, rect.bottom + 8)), body, fixed: true });
  };
  const layer = tip?.fixed && typeof document !== "undefined" ? createPortal(content, document.body) : content;
  return { tip, setTip, show, layer };
}
