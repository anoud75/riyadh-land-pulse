import { useState } from "react";
import { snapshotUrl } from "@/lib/parcelSnapshot";
import type { Parcel } from "@/data/types";

/**
 * Real-map thumbnail of one parcel (Mapbox Static Image) with a glowing
 * footprint circle — used instead of a plain box on land cards.
 * If the image fails to load (offline / token blocked) it falls back to a
 * token-colored gradient block so the card never shows a broken image.
 */
export function ParcelSnapshot({ parcel, size = "card", className }: { parcel: Parcel; size?: "card" | "wide"; className?: string }) {
  const [failed, setFailed] = useState(false);
  const dims = size === "wide" ? { width: 1200, height: 512 } : { width: 600, height: 300 };
  const url = failed ? null : snapshotUrl(parcel, dims);
  return (
    <div className={`relative overflow-hidden bg-secondary ${className ?? ""}`}>
      {url ? (
        <img
          src={url}
          alt={`موقع أرض ${parcel.district_ar}`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 45%, color-mix(in oklab, var(--primary) 18%, transparent), transparent 65%)" }} aria-hidden="true">
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xl" style={{ color: "var(--primary)" }}>📍</span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/25 to-transparent" aria-hidden="true" />
    </div>
  );
}
