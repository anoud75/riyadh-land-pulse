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

import { matchReasons, nearestDistrict, getScatter as gs } from "@/lib/adminEngine";
describe("pin, match reasons, filters", () => {
  it("nearestDistrict returns the parcel's own district at its coordinates", () => {
    const p = P.find((x) => x.status === "available")!;
    expect(nearestDistrict(P, p.lat, p.lng)?.district_ar).toBe(p.district_ar);
  });
  it("matchReasons shows remaining budget", () => {
    const p = P.find((x) => x.total_price_sar === 3_000_000) ?? P.find((x) => x.total_price_sar)!;
    const inq = { ...I[0]!, area_of_city_wanted: p.area_of_city, land_type_wanted: p.land_type, prefers: p.listing_type, budget_sar: p.total_price_sar! + 500_000, wants_to: "x" };
    const r = matchReasons(p, inq);
    expect(r.budgetLeft).toBe(500_000);
    expect(r.warn).toEqual([]);
  });
  it("scatter filter by area keeps stagnant total consistent", () => {
    const s = gs(P);
    const byArea = (["North", "South", "East", "West", "Central"] as const).reduce((n, a) => n + s.points.filter((p) => p.area === a && p.stagnant).length, 0);
    expect(byArea).toBe(s.stagnantCount);
    expect(s.stagnantCount).toBe(10);
  });
});

import { getLeadsAtRisk, getQuickWins, LEAD_RISK_DAYS, waitDaysOf } from "@/lib/adminEngine";
describe("quick wins & leads at risk", () => {
  it("quick wins only include buyers whose matched parcel fits budget", () => {
    const q = getQuickWins(P, I, 100);
    for (const r of q.rows) if (r.budget) expect(r.price).toBeLessThanOrEqual(r.budget);
  });
  it("leads at risk are open and waiting 30+ days", () => {
    const r = getLeadsAtRisk(I, 100);
    expect(LEAD_RISK_DAYS).toBe(30);
    for (const x of r.rows) { expect(x.status).not.toBe("closed"); expect(x.wait).toBeGreaterThanOrEqual(30); }
    expect(r.count).toBe(I.filter((i) => i.status !== "closed" && waitDaysOf(i) >= 30).length);
  });
});
