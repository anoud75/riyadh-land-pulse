import { describe, expect, it } from "vitest";
import { initialInquiries as I, initialParcels as P } from "@/data";
import { boundsCheck, getFeasibility, getScatter, getSegmentVelocity, previewParcelImpact, totalPrice } from "@/lib/adminEngine";

describe("admin engine", () => {
  it("total price is price × area", () => expect(totalPrice(2400, 1500)).toBe(3_600_000));
  it("flags SRE-121 coordinates ~27 km out of bounds", () => {
    const g = boundsCheck(24.4102, 46.9931);
    expect(g.outOfBounds).toBe(true);
    expect(g.beyondKm).toBe(27);
  });
  it("SRE-121 shifts North commercial gap -8 → -7 and matches 3 of 8", () => {
    const r = previewParcelImpact(P, I, { area_of_city: "North", land_type: "commercial", listing_type: "sale", area_sqm: 1500, price_per_sqm_sar: 2400, total_price_sar: 3_600_000 });
    expect([r.gapBefore, r.gapAfter, r.matched.length, r.buyers]).toEqual([-8, -7, 3, 8]);
  });
  it("INQ-035 compound is infeasible", () => {
    const f = getFeasibility(P, I.find((i) => i.inquiry_id === "INQ-035")!);
    expect(f?.min).toBe(306);
    expect(f!.max).toBeLessThan(2000);
  });
  it("stagnant quadrant count", () => expect(getScatter(P).stagnantCount).toBe(10));
  it("velocity hides medians under 3 deals", () => {
    for (const s of getSegmentVelocity(P)) if (s.closedDeals < 3) expect(s.medianClosingDays).toBeNull();
  });
});
