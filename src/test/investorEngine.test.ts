import { describe, expect, it } from "vitest";
import { initialParcels as P } from "@/data";
import { compareParcels, computeHeadroom, getParcelInsight, suggestAlternatives } from "@/lib/investorEngine";

describe("investor engine", () => {
  it("SRE-015 is +45% vs 3,300 median of 9 deals, 24-day median", () => {
    const i = getParcelInsight(P, "SRE-015")!;
    expect(i.segment.closedDeals).toBe(9);
    expect(i.segment.medianPricePerSqm).toBe(3300);
    expect(i.segment.medianClosingDays).toBe(24);
    expect(i.priceDeltaPct).toBe(45);
  });
  it("South commercial sale price delta is insufficient", () => {
    const [, b, c] = compareParcels(P, ["SRE-015", "SRE-077", "SRE-089"]);
    expect(b!.segment.insufficientSample).toBe(true);
    expect(b!.priceDeltaPct).toBeNull();
    expect(c!.priceDeltaPct).toBeNull();
  });
  it("SRE-081 headroom on 1M budget is 287,000 and suggests SRE-086", () => {
    const p = P.find((x) => x.parcel_id === "SRE-081")!;
    expect(computeHeadroom(1_000_000, p)).toBe(287_000);
    expect(suggestAlternatives(P, p, 1_000_000)[0]!.parcel_id).toBe("SRE-086");
  });
});
