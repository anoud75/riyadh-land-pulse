import { createFileRoute, Link } from "@tanstack/react-router";
import { usePortfolio } from "@/context/PortfolioProvider";
import { isAvailable } from "@/lib/portfolioEngine";

export const Route = createFileRoute("/investor/map")({
  head: () => ({
    meta: [
      { title: "الخريطة — سرج" },
      { name: "description", content: "مواقع أراضي سرج المتاحة في الرياض." },
      { property: "og:title", content: "الخريطة — سرج" },
      { property: "og:description", content: "مواقع الأراضي على خريطة الرياض." },
    ],
  }),
  component: MapPage,
});

function MapPage() {
  const { parcels } = usePortfolio();
  const list = parcels.filter(isAvailable);
  const lats = list.map((p) => p.lat), lngs = list.map((p) => p.lng);
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  const W = 800, H = 600, pad = 30;
  const x = (lng: number) => pad + ((lng - minLng) / (maxLng - minLng)) * (W - 2 * pad);
  const y = (lat: number) => H - pad - ((lat - minLat) / (maxLat - minLat)) * (H - 2 * pad);
  return (
    <div>
      <h1 className="text-3xl font-bold">الخريطة</h1>
      <p className="mt-2 text-sm text-muted-foreground">{list.length} أرضًا متاحة. البنفسجي تجاري، والداكن سكني. مواقع تقريبية.</p>
      <div className="grid-bg mt-6 overflow-hidden rounded-2xl bg-ink">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          {list.map((p) => (
            <Link key={p.parcel_id} to="/investor/parcels/$parcelId" params={{ parcelId: p.parcel_id }}>
              <circle cx={x(p.lng)} cy={y(p.lat)} r={6} fill={p.land_type === "commercial" ? "var(--primary-soft)" : "var(--ink-foreground)"} fillOpacity={0.85}>
                <title>{`${p.district_ar} · ${p.parcel_id}`}</title>
              </circle>
            </Link>
          ))}
        </svg>
      </div>
    </div>
  );
}
