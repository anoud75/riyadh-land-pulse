import { describe, expect, it } from "vitest";
import { initialParcels as P } from "@/data";
import { answerQuery, parseQuery } from "@/lib/assistant";
import { aggregateDistricts, applyMapFilters, getTickerStats } from "@/lib/mapStats";

describe("assistant query parsing", () => {
  it("parses an east commercial truck query into filters", () => {
    const f = parseQuery("أبغى أرض تجارية كبيرة شرق الرياض، يهمني دخول الشاحنات");
    expect(f.area).toBe("East");
    expect(f.landType).toBe("commercial");
    expect(f.minStreet).toBe(30);
  });
  it("suggests SRE-015 as the top match for that query", () => {
    const a = answerQuery(P, "أبغى أرض تجارية كبيرة شرق الرياض، يهمني دخول الشاحنات");
    expect(a.top?.parcel_id).toBe("SRE-015");
  });
  it("parses a budget stated in millions", () => {
    expect(parseQuery("ميزانية 10 مليون").maxBudget).toBe(10_000_000);
  });
  it("خارج الشرق excludes the east and keeps the rest of the filters", () => {
    const prev = parseQuery("أرض تجارية شرق الرياض");
    const f = parseQuery("وش البديل خارج الشرق؟", prev);
    expect(f.area).toBeNull();
    expect(f.excludeArea).toBe("East");
    expect(f.landType).toBe("commercial");
    expect(applyMapFilters(P, f).every((p) => p.area_of_city !== "East")).toBe(true);
  });
});

describe("map stats", () => {
  it("ticker matches the portfolio headline numbers", () => {
    const t = getTickerStats(P);
    expect(t.available).toBe(62);
    expect(t.saleValueM).toBe(256.5);
    expect(t.leaseValueM).toBe(9.3);
    expect(t.medianClosingDays).toBe(41.5);
  });
  it("aggregates all 88 districts with centroids inside Riyadh", () => {
    const d = aggregateDistricts(P);
    expect(d.length).toBe(88);
    expect(d.every((x) => x.lat > 24 && x.lat < 25.2 && x.lng > 46 && x.lng < 47.2)).toBe(true);
  });
});
