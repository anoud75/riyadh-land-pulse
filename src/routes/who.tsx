import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LayoutGrid, Map } from "lucide-react";
import { Logo } from "@/components/SiteHeader";
import { usePortfolio } from "@/context/PortfolioProvider";

export const Route = createFileRoute("/who")({
  head: () => ({
    meta: [
      { title: "من أنت؟ — سرج" },
      { name: "description", content: "اختر مسارك في منصة سرج: باحث عن أرض أو فريق سرج." },
      { property: "og:title", content: "من أنت؟ — سرج" },
      { property: "og:description", content: "باحث عن أرض أو فريق سرج." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const { setRole } = usePortfolio();
  const navigate = useNavigate();
  const card = "group flex flex-col rounded-[2rem] border bg-card p-7 text-right shadow-sm transition-all hover:-translate-y-1 hover:border-foreground/30 hover:shadow-md";
  const icon = "grid size-12 place-items-center rounded-2xl bg-secondary text-foreground";
  const btn = "mt-7 flex items-center justify-between rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background";
  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-8">
        <Link to="/" className="self-center"><Logo /></Link>
        <div className="my-auto py-10">
          <h1 className="text-center text-5xl font-bold">من أنت؟</h1>
          <p className="mt-3 text-center text-muted-foreground">اختر مسارك لنعرض لك ما يهمّك.</p>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <Link to="/who/name" className={card}>
              <span className={icon}><Map className="size-6" /></span>
              <h2 className="mt-6 text-2xl font-bold">باحث عن أرض</h2>
              <p className="mt-2 text-muted-foreground">تصفّح الأراضي، واسأل عمّا يناسب مشروعك.</p>
              <span className={btn}>ادخل كمستثمر<ArrowLeft className="size-4" /></span>
            </Link>
            <button className={card} onClick={() => { setRole("admin"); navigate({ to: "/admin" }); }}>
              <span className={icon}><LayoutGrid className="size-6" /></span>
              <h2 className="mt-6 text-2xl font-bold">فريق سرج</h2>
              <p className="mt-2 text-muted-foreground">اقرأ الطلب والمعروض، وتابع الاستفسارات.</p>
              <span className={btn}>ادخل كفريق<ArrowLeft className="size-4" /></span>
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground">بيانات المشترين لا تغادر لوحة الفريق.</p>
      </div>
    </div>
  );
}
