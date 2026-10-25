import { describe, expect, it } from "vitest";
import { initialParcels } from "@/data";
import { districtGeo } from "@/lib/districtGeo";

describe("footprint on the map", () => {
  it("centres الملقا in north Riyadh with an outline", () => {
    const g = districtGeo(initialParcels, "الملقا")!;
    expect(g.center[0]).toBeGreaterThan(24.75);
    expect(g.outline.length).toBeGreaterThanOrEqual(3);
  });
});
