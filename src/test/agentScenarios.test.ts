import { describe, expect, it } from "vitest";
import { initialInquiries as I, initialParcels as P } from "@/data";
import * as T from "@/lib/sarjAgentTools";

describe("agent reports", () => {
  it("negotiation report North residential ≤3.5M recommends SRE-042 x2.5, SRE-041 x2.2, SRE-052 x2.2", () => {
    const r = T.getNegotiationMarginReport(P, { area_of_city: "North", land_type: "residential", max_budget_sar: 3_500_000 });
    expect(r.recommended.map((p) => [p.parcel_id, p.dom_multiplier])).toEqual([["SRE-042", 2.5], ["SRE-041", 2.2], ["SRE-052", 2.2]]);
    expect(r.funnel.recommended).toBe(3);
  });
  it("North commercial: 8 buyers, 0 inventory", () => {
    const d = T.diagnoseRegion(P, I, "North");
    expect([d.commercial.open_inquiries, d.commercial.available_parcels]).toEqual([8, 0]);
  });
  it("buyers with no inventory are excluded with wait days", () => {
    const r = T.getExcludedWaitingBuyers(P, I);
    expect(r.length).toBeGreaterThan(0);
    for (const q of r) expect(q.matches).toEqual([]);
  });
  it("investor market context has no inquiry data", () => {
    expect(JSON.stringify(T.getMarketContext(P, {}))).not.toContain("INQ-");
  });
});
