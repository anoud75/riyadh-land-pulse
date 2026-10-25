import { createOpenAI } from "@ai-sdk/openai";
import { stepCountIs, streamText, tool, type LanguageModel, type ModelMessage } from "ai";
import { z } from "zod";
import { initialInquiries, initialParcels } from "@/data";
import type { Inquiry, Parcel } from "@/data/types";
import * as T from "./sarjAgentTools";
import type { UiPayload } from "./agentUi";

const MODEL = "openai/gpt-6-astra";

const GROUNDING = `القاعدة الحاسمة: لا تحسب أي وسيط أو نسبة أو عدد أو مبلغ من عندك. استدعِ الأدوات أولًا وانقل أرقامها كما هي حرفيًا.
لا تذكر أي أرض لم تُرجعها أداة. إذا قالت الأداة "عينة غير كافية" فقلها ولا تقدّر رقمًا.
اكتب بعربية فصيحة واضحة ومختصرة (3–6 أسطر)، بلا جداول Markdown. المناطق: North شمال، South جنوب، East شرق، West غرب، Central وسط. commercial تجاري، residential سكني، sale بيع، lease إيجار.`;

const INVESTOR_SYS = `أنت "محلّل المواقع" لدى سرج العقارية، تخدم مستثمرًا يبحث عن أرض في الرياض.
${GROUNDING}
حوّل طلب المستخدم إلى فلاتر واستدعِ filterAndRankParcels. اختر priority_mode: الشاحنات/المستودع/الدخول → logistics_trucks، التفاوض/الخصم/راكدة → negotiation_margin، الأرخص → lowest_price، مستشفى/عيادة → healthcare_reachability.
لهامش التفاوض أو "تقرير هامش التفاوض" استدعِ getNegotiationMarginReport. لأسئلة السوق والوسطاء والأحياء استدعِ getMarketContext. للمقارنة استدعِ getParcelComparison. ليس لديك أي وصول لاستفسارات أو أسماء أو أرقام جوالات.`;

const ADMIN_SYS = `أنت "مساعد الفريق" لدى سرج العقارية، تخدم فريق المبيعات الداخلي.
${GROUNDING}
أدواتك: getSupplyDemandGaps للعجز والفائض، getActionableWaitingInquiries للاستفسارات الجديدة المنتظرة، getStagnantCapitalReport للأراضي الراكدة، diagnoseRegion لتشخيص خسارة النفاد مقابل فائض العرض في منطقة، getExcludedWaitingBuyers لمن يُستبعد من المطابقة لعدم وجود مخزون (اذكرهم صراحة بالاسم وأيام الانتظار عند المطابقة).`;

const area = z.enum(["North", "South", "East", "West", "Central"]).nullable();

export interface AgentResult {
  text: string;
  parcelIds: string[];
  filters: { area: string | null; landType: string | null; dealType: string | null; minStreet: number | null; maxBudget: number | null } | null;
  tools: string[];
  ui: UiPayload | null;
}

export type { UiPayload } from "./agentUi";

