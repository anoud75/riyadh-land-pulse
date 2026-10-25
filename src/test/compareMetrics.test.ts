import { describe, expect, it } from "vitest";
import { servicesNear } from "@/lib/compareMetrics";

const file = { source: "", release: "", fetched: "", license: "", categories: ["hospital", "cafe"], places: [
  [46.6, 24.7, 0, "a"], [46.6005, 24.7, 1, "b"], [46.7, 24.7, 0, "far"],
] } as never;

describe("servicesNear", () => {
  it("counts only places within 2 km", () => {
    expect(servicesNear(file, 24.7, 46.6)).toEqual({ hospital: 1, cafe: 1 });
  });
});
