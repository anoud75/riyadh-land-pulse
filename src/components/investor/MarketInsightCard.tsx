import { TrendingUp } from "lucide-react";
import type { MarketInsight } from "@/lib/marketEngine";

export function MarketInsightCard({ insight }: { insight: MarketInsight }) {
  if (!insight.applicable) return null;
  const b = insight.benchmark;
  return (
    <section className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <span className="grid size-8 place-items-center rounded-full bg-primary/15"><TrendingUp className="size-4" /></span>
        مؤشر السوق الخارجي
      </div>
      <p className="mt-3 text-sm leading-7">{insight.text.replace(/^مؤشر السوق الخارجي:\s*/, "")}</p>
      {b.count > 0 && (
        <ul className="mt-4 space-y-1.5 text-xs">
          {b.comparables.map((c) => (
            <li key={c.id} className="flex justify-between gap-3 rounded-lg bg-secondary/60 px-3 py-2">
              <a href={c.url} target="_blank" rel="noreferrer" className="truncate hover:text-primary">حي {c.district} · {c.area} م²</a>
              <span className="font-mono">{c.price.toLocaleString("en-US")} ريال</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 text-[11px] text-muted-foreground">عدد الإعلانات في العينة: {b.count}{b.scope === "area" ? " · من أحياء مجاورة" : ""} · {b.source}</div>
    </section>
  );
}
