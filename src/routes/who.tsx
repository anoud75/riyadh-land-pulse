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
    ],
  }),
  component: Page,
});

function Page() {
  const { setRole } = usePortfolio();
  const navigate = useNavigate();
  const card = "group flex flex-col rounded-3xl border bg-card p-8 text-right transition-colors hover:border-primary";
  const arrow = "grid size-12 place-items-center rounded-full bg-secondary group-hover:bg-accent";
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <Link to="/"><Logo /></Link>
        <h1 className="mt-14 text-5xl font-bold">من أنت؟</h1>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Link to="/who/name" className={card}>
            <Map className="size-7 text-primary" />
            <h2 className="mt-8 text-2xl font-bold">باحث عن أرض</h2>
            <p className="mt-4 text-muted-foreground">تصفّح الأراضي، واسأل عمّا يناسب مشروعك.</p>
            <div className="mt-8 flex items-center gap-3 text-sm text-muted-foreground"><span className={arrow}><ArrowLeft className="size-4" /></span>اسمك فقط</div>
          </Link>
          <button className={card} onClick={() => { setRole("admin"); navigate({ to: "/admin" }); }}>
            <LayoutGrid className="size-7 text-muted-foreground" />
            <h2 className="mt-8 text-2xl font-bold">فريق سرج</h2>
            <p className="mt-4 text-muted-foreground">اقرأ الطلب والمعروض، وتابع الاستفسارات.</p>
            <div className="mt-8 flex items-center gap-3 text-sm text-muted-foreground"><span className={arrow}><ArrowLeft className="size-4" /></span>تسجيل دخول</div>
          </button>
        </div>
        <p className="mt-8 text-sm text-muted-foreground">بيانات المشترين لا تغادر لوحة الفريق.</p>
      </div>
    </div>
  );
}
