import { describe, expect, it } from "vitest";
import { initialInquiries, initialParcels } from "@/data";
import {
  cleanInquiry,
  getNegotiationCandidates,
  getSegmentStats,
  getSupplyDemandGaps,
} from "@/lib/portfolioEngine";

const P = initialParcels;
const byId = (id: string) => P.find((p) => p.parcel_id === id)!;

describe("portfolio engine", () => {
  it("loads 120 parcels and 48 inquiries", () => {
    expect(P).toHaveLength(120);
    expect(initialInquiries).toHaveLength(48);
  });

  it("flags SRE-013 as missing price", () => {
    expect(byId("SRE-013").missingPrice).toBe(true);
  });

  it("swaps SRE-098 coordinates", () => {
    const p = byId("SRE-098");
    expect(p.coordinatesCorrected).toBe(true);
    expect(p.lat).toBeCloseTo(24.534333);
    expect(p.lng).toBeCloseTo(46.643477);
  });

  it("flags inquiries without a budget", () => {
    const i = cleanInquiry({ ...initialInquiries[0]!, budget_sar: null });
    expect(i.missingBudget).toBe(true);
  });

  it("returns insufficient sample for South commercial sale (1 closed deal)", () => {
    const s = getSegmentStats(P, "South", "commercial", "sale");
    expect(s.closedDeals).toBe(1);
    expect(s.insufficientSample).toBe(true);
    expect(s.medianPricePerSqm).toBeNull();
    expect(s.medianClosingDays).toBeNull();
  });

  it("computes North gaps: commercial 0 vs 8, residential +13", () => {
    const g = getSupplyDemandGaps(P, initialInquiries);
    const nc = g.find((x) => x.area === "North" && x.landType === "commercial")!;
    const nr = g.find((x) => x.area === "North" && x.landType === "residential")!;
    expect([nc.availableParcels, nc.openInquiries]).toEqual([0, 8]);
    expect(nr.availableParcels).toBe(15);
    expect(nr.netGap).toBe(13);
  });

  it("ranks SRE-042 at x2.5 days-on-market multiplier", () => {
    const c = getNegotiationCandidates(P).find((x) => x.parcel.parcel_id === "SRE-042")!;
    expect(c.domMultiplier).toBe(2.5);
  });
});
