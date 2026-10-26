import type { Inquiry, Parcel } from "@/data/types";
import { getSegmentStats, getSupplyDemandGaps, isAvailable, isClosed, median, projectPopulationTo2026 } from "./portfolioEngine";

export interface AuditRow { check: string; expected: string; actual: string; pass: boolean }

/** Pure self-audit of baseline figures. Expected values are the engine's verified outputs on the 11 Aug 2026 snapshot. */
export function runEngineAudit(parcels: Parcel[], inquiries: Inquiry[]): AuditRow[] {
  const closed = parcels.filter(isClosed);
  const stagnant = parcels.filter((p) => p.isStagnant);
  const stagnantValue = stagnant.reduce((s, p) => s + (p.total_price_sar ?? 0), 0);
  const nc = inquiries.filter((i) => i.area_of_city_wanted === "North" && i.land_type_wanted === "commercial");
  const ncSupply = getSupplyDemandGaps(parcels, inquiries).find((g) => g.area === "North" && g.landType === "commercial")!;
  const waiting = inquiries.filter((i) => i.status === "new").length;
  const byId = (id: string) => parcels.find((p) => p.parcel_id === id);
  const row = (check: string, expected: unknown, actual: unknown): AuditRow => ({
    check, expected: String(expected), actual: String(actual), pass: String(expected) === String(actual),
  });
  return [
    row("Total parcels", 120, parcels.length),
    row("Available parcels", 62, parcels.filter(isAvailable).length),
    row("Closed deals", 42, closed.length),
    row("Overall median DOM (closed)", 41.5, median(closed.map((p) => p.days_on_market))),
    row("Stagnant parcels", 12, stagnant.length),
    row("Stagnant capital (SAR)", 104058000, stagnantValue),
    row("North commercial inquiries", 8, nc.length),
    row("North commercial budget (SAR)", 19844000, nc.reduce((s, i) => s + (i.budget_sar ?? 0), 0)),
    row("North commercial supply", 0, ncSupply.availableParcels),
    row("Unattended inquiries", "24 (50%)", `${waiting} (${Math.round((waiting / inquiries.length) * 100)}%)`),
    row("SRE-013 missingPrice", true, byId("SRE-013")?.missingPrice),
    row("SRE-098 coordinatesCorrected", true, byId("SRE-098")?.coordinatesCorrected),
    row("INQ-035 scale mismatch flagged", true, !!inquiries.find((i) => i.inquiry_id === "INQ-035")?.scaleMismatchWarning),
    row("South commercial sale suppressed", true, getSegmentStats(parcels, "South", "commercial", "sale").insufficientSample),
    row("Population 2.5% CAGR (8,591,748)", 9483682, projectPopulationTo2026(8591748)),
  ];
}

export function logEngineAudit(parcels: Parcel[], inquiries: Inquiry[]) {
  const rows = runEngineAudit(parcels, inquiries);
  const ok = rows.every((r) => r.pass);
  console.info(`[Sarj engine audit] ${ok ? "all checks passed" : "CHECKS FAILED"} (${rows.filter((r) => r.pass).length}/${rows.length})`);
  console.table(rows);
  return ok;
}
