import { describe, expect, it } from "vitest";
import geo from "@/data/riyadhDistricts.json";
import { projectPopulationTo2026 } from "@/lib/portfolioEngine";
import { districtPopulation2026 } from "@/lib/districtPopulation";
import { populationBoost, scoreBusiness } from "@/lib/siteSuitability";
import type { DistrictCollection } from "@/lib/districtStats";

describe("population 2026", () => {
  it("projects Riyadh 2022 at 2.5% for 4 years", () => {
    expect(projectPopulationTo2026(8591748)).toBe(9483682);
  });
  it("district estimates add up to the projected Riyadh total", () => {
    const sum = districtPopulation2026(geo as unknown as DistrictCollection).reduce((a, p) => a + p.population, 0);
    expect(Math.abs(sum - 9483682)).toBeLessThanOrEqual(189);
  });
  it("population boost is capped at 15 points", () => {
    expect(populationBoost(10)).toBe(15);
    expect(populationBoost(1)).toBe(7.5);
    expect(scoreBusiness("hospital", { found: 1, nearestMin: 30, within10: 0, popRatio: 5 }).score).toBe(100);
  });
});
