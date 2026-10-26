import { describe, expect, it } from "vitest";
import { initialInquiries as I, initialParcels as P } from "@/data";
import { runEngineAudit } from "@/lib/engineAudit";
import { inRiyadh } from "@/lib/portfolioEngine";

describe("engine audit", () => {
  it("passes every baseline check", () => {
    const failed = runEngineAudit(P, I).filter((r) => !r.pass);
    expect(failed).toEqual([]);
  });
  it("flags INQ-035 as a scale mismatch", () => {
    expect(I.find((i) => i.inquiry_id === "INQ-035")!.scaleMismatchWarning).toContain("لا تكفي لمجمع سكني");
  });
  it("all parcels sit inside the Riyadh box after cleaning", () => {
    expect(P.every((p) => inRiyadh(p.lat, p.lng))).toBe(true);
  });
  it("SRE-013 stays in the catalog but is never stagnant-priced", () => {
    const p = P.find((x) => x.parcel_id === "SRE-013")!;
    expect(p.missingPrice).toBe(true);
    expect(p.isStagnant).toBe(false);
  });
});
