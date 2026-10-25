import { describe, expect, it } from "vitest";
import { detectUseCase, rankResults, scoreBusiness, scoreCommercial, scoreLiving, serviceScore } from "@/lib/siteSuitability";

describe("site suitability", () => {
  it("hospital 30+ min from nearest competitor with none within 10 min scores 100", () => {
    expect(scoreBusiness("hospital", { found: 3, nearestMin: 30, within10: 0 }).score).toBe(100);
  });
  it("hospital weights distance more than a cafe does", () => {
    const i = { found: 10, nearestMin: 30, within10: 10 };
    expect(scoreBusiness("hospital", i).score).toBe(70);
    expect(scoreBusiness("cafe", i).score).toBe(25);
  });
  it("no places found gives insufficient data, not a number", () => {
    expect(scoreBusiness("cafe", { found: 0, nearestMin: null, within10: 0 })).toEqual({ score: null, label: "بيانات غير كافية" });
    expect(scoreLiving([], 1000, 1000).score).toBeNull();
    expect(scoreCommercial(0, 0, 30).score).toBeNull();
  });
  it("service within 5 minutes is full marks, 20+ is zero", () => {
    expect(serviceScore(5)).toBe(1); expect(serviceScore(20)).toBe(0); expect(serviceScore(null)).toBe(0);
  });
  it("cheaper district scores higher for living with the same services", () => {
    const svc = [{ category: "school" as const, label_ar: "مدرسة", minutes: 5, count: 3 }];
    expect(scoreLiving(svc, 1000, 2000).score).toBe(100);
    expect(scoreLiving(svc, 3000, 2000).score).toBe(80);
  });
  it("ranks by score with missing data last", () => {
    expect(rankResults([{ score: null }, { score: 40 }, { score: 90 }]).map((r) => r.score)).toEqual([90, 40, null]);
  });
  it("detects the use case from Arabic questions", () => {
    expect(detectUseCase("أبي أفتح مستشفى في النرجس")).toEqual({ useCase: "business", category: "hospital" });
    expect(detectUseCase("أبي أسكن في الملقا هل فيه خدمات")).toEqual({ useCase: "living", category: null });
    expect(detectUseCase("وين أفضل حي لكوفي")).toEqual({ useCase: "business", category: "cafe" });
  });
});
