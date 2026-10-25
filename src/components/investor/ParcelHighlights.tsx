import { useEffect, useMemo, useState } from "react";
import type { Parcel } from "@/data/types";
import type { OpenPlacesFile } from "@/lib/openPlaces";
import { servicesNear, SERVICE_RADIUS_M } from "@/lib/compareMetrics";
import { CATEGORY_AR, type PlaceCategory } from "@/lib/siteSuitability";
import { PLACE_ICON } from "@/lib/placeIcons";

const ORDER: PlaceCategory[] = ["mosque", "school", "hospital", "pharmacy", "supermarket", "shopping_mall", "cafe", "restaurant", "park", "gym"];

export function ParcelHighlights({ parcel: p }: { parcel: Parcel; priceDeltaPct?: number | null }) {
  const [places, setPlaces] = useState<OpenPlacesFile | null>(null);
  useEffect(() => {
    import("@/data/overturePlaces.json").then((m) => setPlaces(m.default as unknown as OpenPlacesFile));
  }, []);
  const counts = useMemo(() => (places ? servicesNear(places, p.lat, p.lng) : null), [places, p.lat, p.lng]);
  const total = counts ? Object.values(counts).reduce((a, b) => a + (b ?? 0), 0) : null;

  return (
    <section className="rounded-2xl border bg-card p-6">
      <h2 className="text-lg font-semibold">الخدمات المحيطة</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {total == null ? "…" : `${total} منشأة خدمية`} ضمن {SERVICE_RADIUS_M / 1000} كم من الأرض.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ORDER.map((c) => {
          const n = counts?.[c] ?? 0;
          return (
            <div key={c} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${n ? "" : "opacity-50"}`}>
              <span>{PLACE_ICON[c]?.emoji}</span>
              <span className="flex-1 truncate">{CATEGORY_AR[c]}</span>
              <span className="font-mono">{counts ? n : "…"}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">المصدر: بيانات أماكن مفتوحة (Overture).</p>
    </section>
  );
}
