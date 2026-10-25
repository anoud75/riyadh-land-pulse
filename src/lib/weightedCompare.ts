// Pure weighted scoring for the comparison page.
export type Criterion = { key: string; label: string; dir: 1 | -1; weight: number };
export type CellScore = { value: number | null; points: number | null };
export type LandScore = { id: string; score: number; cells: Record<string, CellScore>; skipped: string[]; reasons: string[] };

export const WEIGHT_LABELS = ["غير مهم", "مهم قليلًا", "متوسط الأهمية", "مهم", "مهم جدًا", "أساسي"];

/** values[id][key] = raw value (null = missing). Returns lands sorted best first. */
export function scoreLands(ids: string[], criteria: Criterion[], values: Record<string, Record<string, number | null>>): LandScore[] {
  const active = criteria.filter((c) => c.weight > 0);
  const range: Record<string, { min: number; max: number }> = {};
  for (const c of active) {
    const vs = ids.map((id) => values[id]?.[c.key]).filter((v): v is number => v != null);
    if (vs.length) range[c.key] = { min: Math.min(...vs), max: Math.max(...vs) };
  }
  const out = ids.map((id) => {
    const cells: Record<string, CellScore> = {};
    const skipped: string[] = [];
    let sum = 0, wsum = 0;
    const contrib: { label: string; v: number }[] = [];
    for (const c of active) {
      const v = values[id]?.[c.key] ?? null;
      const r = range[c.key];
      if (v == null || !r) { cells[c.key] = { value: v, points: null }; skipped.push(c.label); continue; }
      const n = r.max === r.min ? 1 : (v - r.min) / (r.max - r.min);
      const pts = c.dir === 1 ? n : 1 - n;
      cells[c.key] = { value: v, points: Math.round(pts * 100) };
      sum += pts * c.weight; wsum += c.weight;
      contrib.push({ label: c.label, v: pts * c.weight });
    }
    const reasons = contrib.filter((x) => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 3).map((x) => x.label);
    return { id, score: wsum ? Math.round((sum / wsum) * 100) : 0, cells, skipped, reasons };
  });
  return out.sort((a, b) => b.score - a.score);
}
