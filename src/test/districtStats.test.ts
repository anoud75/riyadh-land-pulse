import { describe, expect, it } from "vitest";
import geoRaw from "@/data/riyadhDistricts.json";
import { districtStats, findDistrict, pointInDistrict, type DistrictCollection } from "@/lib/districtStats";
import { usePortfolioData } from "./helpers";

const GEO = geoRaw as unknown as DistrictCollection;

describe("district level", () => {
  it("has the 189 Riyadh districts", () => expect(GEO.features.length).toBe(189));
  it("places a point inside its district", () => {
    const f = findDistrict(GEO, "الملقا")!;
    expect(f).toBeTruthy();
    const [x, y] = (f.geometry.type === "Polygon" ? f.geometry.coordinates[0]! : f.geometry.coordinates[0]![0]!).reduce((a, p, _, r) => [a[0] + p[0] / r.length, a[1] + p[1] / r.length], [0, 0]);
    expect(pointInDistrict(x, y, f)).toBe(true);
  });
  it("every located parcel lands in at most one district", () => {
    const { parcels, inquiries } = usePortfolioData();
    const stats = districtStats(GEO, parcels, inquiries);
    const ids = stats.flatMap((s) => s.parcelIds);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThan(100);
  });
});
