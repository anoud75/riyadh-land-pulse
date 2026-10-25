import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { GitCompare, Map, MessageSquare, Search, Send, LandPlot, Menu, Bookmark, UserRound } from "lucide-react";
import { Logo } from "@/components/SiteHeader";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { usePortfolio } from "@/context/PortfolioProvider";
import { isAvailable } from "@/lib/portfolioEngine";

export const Route = createFileRoute("/investor")({
  head: () => ({
    meta: [
      { title: "واجهة المستثمر — سرج" },
      { name: "description", content: "تصفّح أراضي سرج المتاحة في الرياض وقارن بينها واستفسر عنها." },
      { property: "og:title", content: "واجهة المستثمر — سرج" },
      { property: "og:description", content: "الأراضي، المقارنة، والاستفسارات." },
    ],
  }),
  component: Layout,
});

export const SAVED_SEARCHES = [
  { label: "مستودعات شرق الرياض", search: { area: "East", land: "commercial", sort: "street" } },
  { label: "تجاري شمال الرياض", search: { area: "North", land: "commercial" } },
  { label: "شارع 40 مترًا فأكثر", search: { street: 40, sort: "street" } },
] as const;

function Layout() {
  const { parcels, compareIds, myInquiries, investorName } = usePortfolio();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const item = "flex items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-secondary";
  const active = { className: "bg-secondary font-medium" };
  const badge = (n: number) => <span className="rounded-full bg-background px-2 font-mono text-xs">{n}</span>;
  const nav = (
    <>
      <Link to="/" className="mx-auto block w-[58%]"><Logo className="h-auto w-full" /></Link>
      <label className="mt-5 flex items-center gap-2 rounded-xl border bg-surface px-3 py-2 text-sm text-muted-foreground">
        <Search className="size-4" /><input placeholder="ابحث" className="w-full bg-transparent outline-none" />
      </label>
      <nav className="mt-6 space-y-1">
        <Link to="/investor" activeOptions={{ exact: true, includeSearch: false }} activeProps={active} className={item}>
          <span className="flex items-center gap-2"><LandPlot className="size-4" />الأراضي</span>{badge(parcels.filter(isAvailable).length)}
        </Link>
        <Link to="/investor/chats" activeProps={active} className={item}>
          <span className="flex items-center gap-2"><MessageSquare className="size-4" />محادثاتي</span>{badge(5)}
        </Link>
        <Link to="/investor/map" activeProps={active} className={item}>
          <span className="flex items-center gap-2"><Map className="size-4" />الخريطة</span>
        </Link>
        <Link to="/investor/compare" activeProps={active} className={item}>
          <span className="flex items-center gap-2"><GitCompare className="size-4" />المقارنة</span>{badge(compareIds.length)}
        </Link>
        <Link to="/investor/inquiries" activeProps={active} className={item}>
          <span className="flex items-center gap-2"><Send className="size-4" />استفساراتي</span>{badge(myInquiries.length)}
        </Link>
      </nav>
      <div className="mt-8 text-xs text-muted-foreground">بحوث محفوظة</div>
      <div className="mt-2 space-y-1">
        {SAVED_SEARCHES.map((s) => (
          <Link key={s.label} to="/investor" search={s.search} className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
            <Bookmark className="size-3.5" />{s.label}
          </Link>
        ))}
      </div>
      <div className="mt-auto flex items-center gap-3 border-t pt-4">
        <span className="grid size-9 place-items-center rounded-full bg-accent text-accent-foreground"><UserRound className="size-4.5" /></span>
        <div className="text-sm"><div>{investorName || "ضيف"}</div><div className="text-xs text-muted-foreground">مستثمر</div></div>
      </div>
    </>
  );
  if (pathname === "/investor/map" || pathname === "/investor/chats") return <Outlet />;
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-l bg-surface p-4 md:flex">{nav}</aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b bg-surface px-6 py-3">
          <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="القائمة"><Menu className="size-5" /></button>
          <div className="text-xs text-muted-foreground">{parcels.length} أرضًا في المحفظة · لقطة البيانات 11 أغسطس 2026</div>
          <ViewSwitcher />
        </header>
        {open && <div className="flex flex-col border-b bg-surface p-4 md:hidden" onClick={() => setOpen(false)}>{nav}</div>}
        <main className="mx-auto max-w-6xl px-6 py-10"><Outlet /></main>
      </div>
    </div>
  );
}
