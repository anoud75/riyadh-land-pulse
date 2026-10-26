import { describe, it, expect } from "vitest";
import { scoreHealthcare, scoreLogistics, scoreResidentialCompound } from "@/lib/siteSuitability";

describe("sector scoring", () => {
  it("logistics fails hard under 36 m street", () => {
    expect(scoreLogistics({ streetWidthM: 30, highwayMin: 2, priceRatio: 0.5 }).score).toBe(0);
    expect(scoreLogistics({ streetWidthM: 36, highwayMin: 5, priceRatio: 0.5 }).score).toBe(100);
  });
  it("healthcare drops with competing hospitals", () => {
    const a = scoreHealthcare({ popRatio15: 2, hospitals15: 0 }).score!;
    const b = scoreHealthcare({ popRatio15: 2, hospitals15: 5 }).score!;
    expect(a).toBe(95); expect(b).toBe(65);
  });
  it("compound skips missing inputs instead of zero-scoring", () => {
    expect(scoreResidentialCompound({ segmentMedianDom: null, priceRatio: 0.5, rentalYieldPct: null }).score).toBe(100);
    expect(scoreResidentialCompound({ segmentMedianDom: null, priceRatio: null, rentalYieldPct: null }).score).toBeNull();
  });
});
