import { describe, expect, it } from "vitest";
import { scoreLands } from "@/lib/weightedCompare";

const vals = { A: { price: 100, size: 500 }, B: { price: 200, size: 1000 } };

describe("scoreLands", () => {
  it("lower price wins when price is the only weight", () => {
    const r = scoreLands(["A", "B"], [{ key: "price", label: "السعر", dir: -1, weight: 5 }, { key: "size", label: "المساحة", dir: 1, weight: 0 }], vals);
    expect(r[0]!.id).toBe("A");
    expect(r[0]!.score).toBe(100);
    expect(r[1]!.score).toBe(0);
  });
  it("weight 0 removes a criterion", () => {
    const r = scoreLands(["A", "B"], [{ key: "price", label: "السعر", dir: -1, weight: 0 }, { key: "size", label: "المساحة", dir: 1, weight: 3 }], vals);
    expect(r[0]!.id).toBe("B");
  });
  it("equal values give equal points", () => {
    const r = scoreLands(["A", "B"], [{ key: "x", label: "x", dir: 1, weight: 3 }], { A: { x: 5 }, B: { x: 5 } });
    expect(r[0]!.score).toBe(r[1]!.score);
  });
  it("missing data is skipped, not zero-scored", () => {
    const r = scoreLands(["A", "B"], [{ key: "price", label: "السعر", dir: -1, weight: 3 }, { key: "size", label: "المساحة", dir: 1, weight: 3 }], { A: { price: null, size: 1000 }, B: { price: 100, size: 500 } });
    const a = r.find((x) => x.id === "A")!;
    expect(a.score).toBe(100);
    expect(a.skipped).toEqual(["السعر"]);
  });
});
