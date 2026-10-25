import { describe, expect, it } from "vitest";
import { initialInquiries as I, initialParcels as P } from "@/data";
import * as T from "@/lib/sarjAgentTools";

describe("sarj agent tools", () => {
  it("ranks South commercial leases under 1M by street width", () => {
    const r = T.filterAndRankParcels(P, { area_of_city: "South", land_type: "commercial", listing_type: "lease", max_budget_sar: 1_000_000, priority_mode: "logistics_trucks" });
    expect(r.parcels.map((p) => p.parcel_id)).toEqual(["SRE-086", "SRE-081", "SRE-092", "SRE-091"]);
  });
  it("puts SRE-042 first for North residential negotiation margin at x2.5", () => {
    const r = T.filterAndRankParcels(P, { area_of_city: "North", land_type: "residential", max_budget_sar: 5_000_000, priority_mode: "negotiation_margin" });
    expect(r.parcels[0]).toMatchObject({ parcel_id: "SRE-042", dom_multiplier: 2.5 });
  });
  it("returns insufficient sample for South commercial sale in comparison", () => {
    const c = T.getParcelComparison(P, ["SRE-077"]);
    expect(c[0]).toMatchObject({ price_delta_vs_median: "عينة غير كافية" });
  });
  it("flags INQ-035 compound as too small", () => {
    const q = T.getActionableWaitingInquiries(P, I).find((x) => x.inquiry_id === "INQ-035")!;
    expect(q.matches).toEqual([]);
    expect(q.flag).toContain("306–450");
  });
  it("North commercial has 0 parcels vs 8 inquiries", () => {
    expect(T.getGapsTool(P, I).find((g) => g.area === "North" && g.landType === "commercial")).toMatchObject({ availableParcels: 0, openInquiries: 8 });
  });
  it("investor ranking output carries no inquiry data", () => {
    const s = JSON.stringify(T.filterAndRankParcels(P, {}));
    expect(s).not.toContain("INQ-");
    expect(s).not.toMatch(/05\d{8}/);
  });
});
