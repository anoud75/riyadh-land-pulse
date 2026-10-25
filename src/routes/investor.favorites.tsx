import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { usePortfolio } from "@/context/PortfolioProvider";
import { ParcelCard } from "@/components/investor/ParcelCard";

export const Route = createFileRoute("/investor/favorites")({
  head: () => ({
    meta: [
      { title: "المفضلة — سرج" },
      { name: "description", content: "الأراضي التي حفظتها في المفضلة للرجوع إليها ومقارنتها." },
      { property: "og:title", content: "المفضلة — سرج" },
      { property: "og:description", content: "أراضيك المحفوظة في سرج." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Favorites,
});

function Favorites() {
  const { parcels, favoriteIds } = usePortfolio();
  const list = favoriteIds.map((id) => parcels.find((p) => p.parcel_id === id)).filter((p) => p != null);
  return (
    <div>
      <h1 className="text-3xl font-bold">المفضلة</h1>
      <p className="mt-2 text-muted-foreground">الأراضي التي ضغطت على ♡ فيها. أضفها للمقارنة من البطاقة.</p>
      {list.length === 0 ? (
        <div className="mt-8 rounded-2xl border bg-card p-10 text-center text-muted-foreground">
          <Heart className="mx-auto mb-3 size-8" />
          لا توجد أراضٍ في المفضلة بعد. اضغط على القلب في أي بطاقة أرض لحفظها.
          <div className="mt-4"><Link to="/investor" className="text-primary underline">تصفّح الأراضي</Link></div>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => <ParcelCard key={p.parcel_id} p={p} />)}
        </div>
      )}
    </div>
  );
}
