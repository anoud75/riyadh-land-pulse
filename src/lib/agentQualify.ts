/** Pure "qualify first" gate for the investor consultant: no parcel recommendations before budget or size is known. */

export type UiActionType = "SHOW_PARCELS" | "SHOW_MAP_DISTRICT" | "ASK_QUALIFYING_QUESTIONS";
export interface ConsultantReply { prose: string; ui_action: { type: UiActionType; payload: string[] } }

const BUDGET = /(\d[\d,.٫]*\s*(مليون|ملايين|ألف|الف|ريال|ر\.س|m|k|sar))|ميزانيت|ميزانية|budget|حدود\s*\d|أقل من\s*\d|اقل من\s*\d|الأرخص|ارخص|أرخص/i;
const SIZE = /(\d[\d,.٫]*\s*(م²|م2|متر|مترمربع|sqm|m2))|مساحة\s*\d|المساحة\s*\d/i;
const PARCEL_REF = /SRE-\d{3}/i;
const BUY_INTENT = /أبني|ابني|أبغى|ابغى|أبي|ابي|أريد|اريد|أشتري|اشتري|أستثمر|استثمر|أفتح|افتح|مستشفى|مستشفي|عيادة|مدرسة|مجمع|مول|مستودع|فندق|build|buy|hospital|clinic|school/i;
// Questions that are informational, not a buying brief — answer normally.
const INFO_ONLY = /وسيط|متوسط|قارن|مقارنة|هامش التفاوض|تفاوض|خريطة|حي .* (كيف|وش|ما)|السوق|سعر المتر|كم سعر/i;

export interface QualifyState { needsQualification: boolean; hasBudget: boolean; hasSize: boolean }

/** Looks at every user message in the conversation so answers given earlier count. */
export function qualifyState(userMessages: string[]): QualifyState {
  const all = userMessages.join("\n");
  const last = userMessages[userMessages.length - 1] ?? "";
  const hasBudget = BUDGET.test(all);
  const hasSize = SIZE.test(all);
  const intent = BUY_INTENT.test(last) && !PARCEL_REF.test(last) && !INFO_ONLY.test(last);
  return { hasBudget, hasSize, needsQualification: intent && !hasBudget && !hasSize };
}

export const QUALIFY_CHIPS = ["ميزانيتي أقل من 10 ملايين ريال", "ميزانيتي بين 10 و30 مليون ريال", "ميزانيتي أكثر من 30 مليون ريال", "أحتاج مساحة 5,000 م² تقريبًا"];

/** UI-label phrases the model must never write in prose (cards/buttons render these). */
const UI_LABELS = /(يفتح|افتح|اضغط|انقر|اختر)\s+(سجل|بطاقة|زر|الخريطة|التقرير)|سجل الأرض|بطاقة الأرض|زر\s+\S+/g;

export function cleanProse(s: string): string {
  return s.replace(UI_LABELS, "").replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

/** Enforce the contract: unknown parcel ids dropped, qualification forced when the gate says so. */
export function enforceReply(r: ConsultantReply, gate: QualifyState, toolParcelIds: Set<string>): ConsultantReply {
  const payload = r.ui_action.payload.filter((id) => toolParcelIds.has(id));
  if (gate.needsQualification) return { prose: cleanProse(r.prose), ui_action: { type: "ASK_QUALIFYING_QUESTIONS", payload: [] } };
  const type = r.ui_action.type === "SHOW_PARCELS" && !payload.length ? "SHOW_MAP_DISTRICT" : r.ui_action.type;
  return { prose: cleanProse(r.prose), ui_action: { type, payload: type === "SHOW_PARCELS" ? payload.slice(0, 6) : [] } };
}
