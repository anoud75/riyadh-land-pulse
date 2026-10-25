import type { Area, Parcel } from "@/data/types";
import { AREA_AR, DEAL_AR, LAND_AR } from "@/data/types";
import { getParcelInsight } from "./investorEngine";
import { applyMapFilters, EMPTY_FILTERS, type MapFilters } from "./mapStats";
import { sar } from "@/components/investor/format";

/**
 * Deterministic Arabic intent parser for the map assistant.
 * No model calls: every reply is computed from the portfolio data itself.
 */

export interface AssistantAnswer {
  text: string;
  filters: MapFilters;
  matches: Parcel[];
  top: Parcel | null;
  chips: string[];
}

const AREA_WORDS: [RegExp, Area][] = [
  [/شرق/, "East"],
  [/شمال/, "North"],
  [/جنوب/, "South"],
  [/غرب/, "West"],
  [/وسط|وسطى/, "Central"],
];

export const AREA_ADJ: Record<Area, string> = {
  East: "شرق",
  North: "شمال",
  South: "جنوب",
  West: "غرب",
  Central: "وسط",
};

export function parseQuery(text: string, prev: MapFilters = EMPTY_FILTERS): MapFilters {
  const f: MapFilters = { ...prev };
  const outside = /خارج\s+(ال)?(شرق|شمال|جنوب|غرب|وسط)/.exec(text);
  if (outside) {
    f.excludeArea = AREA_WORDS.find(([re]) => re.test(outside[2]!))?.[1] ?? null;
    f.area = null;
  } else {
    const area = AREA_WORDS.find(([re]) => re.test(text))?.[1];
    if (area) {
      f.area = area;
      f.excludeArea = null;
    }
  }
  if (/تجاري/.test(text)) f.landType = "commercial";
  if (/سكني/.test(text)) f.landType = "residential";
  if (/إيجار|ايجار|استئجار|أستأجر|استأجر/.test(text)) f.dealType = "lease";
  else if (/بيع|شراء|أشتري|اشتري/.test(text)) f.dealType = "sale";
  if (/شاحن|مستودع|لوجستي/.test(text)) f.minStreet = 30;
  const million = /(\d+(?:[.,]\d+)?)\s*مليون/.exec(text);
  if (million) f.maxBudget = Math.round(parseFloat(million[1]!.replace(",", ".")) * 1e6);
  else {
    const raw = /(\d[\d,]{5,})\s*ريال/.exec(text);
    if (raw) f.maxBudget = Number(raw[1]!.replace(/,/g, ""));
  }
  return f;
}

export function describeFilters(f: MapFilters): string {
  const parts: string[] = [];
  if (f.landType) parts.push(LAND_AR[f.landType]);
  if (f.area) parts.push(`${AREA_ADJ[f.area]} الرياض`);
  if (f.excludeArea) parts.push(`خارج ${AREA_ADJ[f.excludeArea]} الرياض`);
  if (f.dealType) parts.push(DEAL_AR[f.dealType]);
  if (f.minStreet) parts.push(`شارع ${f.minStreet} م فأكثر`);
  if (f.maxBudget) parts.push(`ضمن ميزانية ${sar(f.maxBudget)} ريال`);
  return parts.length ? parts.join("، ") : "كل المحفظة";
}

export function answerQuery(parcels: Parcel[], text: string, prev: MapFilters = EMPTY_FILTERS): AssistantAnswer {
  const filters = parseQuery(text, prev);
  const matches = applyMapFilters(parcels, filters);
  const top = matches.length ? matches.reduce((a, b) => (b.area_sqm > a.area_sqm ? b : a)) : null;
  const desc = describeFilters(filters);

  let body: string;
  if (!top) {
    body = `لا توجد أرض في المحفظة تطابق هذه القيود مجتمعة (${desc}). وسّعي القيد أو غيّري المنطقة.`;
  } else {
    const ins = getParcelInsight(parcels, top.parcel_id);
    const count = matches.length === 1 ? "أرض واحدة" : `${matches.length} أراضٍ`;
    const notes: string[] = [];
    if (top.street_width_m >= 30) notes.push(`أوسعها شارعًا (${top.street_width_m} م)`);
    if (ins?.priceDeltaPct != null)
      notes.push(`سعر مترها ${ins.priceDeltaPct > 0 ? "يعلو" : "يدنو"} وسيط شريحتها بـ${Math.abs(ins.priceDeltaPct)}%`);
    if (ins?.segment.medianClosingDays != null)
      notes.push(`ومضى عليها ${top.days_on_market} يومًا مقابل وسيط إغلاق ${ins.segment.medianClosingDays} — هامش تفاوض`);
    body = `${count} في المحفظة تطابق: ${desc}. ${top.district_ar} ${top.parcel_id}: ${notes.join("، ")}.`;
  }

  const chips: string[] = [];
  if (top) {
    chips.push("أضفها للمقارنة");
    if (filters.area) chips.push(`وش البديل خارج ${AREA_AR[filters.area]}؟`);
  }
  return { text: body, filters, matches, top, chips };
}
