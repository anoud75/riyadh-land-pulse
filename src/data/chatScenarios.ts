import type { Inquiry, Parcel } from "./types";
import type { UiPayload } from "@/lib/agentUi";
import * as T from "@/lib/sarjAgentTools";
import * as V from "@/lib/agentViz";

export interface ChatMsg { role: "user" | "assistant"; text: string; ui?: UiPayload | null; uis?: UiPayload[]; suggestions?: string[] | undefined }
export interface Scenario { id: string; title: string; build: (p: Parcel[], i: Inquiry[]) => ChatMsg[] }

const n = (x: number) => x.toLocaleString("en-US");
const m = (x: number) => `${(x / 1e6).toFixed(1)} مليون`;

/** Preloaded conversations from the design PDF. Answers are computed from the tools, never typed numbers. */
export const INVESTOR_SCENARIOS: Scenario[] = [
  {
    id: "trucks",
    title: "مستودع إيجار جنوب الرياض تحت مليون",
    build: (P) => {
      const r = T.filterAndRankParcels(P, { area_of_city: "South", land_type: "commercial", listing_type: "lease", max_budget_sar: 1_000_000, priority_mode: "logistics_trucks" });
      return [
        { role: "user", text: "أبغى أرض لمستودع جنوب الرياض، إيجار، ميزانيتي مليون ريال سنويًا، ويهمني دخول الشاحنات" },
        { role: "assistant", text: `وجدت ${r.matched} أراضٍ تجارية للإيجار جنوب الرياض ضمن المليون. رتبتها بعرض الشارع لأنه ما يحدد دخول الشاحنات: ${r.parcels.map((p) => `${p.parcel_id} (${p.street_width_m} م)`).join("، ")}.`, ui: { kind: "cards", parcelIds: r.parcels.map((p) => p.parcel_id) }, uis: [{ kind: "cards", parcelIds: r.parcels.map((p) => p.parcel_id) }, { kind: "chart", chart: V.buildComparisonChart(P, r.parcels.map((p) => p.parcel_id), "street_width") }, { kind: "map", command: V.mapCommand(P, { parcel_ids: r.parcels.map((p) => p.parcel_id) }) }] },
      ];
    },
  },
  {
    id: "negotiation",
    title: "تقرير هامش التفاوض — سكني شمال",
    build: (P) => {
      const r = T.getNegotiationMarginReport(P, { area_of_city: "North", land_type: "residential", max_budget_sar: 3_500_000 });
      return [
        { role: "user", text: "أبغى أرض سكنية شمال الرياض بحدود 3.5 مليون، وين أقدر أفاوض؟" },
        { role: "assistant", text: `حللت ${r.funnel.analyzed} أرضًا سكنية للبيع في الشمال، ${r.funnel.in_budget} منها ضمن ميزانيتك، وأرشّح ${r.funnel.recommended}: ${r.recommended.map((p) => `${p.parcel_id} ×${p.dom_multiplier}`).join("، ")}. المضاعف يعني أن الأرض معروضة أطول من وسيط إغلاق شريحتها بهذا القدر، فالبائع أقرب للتفاوض.`, ui: { kind: "negotiation_report", funnel: r.funnel, parcelIds: r.recommended.map((p) => p.parcel_id), multipliers: Object.fromEntries(r.recommended.map((p) => [p.parcel_id, p.dom_multiplier])) } },
      ];
    },
  },
  {
    id: "compare",
    title: "قارن الرمال والمناخ والمنصورية",
    build: (P) => {
      const c = T.getParcelComparison(P, ["SRE-015", "SRE-077", "SRE-089"]);
      return [
        { role: "user", text: "قارن لي بين SRE-015 وSRE-077 وSRE-089" },
        { role: "assistant", text: c.map((x) => "error" in x ? `${x.parcel_id}: غير موجودة` : `${x.parcel_id} ${x.district_ar}: فرق السعر عن الوسيط ${typeof x.price_delta_vs_median === "number" ? `${x.price_delta_vs_median}%` : x.price_delta_vs_median}`).join("\n"), ui: { kind: "cards", parcelIds: ["SRE-015", "SRE-077", "SRE-089"] } },
      ];
    },
  },
];

export const ADMIN_SCENARIOS: Scenario[] = [
  {
    id: "north",
    title: "تشخيص الشمال: نفاد التجاري وفائض السكني",
    build: (P, I) => {
      const d = T.diagnoseRegion(P, I, "North");
      return [
        { role: "user", text: "ليش الشمال يخسرنا؟" },
        { role: "assistant", text: `التجاري: ${d.commercial.open_inquiries} مشترين مفتوحين مقابل ${d.commercial.available_parcels} أرض متاحة، ومجموع ميزانياتهم ${m(d.commercial.buyer_budgets_total_sar)} ريال ضائعة لعدم وجود مخزون.\nالسكني: ${d.residential.available_parcels} أرضًا متاحة مقابل ${d.residential.open_inquiries} استفسارات، بوسيط إغلاق ${d.residential.sale_median_closing_days} يومًا وتنازل سعري ${d.residential.sale_price_concession_pct}%.`, ui: { kind: "diagnosis", data: d } },
      ];
    },
  },
  {
    id: "excluded",
    title: "من ينتظر ولا نملك له أرضًا؟",
    build: (P, I) => {
      const r = T.getExcludedWaitingBuyers(P, I);
      return [
        { role: "user", text: "طابق المنتظرين، ومن نستبعد؟" },
        { role: "assistant", text: `هؤلاء ${r.length} مستبعدون من المطابقة لأن شريحتهم بلا مخزون: ${r.map((q) => `${q.investor_name} (${q.wait_days} يومًا)`).join("، ")}.`, ui: { kind: "excluded", rows: r.map((q) => ({ inquiry_id: q.inquiry_id, name: q.investor_name, segment: q.segment, wait_days: q.wait_days })) } },
      ];
    },
  },
  {
    id: "stagnant",
    title: "تقرير رأس المال الراكد",
    build: (P) => {
      const r = T.getStagnantCapitalReport(P);
      return [
        { role: "user", text: "تقرير رأس المال الراكد" },
        { role: "assistant", text: `${r.count} أراضٍ راكدة بقيمة ${n(r.total_value_sar)} ريال (${r.rule}). معزولة لجودة البيانات: ${r.quarantined.map((q) => q.parcel_id).join("، ")}.`, ui: { kind: "cards", parcelIds: r.parcels.map((p) => p.parcel_id).slice(0, 6) } },
      ];
    },
  },
  {
    id: "north-report",
    title: "تقرير الفريق للشمال مع الخريطة",
    build: (P, I) => {
      const r = V.buildRegionReport(P, I, "North");
      return [
        { role: "user", text: "جهّز لي تقرير الشمال وافتح الخريطة عليه" },
        { role: "assistant", text: `جهّزت ${r.title} في اللوحة الجانبية، وقرّبت الخريطة على شمال الرياض.\n${r.sections[0]!.text}`, ui: { kind: "report", ...r }, uis: [{ kind: "report", ...r }, { kind: "chart", chart: V.buildGapChart(P, I) }, { kind: "map", command: V.mapCommand(P, { area_of_city: "North" }) }] },
      ];
    },
  },
];
