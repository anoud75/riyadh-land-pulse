import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { usePortfolio } from "@/context/PortfolioProvider";
import { getHeadline } from "@/lib/portfolioEngine";

export const Route = createFileRoute("/investor")({
  head: () => ({
    meta: [
      { title: "محلّل المواقع — سرج" },
      { name: "description", content: "واجهة المستثمر في سرج: الأراضي المتاحة في الرياض." },
      { property: "og:title", content: "محلّل المواقع — سرج" },
      { property: "og:description", content: "تصفّح الأراضي المتاحة." },
    ],
  }),
  component: Page,
});

function Page() {
  const { parcels, inquiries, investorName } = usePortfolio();
  const h = getHeadline(parcels, inquiries);
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="text-4xl font-bold">أهلًا {investorName || "بك"}</h1>
        <p className="mt-3 text-muted-foreground">ما الذي تنوي بناءه؟ واجهة البحث والمحادثة تأتي في الخطوة التالية.</p>
        <div className="mt-8 font-mono text-3xl">{h.available} <span className="font-sans text-base text-muted-foreground">أرضًا متاحة الآن</span></div>
      </main>
    </div>
  );
}
