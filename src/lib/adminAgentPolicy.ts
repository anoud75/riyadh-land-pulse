import { AREA_AR, DEAL_AR, LAND_AR, type Inquiry, type Parcel } from '@/data/types';
import type { UiPayload } from './agentUi';
import { getActionableWaitingInquiries, getExcludedWaitingBuyers, SNAPSHOT_DATE } from './sarjAgentTools';

/** Latest request alone authorizes visual tools; old chat turns do not. */
export function adminRequestPolicy(question: string) {
  return {
    matching: /طابق|مطابق|مستبعد|نستبعد|استبعاد|منتظر|ينتظر|waiting|match|exclud/i.test(question),
    map: /خريط|قر[ّ]?ب|قرب|كب[ّ]?ر|صغ[ّ]?ر|zoom|map/i.test(question),
    chart: /ارسم|رسم|شارت|مخطط|قارن|مقارن|chart|graph|compar/i.test(question),
    report: /تقرير|report/i.test(question),
  };
}

export function relevantAdminPayloads(question: string, payloads: UiPayload[]) {
  const policy = adminRequestPolicy(question);
  return payloads.filter((ui) => {
    if (ui.kind === 'market_insight' || ui.kind === 'suitability' || ui.kind === 'negotiation_report') return false;
    if (ui.kind === 'map') return policy.map;
    if (ui.kind === 'chart') return policy.chart || policy.report;
    if (ui.kind === 'report') return policy.report;
    if (policy.matching) return ui.kind === 'matching' || ui.kind === 'excluded';
    return true;
  });
}

export function buildWaitingResponse(parcels: Parcel[], inquiries: Inquiry[]) {
  const waiting = getActionableWaitingInquiries(parcels, inquiries);
  const excluded = getExcludedWaitingBuyers(parcels, inquiries);
  const ready = waiting.filter((row) => row.matches.length > 0);
  const review = waiting.length - ready.length - excluded.length;
  const rows = waiting.map((row) => {
    const inquiry = inquiries.find((i) => i.inquiry_id === row.inquiry_id);
    const wait = inquiry ? Math.max(0, Math.round((Date.parse(SNAPSHOT_DATE) - Date.parse(inquiry.date)) / 86400000)) : 0;
    return {
      ...row,
      segment: inquiry ? `${AREA_AR[inquiry.area_of_city_wanted]} · ${LAND_AR[inquiry.land_type_wanted]} · ${DEAL_AR[inquiry.prefers]}` : row.segment,
      wait_days: wait,
    };
  }).sort((a, b) => b.wait_days - a.wait_days);
  const ui: UiPayload = { kind: 'matching', rows };
  const text = `جاهزون للعرض: ${ready.length} من أصل ${waiting.length} استفسارًا بلا رد لديهم أراضٍ مطابقة للطلب والميزانية المسجلة.\nلا مخزون: ${excluded.length} مستفسرين؛ يُستبعدون من المطابقة الحالية، وليس من المتابعة.${review ? `\nتحتاج مراجعة: ${review} استفسارات بسبب الميزانية أو المساحة.` : ''}\nالأولوية: تواصل مع الأطول انتظارًا من المطابقين، وابحث عن مخزون لطلبات المستبعدين.`;
  return { text, ui, ready: ready.length, excluded: excluded.length, review, total: waiting.length };
}