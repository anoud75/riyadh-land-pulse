import { createFileRoute, Link } from "@tanstack/react-router";
import prd from "../../PRD.md?raw";

export const Route = createFileRoute("/prd")({
  head: () => ({
    meta: [
      { title: "Sarj PRD v2.0 — Product Requirements" },
      { name: "description", content: "Audited product requirements for the Sarj Riyadh land intelligence platform." },
      { property: "og:title", content: "Sarj PRD v2.0" },
      { property: "og:description", content: "Audited product requirements for the Sarj land intelligence platform." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrdPage,
});

function inline(t: string) {
  return t.split(/(`[^`]+`)/).map((s, i) =>
    s.startsWith("`") ? <code key={i} className="rounded bg-muted px-1 text-[0.9em]">{s.slice(1, -1)}</code> : s,
  );
}

function PrdPage() {
  const lines = prd.split("\n");
  return (
    <div dir="ltr" className="min-h-screen bg-background text-foreground">
      <header className="bg-foreground px-8 py-6 text-background print:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <span className="text-lg font-semibold tracking-wide">SARJ · PRD v2.0</span>
          <div className="flex gap-3 print:hidden">
            <Link to="/" className="text-sm opacity-80 hover:opacity-100">Home</Link>
            <button onClick={() => window.print()} className="rounded bg-background px-3 py-1 text-sm text-foreground">Download PDF</button>
          </div>
        </div>
      </header>
      <article className="mx-auto max-w-3xl space-y-3 px-8 py-10 leading-relaxed">
        {lines.map((l, i) => {
          if (l.startsWith("# ")) return <h1 key={i} className="text-3xl font-bold">{l.slice(2)}</h1>;
          if (l.startsWith("## ")) return <h2 key={i} className="pt-6 text-xl font-semibold">{l.slice(3)}</h2>;
          if (l.startsWith("- ")) return <li key={i} className="ml-5 list-disc">{inline(l.slice(2))}</li>;
          if (!l.trim()) return null;
          return <p key={i} className="text-muted-foreground">{inline(l)}</p>;
        })}
      </article>
    </div>
  );
}
