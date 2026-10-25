import { useState, type ReactNode } from "react";

/** Shared frame for every team chart: title, how-to-read line, legend, filters, source. */
export function ChartCard({ title, howTo, legend, filters, source, children, aside }: {
  title: string; howTo: string; legend?: { label: string; className: string; shape?: "dot" | "bar" | "line" | "ring" }[];
  filters?: ReactNode; source?: string; children: ReactNode; aside?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{howTo}</p>
        </div>
        {aside}
      </div>
      {filters && <div className="mt-4 flex flex-wrap gap-2">{filters}</div>}
      {legend && (
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
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
    <button type="button" onClick={onClick} className={`rounded-full border px-3 py-1 text-xs transition ${on ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-secondary"}`}>{children}</button>
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

export interface Tip { x: number; y: number; body: ReactNode }
/** Hover tooltip positioned in % of the chart box. */
export function useTip() {
  const [tip, setTip] = useState<Tip | null>(null);
  const layer = tip && (
    <div className="pointer-events-none absolute z-10 w-max max-w-[16rem] -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-xl border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg" style={{ left: `${tip.x}%`, top: `${tip.y}%` }}>
      {tip.body}
    </div>
  );
  return { tip, setTip, layer };
}
