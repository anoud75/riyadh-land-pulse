import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { BarChart3, Bot, Briefcase, Inbox, Menu, PlusSquare, Send, Sun, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/SiteHeader";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { usePortfolio } from "@/context/PortfolioProvider";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "لوحة الفريق — سرج" },
      { name: "description", content: "لوحة فريق سرج: أولويات اليوم، المحفظة، الاستفسارات والأداء." },
      { property: "og:title", content: "لوحة الفريق — سرج" },
      { property: "og:description", content: "أولويات اليوم والمحفظة والاستفسارات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Layout,
});

function Layout() {
  const { parcels, inquiries } = usePortfolio();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const unanswered = inquiries.filter((i) => i.status === "new").length;
  const item = "flex items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-secondary";
  const active = { className: "bg-secondary font-medium" };
  const badge = (t: string | number) => <span className="rounded-full bg-background px-2 font-mono text-xs">{t}</span>;
  const nav = (
    <>
      <Link to="/" className="mx-auto block w-[46%]"><Logo className="h-auto w-full" /></Link>
      <nav className="mt-6 space-y-1">
        <Link to="/admin" activeOptions={{ exact: true }} activeProps={active} className={item}><span className="flex items-center gap-2"><Sun className="size-4" />اليوم</span></Link>
        <Link to="/admin/assistant" activeProps={active} className={item}><span className="flex items-center gap-2"><Bot className="size-4" />المساعد</span></Link>
        <Link to="/admin/portfolio" activeProps={active} className={item}><span className="flex items-center gap-2"><Briefcase className="size-4" />المحفظة</span>{badge(parcels.length)}</Link>
        <Link to="/admin/add" activeProps={active} className={item}><span className="flex items-center gap-2"><PlusSquare className="size-4" />أضف أرضاً</span></Link>
        <Link to="/admin/inquiries" activeProps={active} className={item}><span className="flex items-center gap-2"><Inbox className="size-4" />الاستفسارات</span><span className="rounded-full bg-destructive/10 px-2 text-xs text-destructive">{unanswered} بلا رد</span></Link>
        <Link to="/admin/offer" activeProps={active} className={item}><span className="flex items-center gap-2"><Send className="size-4" />اعرض أرضاً</span></Link>
        <Link to="/admin/performance" activeProps={active} className={item}><span className="flex items-center gap-2"><BarChart3 className="size-4" />الأداء</span></Link>
      </nav>
      <div className="mt-auto flex items-center gap-3 border-t pt-4">
        <span className="grid size-9 place-items-center rounded-full bg-secondary text-muted-foreground"><Users className="size-4" /></span>
        <div className="text-sm"><div>فريق سرج</div><div className="text-xs text-muted-foreground">إدارة المحفظة</div></div>
      </div>
    </>
  );
  if (pathname === "/admin/assistant") return <Outlet />;
  return (
    <div className="team-workspace flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-l bg-surface p-4 md:flex">{nav}</aside>
      <div className="min-w-0 flex-1">
        <header className="flex min-h-14 flex-wrap items-center justify-between gap-2 border-b bg-surface px-4 py-2 lg:px-6">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(!open)} aria-label="القائمة" aria-expanded={open}><Menu className="size-5" /></Button>
          <div className="text-xs text-muted-foreground">تحديث 11 أغسطس 2026</div>
          <ViewSwitcher />
        </header>
        {open && <div className="flex flex-col border-b bg-surface p-4 md:hidden" onClick={() => setOpen(false)}>{nav}</div>}
        <main className="mx-auto max-w-[1440px] px-4 py-5 lg:px-6"><Outlet /></main>
      </div>

    </div>
  );
}