export async function runSarjAgent(input: {
  mode: "investor" | "admin";
  messages: { role: "user" | "assistant"; content: string }[];
  extraParcels: Parcel[];
  extraInquiries: Inquiry[];
}): Promise<AgentResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
  const parcels = [...initialParcels, ...input.extraParcels.filter((p) => !initialParcels.some((x) => x.parcel_id === p.parcel_id))];

  const parcelIds = new Set<string>();
  const used: string[] = [];
  let filters: AgentResult["filters"] = null;
  let ui: UiPayload | null = null;
  const note = (name: string) => used.push(name);

  const investorTools = {
    filterAndRankParcels: tool({
      description: "Filter the available parcels and rank them by investor priority. Returns exact metrics.",
      inputSchema: z.object({
        area_of_city: area,
        land_type: z.enum(["residential", "commercial"]).nullable(),
        listing_type: z.enum(["sale", "lease"]).nullable(),
        max_budget_sar: z.number().nullable(),
        min_street_width_m: z.number().nullable(),
        priority_mode: z.enum(["logistics_trucks", "negotiation_margin", "lowest_price", "healthcare_reachability"]).nullable(),
      }),
      execute: async (f) => {
        note("filterAndRankParcels");
        const r = T.filterAndRankParcels(parcels, f);
        r.parcels.forEach((p) => parcelIds.add(p.parcel_id));
        ui = { kind: "cards", parcelIds: r.parcels.map((p) => p.parcel_id).slice(0, 6) };
        filters = { area: f.area_of_city, landType: f.land_type, dealType: f.listing_type, minStreet: f.min_street_width_m, maxBudget: f.max_budget_sar };
        return r;
      },
    }),
    getParcelComparison: tool({
      description: "Compare 2-4 parcels by id (e.g. SRE-015). Enforces the 3-closed-deal sample rule.",
      inputSchema: z.object({ parcel_ids: z.array(z.string()) }),
      execute: async ({ parcel_ids }) => {
        note("getParcelComparison");
        parcel_ids.forEach((id) => parcelIds.add(id));
        ui = { kind: "cards", parcelIds: parcel_ids.slice(0, 4) };
        return T.getParcelComparison(parcels, parcel_ids);
      },
    }),
    getNegotiationMarginReport: tool({
      description: "Negotiation margin report (تقرير هامش التفاوض): funnel analyzed -> in budget -> recommended, ranked by days-on-market multiplier. Sale parcels only.",
      inputSchema: z.object({ area_of_city: area, land_type: z.enum(["residential", "commercial"]).nullable(), max_budget_sar: z.number().nullable(), top: z.number().nullable() }),
      execute: async (f) => {
        note("getNegotiationMarginReport");
        const r = T.getNegotiationMarginReport(parcels, f);
        r.recommended.forEach((p) => parcelIds.add(p.parcel_id));
        ui = { kind: "negotiation_report", funnel: r.funnel, parcelIds: r.recommended.map((p) => p.parcel_id), multipliers: Object.fromEntries(r.recommended.map((p) => [p.parcel_id, p.dom_multiplier])) };
        filters = { area: f.area_of_city, landType: f.land_type, dealType: "sale", minStreet: null, maxBudget: f.max_budget_sar };
        return r;
      },
    }),
    getMarketContext: tool({
      description: "Segment medians (price/sqm, closing days, concession) and available parcels per district. Use for general market questions.",
      inputSchema: z.object({ area_of_city: area }),
      execute: async (f) => (note("getMarketContext"), T.getMarketContext(parcels, f)),
    }),
  };

  const adminTools = () => {
    const inquiries = [...initialInquiries, ...input.extraInquiries.filter((i) => !initialInquiries.some((x) => x.inquiry_id === i.inquiry_id))];
    return {
      getSupplyDemandGaps: tool({
        description: "Supply vs demand per region and land type.",
        inputSchema: z.object({}),
        execute: async () => (note("getSupplyDemandGaps"), T.getGapsTool(parcels, inquiries)),
      }),
      getActionableWaitingInquiries: tool({
        description: "New inquiries awaiting response, with matching parcels in budget or a flag explaining why none fit.",
        inputSchema: z.object({}),
        execute: async () => (note("getActionableWaitingInquiries"), T.getActionableWaitingInquiries(parcels, inquiries)),
      }),
      diagnoseRegion: tool({
        description: "Diagnose a region: commercial stockout loss (buyers with zero inventory, sum of budgets) vs residential oversupply (parcels vs inquiries, median closing days, concession %).",
        inputSchema: z.object({ area_of_city: z.enum(["North", "South", "East", "West", "Central"]) }),
        execute: async ({ area_of_city }) => {
          note("diagnoseRegion");
          const d = T.diagnoseRegion(parcels, inquiries, area_of_city);
          ui = { kind: "diagnosis", data: d };
          return d;
        },
      }),
      getExcludedWaitingBuyers: tool({
        description: "New inquiries excluded from matching because their segment has zero inventory, with wait days since the inquiry.",
        inputSchema: z.object({}),
        execute: async () => {
          note("getExcludedWaitingBuyers");
          const r = T.getExcludedWaitingBuyers(parcels, inquiries);
          ui = { kind: "excluded", rows: r.map((q) => ({ inquiry_id: q.inquiry_id, name: q.investor_name, segment: q.segment, wait_days: q.wait_days })) };
          return r;
        },
      }),
      getStagnantCapitalReport: tool({
        description: "Available parcels over 90 days on market priced above segment median, plus quarantined data anomalies.",
        inputSchema: z.object({}),
        execute: async () => {
          note("getStagnantCapitalReport");
          const r = T.getStagnantCapitalReport(parcels);
          r.parcels.forEach((p) => parcelIds.add(p.parcel_id));
          return r;
        },
      }),
    };
  };

  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const messages: ModelMessage[] = input.messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
  const result = streamText({
    model: provider.responses(MODEL) as unknown as LanguageModel, // duplicate @ai-sdk/provider versions differ only in types
    system: input.mode === "investor" ? INVESTOR_SYS : ADMIN_SYS,
    messages,
    tools: input.mode === "investor" ? investorTools : adminTools(),
    stopWhen: stepCountIs(50),
    maxRetries: 0,
    providerOptions: {
      openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] },
    },
  });
  const text = await result.text;
  return { text, parcelIds: [...parcelIds].slice(0, 8), filters, tools: used, ui };
}
