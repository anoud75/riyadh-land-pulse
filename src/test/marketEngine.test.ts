import { describe, it, expect } from "vitest";
import { getMarketRentalYield, buildMarketInsight, MARKET_LISTINGS, offerKind } from "@/lib/marketEngine";
import { usableParcels } from "./helpers";

describe("marketEngine", () => {
  const parcels = usableParcels();
  it("SRE-052 north residential gets 90k–110k from Yasmin + Hittin", () => {
    const b = getMarketRentalYield("القيروان", "North", parcels);
    expect(b.scope).toBe("area");
    expect(b.min).toBe(90000); expect(b.max).toBe(110000);
    expect(b.comparables.map((c) => c.district).sort()).toEqual(["الياسمين", "حطين"].sort());
    const p = parcels.find((x) => x.parcel_id === "SRE-052")!;
    expect(buildMarketInsight(p, parcels).text).toContain("90,000 – 110,000");
  });
  it("excludes sale and non-Riyadh listings", () => {
    const b = getMarketRentalYield("المنار", "North", parcels);
    expect(b.comparables.every((c) => c.city === "الرياض" && c.kind === "rent")).toBe(true);
    expect(offerKind("دور للبيع")).toBe("sale");
  });
  it("no rent listings gives none", () => {
    const b = getMarketRentalYield("x", "North", parcels, MARKET_LISTINGS.filter((l) => l.kind === "sale"));
    expect(b.scope).toBe("none");
  });
});
