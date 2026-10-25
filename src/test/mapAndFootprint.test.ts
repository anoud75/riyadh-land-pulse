import { describe, expect, it } from "vitest";
import { initialParcels as P } from "@/data";
import { dealColor, MAP_COLORS, parcelColor, parcelRadius } from "@/lib/mapLayers";

const byId = (id: string) => P.find((p) => p.parcel_id === id)!;

describe("map layers", () => {
  it("colours by status: sale blue, lease teal, unavailable gray", () => {
    expect(dealColor(byId("SRE-015"))).toBe(MAP_COLORS.sale);
    expect(dealColor(byId("SRE-081"))).toBe(MAP_COLORS.lease);
    expect(dealColor(byId("SRE-002"))).toBe(MAP_COLORS.unavailable);
  });
  it("larger plots get larger circles", () => {
    expect(parcelRadius(byId("SRE-015"))).toBeGreaterThan(parcelRadius(byId("SRE-002")));
  });
  it("price layer shows no-data for missing price and thin segments", () => {
    expect(parcelColor(byId("SRE-013"), "price", P)).toBe(MAP_COLORS.noData);
    expect(parcelColor(byId("SRE-077"), "price", P)).toBe(MAP_COLORS.noData);
  });
});

