import { describe, expect, it } from "vitest";
import { classifyScope } from "@/lib/agentScope";
import { buildComparisonChart, buildGapChart, buildRegionReport, mapCommand, RIYADH_CENTER } from "@/lib/agentViz";
import { initialInquiries, initialParcels } from "@/data";

describe("scope guard", () => {
  it("refuses cooking in both modes", () => {
    expect(classifyScope("investor", "كيف أطبخ كبسة؟").ok).toBe(false);
    expect(classifyScope("admin", "أعطني وصفة كيك").ok).toBe(false);
  });
  it("refuses team questions in investor mode", () => {
    const v = classifyScope("investor", "لماذا الاستفسارات واقفة؟");
    expect(v.ok === false && v.reason).toBe("team_only");
  });
  it("allows the same question for the team", () => {
    expect(classifyScope("admin", "لماذا الاستفسارات واقفة؟").ok).toBe(true);
  });
  it("allows parcel questions", () => {
    expect(classifyScope("investor", "أبغى أرض تجارية شمال الرياض").ok).toBe(true);
  });
});

describe("viz builders", () => {
  it("map: Riyadh overview by default", () => {
    const c = mapCommand(initialParcels, {});
    expect(c.action).toBe("fit_all");
    expect(c.center).toEqual(RIYADH_CENTER);
  });
  it("map: district zooms to 14 near its parcels", () => {
    const anyDistrict = initialParcels[0]!.district_ar;
    const c = mapCommand(initialParcels, { district: anyDistrict });
    expect(c.zoom).toBe(14);
    expect(c.label).toContain(anyDistrict);
    expect(c.district).toBeTruthy();
  });
  it("map: any of the 189 Riyadh districts resolves even with no سرج parcels", () => {
    const geo = (await import("@/data/riyadhDistricts.json")).default as { features: { properties: { id: number; name_ar: string; name_en: string } }[] };
    const covered = new Set(initialParcels.map((p) => p.district_ar));
    const empty = geo.features.find((f) => ![...covered].some((d) => d.includes(f.properties.name_ar) || f.properties.name_ar.includes(d)));
    expect(empty).toBeTruthy();
    const c = mapCommand(initialParcels, { district: empty!.properties.name_ar });
    expect(c.action).toBe("focus");
    expect(c.zoom).toBe(13);
    expect(c.label).toContain(empty!.properties.name_ar);
    expect(c.district).toBe(empty!.properties.name_ar);
    // centre stays inside Riyadh
    expect(c.center[0]).toBeGreaterThan(24.4);
    expect(c.center[0]).toBeLessThan(25.2);
    expect(c.center[1]).toBeGreaterThan(46.2);
    expect(c.center[1]).toBeLessThan(47.2);
  });
  it("comparison chart uses real street widths", () => {
    const ch = buildComparisonChart(initialParcels, ["SRE-086", "SRE-081"], "street_width");
    expect(ch.series.map((s) => s.value)).toEqual(["SRE-086", "SRE-081"].map((id) => initialParcels.find((p) => p.parcel_id === id)!.street_width_m));
  });
  it("gap chart shows North commercial -8", () => {
    const g = buildGapChart(initialParcels, initialInquiries);
    expect(g.series.find((s) => s.label === "الشمال · تجاري")?.value).toBe(-8);
  });
  it("region report has a gap chart", () => {
    expect(buildRegionReport(initialParcels, initialInquiries, "North").sections.some((s) => s.chart?.type === "diverging")).toBe(true);
  });
});
