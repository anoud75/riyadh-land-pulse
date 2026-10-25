import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/SiteHeader";
import { usePortfolio } from "@/context/PortfolioProvider";

export const Route = createFileRoute("/who_/name")({
  head: () => ({
    meta: [
      { title: "ما اسمك؟ — سرج" },
      { name: "description", content: "ادخل إلى منصة سرج باسمك فقط." },
      { property: "og:title", content: "ما اسمك؟ — سرج" },
      { property: "og:description", content: "الدخول باسمك فقط." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const { setRole, setInvestorName } = usePortfolio();
  const navigate = useNavigate();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setInvestorName(`${first} ${last}`.trim());
    setRole("investor");
    navigate({ to: "/investor" });
  };
  const field = "w-full rounded-xl border bg-surface px-4 py-3 outline-none focus:border-primary";
  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <Link to="/who" className="text-sm text-muted-foreground hover:text-foreground">‹ عودة إلى اختيار المسار</Link>
      <div className="mt-10"><Logo className="h-10" /></div>
      <h1 className="mt-10 text-4xl font-bold">ما اسمك؟</h1>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-2 text-sm">الاسم الأول<input required autoFocus value={first} onChange={(e) => setFirst(e.target.value)} className={field} /></label>
          <label className="space-y-2 text-sm">اسم العائلة<input value={last} onChange={(e) => setLast(e.target.value)} className={field} /></label>
        </div>
        <button className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground">
          ادخل إلى المنصة <ArrowLeft className="size-4" />
        </button>
      </form>
    </div>
  );
}
