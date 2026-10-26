import type { Area, DealType, Inquiry, LandType, Parcel } from "@/data/types";
import { AREAS, AREA_AR, DEAL_AR, LAND_AR, LAND_TYPES, SNAPSHOT_DATE } from "@/data/types";
import {
  getHeadline, getNegotiationCandidates, getSegmentStats, getSupplyDemandGaps,
  isAvailable, isClosed, isPriced, median, MIN_SAMPLE,
} from "./portfolioEngine";
import { COMPOUND_MIN_SQM, getActionableWaitingInquiries, getStagnantCapitalReport } from "./sarjAgentTools";

const DAY = 86_400_000;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);

/* ---------- geography ---------- */
export const RIYADH_CENTER = { lat: 24.7136, lng: 46.6753 };
/** Radius of the urban area the portfolio covers (agent-chosen). */
export const RIYADH_RADIUS_KM = 20;

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = (d: number) => (d * Math.PI) / 180;
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function boundsCheck(lat: number, lng: number) {
  const fromCenterKm = haversineKm(RIYADH_CENTER, { lat, lng });
  const beyondKm = Math.max(0, fromCenterKm - RIYADH_RADIUS_KM);
  return { fromCenterKm: Math.round(fromCenterKm * 10) / 10, beyondKm: Math.round(beyondKm), outOfBounds: beyondKm > 0 };
}

/* ---------- add parcel ---------- */
export const totalPrice = (pricePerSqm: number, sqm: number) => Math.round(pricePerSqm * sqm);

export interface DraftParcel {
  area_of_city: Area; land_type: LandType; listing_type: DealType;
  area_sqm: number; price_per_sqm_sar: number; total_price_sar: number;
}

export function previewParcelImpact(parcels: Parcel[], inquiries: Inquiry[], d: DraftParcel) {
  const cell = (ps: Parcel[]) =>
    getSupplyDemandGaps(ps, inquiries).find((g) => g.area === d.area_of_city && g.landType === d.land_type)!;
  const before = cell(parcels);
  const fake = { ...d, status: "available", missingPrice: false } as unknown as Parcel;
  const after = cell([...parcels, fake]);
  const buyers = inquiries.filter((i) => i.area_of_city_wanted === d.area_of_city && i.land_type_wanted === d.land_type);
  const matched = buyers.filter(
    (i) => i.prefers === d.listing_type && (i.budget_sar == null || i.budget_sar >= d.total_price_sar),
  );
  return { gapBefore: before.netGap, gapAfter: after.netGap, buyers: buyers.length, matched };
}

/* ---------- today ---------- */
export function getActionCards(parcels: Parcel[], inquiries: Inquiry[]) {
  const northCom = inquiries.filter((i) => i.area_of_city_wanted === "North" && i.land_type_wanted === "commercial");
  const northGap = getSupplyDemandGaps(parcels, inquiries).find((g) => g.area === "North" && g.landType === "commercial")!;
  const repricing = getNegotiationCandidates(parcels).filter(
    (c) => c.parcel.area_of_city === "North" && c.parcel.days_on_market > 140 && (c.priceDeltaPct ?? 0) > 20,
  );
  const actionable = getActionableWaitingInquiries(parcels, inquiries).filter((a) => a.matches.length && !a.flag);
  return {
    buyNorth: {
      buyers: northCom.length,
      maxBudget: Math.max(0, ...northCom.map((i) => i.budget_sar ?? 0)),
      supply: northGap.availableParcels,
    },
    reprice: repricing.map((c) => ({ id: c.parcel.parcel_id, district: c.parcel.district_ar, days: c.parcel.days_on_market, delta: c.priceDeltaPct! })),
    matchToday: {
      count: actionable.length,
      totalBudget: actionable.reduce((s, a) => s + (a.budget_sar ?? 0), 0),
      ids: actionable.map((a) => a.inquiry_id),
    },
  };
}

export function getKpis(parcels: Parcel[], inquiries: Inquiry[]) {
  const h = getHeadline(parcels, inquiries);
  const st = getStagnantCapitalReport(parcels);
  return {
    available: h.available,
    unanswered: inquiries.filter((i) => i.status === "new").length,
    stagnantCount: st.count,
    stagnantValue: st.total_value_sar,
    medianClosingDays: h.medianClosingDays,
    closed: h.closed,
  };
}

/** Available parcels with the longest time on market, vs the closed-deals median. */
export function getStagnantBars(parcels: Parcel[], limit = 10) {
  const med = median(parcels.filter(isClosed).map((p) => p.days_on_market)) ?? 0;
  const rows = parcels.filter(isAvailable).sort((a, b) => b.days_on_market - a.days_on_market).slice(0, limit)
    .map((p) => ({ id: p.parcel_id, district: p.district_ar, days: p.days_on_market }));
  return { median: med, rows };
}

/* ---------- portfolio scatter ---------- */
export const STAGNANT_DAYS = 90;
export function getScatter(parcels: Parcel[]) {
  const pts = getNegotiationCandidates(parcels)
    .filter((c) => c.priceDeltaPct != null)
    .map((c) => ({
      id: c.parcel.parcel_id, district: c.parcel.district_ar, days: c.parcel.days_on_market,
      area: c.parcel.area_of_city, landType: c.parcel.land_type, dealType: c.parcel.listing_type,
      delta: c.priceDeltaPct!, stagnant: c.parcel.days_on_market > STAGNANT_DAYS && c.priceDeltaPct! > 0,
    }));
  return { points: pts, stagnantCount: pts.filter((p) => p.stagnant).length };
}

/* ---------- inquiries ---------- */
export function getAging(inquiries: Inquiry[]) {
  return inquiries.map((i) => ({ id: i.inquiry_id, status: i.status, days: daysBetween(i.date, SNAPSHOT_DATE), name: i.investor_name }));
}

export function getFunnel(inquiries: Inquiry[], offersSent: number) {
  return [
    { key: "all", label: "استفسار", n: inquiries.length },
    { key: "contacted", label: "تواصل", n: inquiries.filter((i) => i.status !== "new").length },
    { key: "negotiating", label: "تفاوض", n: inquiries.filter((i) => i.status === "negotiating").length },
    { key: "offer", label: "عرض مُرسل", n: offersSent },
  ];
}

export const maskPhone = (p: string) => (p.length > 4 ? `${p.slice(0, 4)}•••` : "•••");

export function getFeasibility(parcels: Parcel[], inquiry: Inquiry) {
  if (!/compound|مجمع/i.test(inquiry.wants_to)) return null;
  const cands = parcels.filter((p) =>
    isAvailable(p) && isPriced(p) && p.area_of_city === inquiry.area_of_city_wanted &&
    p.land_type === inquiry.land_type_wanted && p.listing_type === inquiry.prefers &&
    (inquiry.budget_sar == null || p.total_price_sar! <= inquiry.budget_sar));
  if (!cands.length || cands.some((p) => p.area_sqm >= COMPOUND_MIN_SQM)) return null;
  const sizes = cands.map((p) => p.area_sqm);
  return { min: Math.min(...sizes), max: Math.max(...sizes), required: COMPOUND_MIN_SQM, ids: cands.map((p) => p.parcel_id) };
}

/* ---------- performance ---------- */
export function getMonthlyClosings(parcels: Parcel[]) {
  const m = new Map<string, number>();
  for (const p of parcels.filter(isClosed)) {
    const k = p.listed_date.slice(0, 7); // data has no closing date; grouped by listing month
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort().map(([month, n]) => ({ month, n }));
}

export function getSegmentVelocity(parcels: Parcel[]) {
  const out = [];
  for (const a of AREAS) for (const l of LAND_TYPES) for (const d of ["sale", "lease"] as DealType[]) {
    const s = getSegmentStats(parcels, a, l, d);
    if (s.closedDeals > 0) out.push(s);
  }
  return out;
}

/* ---------- location pin ---------- */
/** Suggest district + area from the nearest existing parcel to a dropped pin. */
export function nearestDistrict(parcels: Parcel[], lat: number, lng: number) {
  let best: Parcel | null = null, bestKm = Infinity;
  for (const p of parcels) {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
    const d = haversineKm({ lat, lng }, p);
    if (d < bestKm) { bestKm = d; best = p; }
  }
  return best ? { district_ar: best.district_ar, district_en: best.district_en, area_of_city: best.area_of_city, km: Math.round(bestKm * 10) / 10 } : null;
}

/* ---------- offers ---------- */
/** Plain-Arabic reasons a parcel fits (or misses) an inquiry. */
export function matchReasons(parcel: Parcel, inquiry: Inquiry) {
  const ok: string[] = [], warn: string[] = [];
  if (parcel.area_of_city === inquiry.area_of_city_wanted) ok.push("في المنطقة المطلوبة"); else warn.push("خارج المنطقة المطلوبة");
  if (parcel.land_type === inquiry.land_type_wanted) ok.push(parcel.land_type === "commercial" ? "أرض تجارية كما طلب" : "أرض سكنية كما طلب"); else warn.push("نوع الأرض مختلف");
  if (parcel.listing_type === inquiry.prefers) ok.push(parcel.listing_type === "sale" ? "للبيع كما يفضّل" : "للإيجار كما يفضّل"); else warn.push("نوع الصفقة مختلف");
  const left = inquiry.budget_sar != null && parcel.total_price_sar != null ? inquiry.budget_sar - parcel.total_price_sar : null;
  if (left != null) (left >= 0 ? ok : warn).push(left >= 0 ? `ضمن الميزانية ويتبقى ${left.toLocaleString("en-US")} ريال` : `تتجاوز الميزانية بـ ${(-left).toLocaleString("en-US")} ريال`);
  if (/compound|مجمع/i.test(inquiry.wants_to)) (parcel.area_sqm >= COMPOUND_MIN_SQM ? ok : warn).push(parcel.area_sqm >= COMPOUND_MIN_SQM ? "مساحة تكفي لمجمع سكني" : `المساحة أقل من ${COMPOUND_MIN_SQM.toLocaleString("en-US")} م² اللازمة لمجمع`);
  return { ok, warn, budgetLeft: left };
}

/** Closest alternatives when nothing matches: same area & type, any deal/budget, cheapest first. */
export function closestAlternatives(parcels: Parcel[], inquiry: Inquiry, limit = 3) {
  return parcels
    .filter((p) => isAvailable(p) && isPriced(p) && p.land_type === inquiry.land_type_wanted)
    .sort((a, b) => Number(b.area_of_city === inquiry.area_of_city_wanted) - Number(a.area_of_city === inquiry.area_of_city_wanted) || (a.total_price_sar! - b.total_price_sar!))
    .slice(0, limit);
}

export const waitDaysOf = (i: Inquiry) => daysBetween(i.date, SNAPSHOT_DATE);

/** Data for the three "today" smart visuals: unanswered buyers, stagnant parcels, zero-stock segments. */
export function getTodayBriefs(parcels: Parcel[], inquiries: Inquiry[]) {
  const waiting = inquiries.filter((i) => i.status === "new")
    .map((i) => ({ id: i.inquiry_id, name: i.investor_name, area: i.area_of_city_wanted, type: i.land_type_wanted, budget: i.budget_sar ?? 0, wait: waitDaysOf(i) }))
    .sort((a, b) => b.budget - a.budget);
  const st = getStagnantBars(parcels, 5);
  const shortages = getSupplyDemandGaps(parcels, inquiries)
    .filter((g) => g.availableParcels === 0 && g.openInquiries > 0)
    .map((g) => ({
      area: g.area, landType: g.landType, waiting: g.openInquiries,
      budget: inquiries.filter((i) => i.status !== "closed" && i.area_of_city_wanted === g.area && i.land_type_wanted === g.landType).reduce((s, i) => s + (i.budget_sar ?? 0), 0),
    }))
    .sort((a, b) => b.waiting - a.waiting);
  return {
    waiting: { count: waiting.length, totalBudget: waiting.reduce((s, w) => s + w.budget, 0), medianWait: median(waiting.map((w) => w.wait)) ?? 0, top: waiting.slice(0, 3) },
    stagnant: { median: st.median, rows: st.rows, overDouble: parcels.filter(isAvailable).filter((p) => p.days_on_market > 2 * st.median).length },
    shortages,
  };
}

/** Days without a reply after which an open lead counts as at risk. */
export const LEAD_RISK_DAYS = 30;

/** Unanswered buyers with at least one available parcel that fits segment, deal, budget and size. */
export function getQuickWins(parcels: Parcel[], inquiries: Inquiry[], limit = 4) {
  const byId = new Map(parcels.map((p) => [p.parcel_id, p]));
  const rows = getActionableWaitingInquiries(parcels, inquiries)
    .filter((a) => a.matches.length && !a.flag)
    .map((a) => {
      const best = a.matches.map((id) => byId.get(id)!).sort((x, y) => x.total_price_sar! - y.total_price_sar!)[0]!;
      return { id: a.inquiry_id, name: a.investor_name, budget: a.budget_sar ?? 0, matches: a.matches.length, parcelId: best.parcel_id, district: best.district_ar, price: best.total_price_sar! };
    })
    .sort((a, b) => b.price - a.price);
  return { count: rows.length, value: rows.reduce((s, r) => s + r.price, 0), rows: rows.slice(0, limit) };
}

/** Open (not closed) leads waiting at least LEAD_RISK_DAYS since their inquiry date, oldest first. */
export function getLeadsAtRisk(inquiries: Inquiry[], limit = 5) {
  const rows = inquiries.filter((i) => i.status !== "closed")
    .map((i) => ({ id: i.inquiry_id, name: i.investor_name, status: i.status, budget: i.budget_sar ?? 0, wait: waitDaysOf(i) }))
    .filter((r) => r.wait >= LEAD_RISK_DAYS)
    .sort((a, b) => b.wait - a.wait || b.budget - a.budget);
  return { count: rows.length, budget: rows.reduce((s, r) => s + r.budget, 0), rows: rows.slice(0, limit) };
}

/* ---------- inquiries page briefs ---------- */
export const USE_AR: Record<string, string> = {
  "open a warehouse": "مستودع", "build a residential compound": "مجمّع سكني", "open a car showroom": "معرض سيارات",
  "build a family home": "بيت أسرة", "build apartments to rent": "شقق للإيجار", "open an office building": "مبنى مكاتب",
  "open a retail store": "محل تجزئة", "open a showroom": "معرض", "build villas to sell": "فلل للبيع",
};
export const INTENTS = ["ready to move", "comparing options", "exploring"] as const;
export const INTENT_AR: Record<string, string> = { "ready to move": "جاهز للتنفيذ", "comparing options": "يقارن خيارات", exploring: "يستكشف" };
export const STAGES = ["new", "contacted", "negotiating"] as const;
export const STAGE_AR: Record<string, string> = { new: "جديد", contacted: "تم التواصل", negotiating: "تفاوض" };
export const WAIT_BUCKETS = [
  { label: "≤ 7 أيام", min: 0, max: 7 }, { label: "8–30", min: 8, max: 30 },
  { label: "31–60", min: 31, max: 60 }, { label: "> 60 يومًا", min: 61, max: Infinity },
];

const fitsUse = (p: Parcel, i: Inquiry) =>
  isAvailable(p) && isPriced(p) && p.area_of_city === i.area_of_city_wanted && p.land_type === i.land_type_wanted &&
  p.listing_type === i.prefers && (!/compound|مجمع/i.test(i.wants_to) || p.area_sqm >= COMPOUND_MIN_SQM);

export function getInquiryBriefs(parcels: Parcel[], inquiries: Inquiry[]) {
  const open = inquiries.filter((i) => i.status !== "closed");
  const unanswered = open.filter((i) => i.status === "new");
  const waits = unanswered.map(waitDaysOf);
  const buckets = WAIT_BUCKETS.map((b) => ({ ...b, n: waits.filter((w) => w >= b.min && w <= b.max).length }));
  const matrix = INTENTS.map((intent) => ({ intent, cells: STAGES.map((stage) => open.filter((i) => i.intent === intent && i.status === stage).length) }));
  const uses = [...new Set(open.map((i) => i.wants_to))].map((use) => {
    const who = open.filter((i) => i.wants_to === use);
    const supply = parcels.filter((p) => who.some((i) => fitsUse(p, i))).length;
    return { use, label: USE_AR[use] ?? use, demand: who.length, supply, short: supply < who.length };
  }).sort((a, b) => b.demand - a.demand);
  const rank = (s: string) => INTENTS.indexOf(s as (typeof INTENTS)[number]);
  const top = unanswered
    .map((i) => ({ i, wait: waitDaysOf(i), matches: parcels.filter((p) => fitsUse(p, i) && (i.budget_sar == null || p.total_price_sar! <= i.budget_sar)).length }))
    .sort((a, b) => rank(a.i.intent) - rank(b.i.intent) || b.wait - a.wait).slice(0, 6);
  return {
    open: open.length, unanswered: unanswered.length, medianWait: median(waits) ?? 0,
    over30: waits.filter((w) => w > 30).length, over60: waits.filter((w) => w > 60).length,
    buckets, matrix, uses, top,
    comparingUnanswered: open.filter((i) => i.intent === "comparing options" && i.status === "new").length,
  };
}

/* ---------- performance page ---------- */

export interface FunnelStep { key: string; label: string; n: number; lost: number; lostNote: string | null }

/** Inquiry funnel: three hand-offs counted from the same rows, with what each one loses. */
export function getConversionFunnel(inquiries: Inquiry[]) {
  const counts = [
    inquiries.length,
    inquiries.filter((i) => i.status !== "new").length,
    inquiries.filter((i) => i.status === "negotiating").length,
  ];
  const meta = [["all", "كل الاستفسارات"], ["contacted", "تم التواصل"], ["negotiating", "تفاوض"]] as const;
  const steps: FunnelStep[] = meta.map(([key, label], i) => {
    const lost = i ? counts[i - 1]! - counts[i]! : 0;
    return { key, label, n: counts[i]!, lost, lostNote: lost && lost * 2 === counts[0] ? "نصف الوارد" : null };
  });
  const readyUnanswered = inquiries.filter((i) => i.status === "new" && i.intent === "ready to move").length;
  return {
    steps,
    readyUnanswered,
    note: "لا يضيع الطلب في التفاوض بل قبل أول ردّ:",
    noteStrong: `${readyUnanswered} ممّن لم يُردّ عليهم جاهزون للتنفيذ.`,
  };
}

export interface AreaClosingRow {
  area: Area; label: string; total: number; closed: number; rate: number; medianDays: number | null;
}

/** Share of each area's own holdings that reached sold/leased, with the closing speed beside it. */
export function getAreaClosing(parcels: Parcel[]) {
  const rows: AreaClosingRow[] = AREAS.map((area) => {
    const own = parcels.filter((p) => p.area_of_city === area);
    const closed = own.filter(isClosed);
    return {
      area, label: AREA_AR[area], total: own.length, closed: closed.length,
      rate: own.length ? Math.round((closed.length / own.length) * 100) : 0,
      medianDays: median(closed.map((p) => p.days_on_market)),
    };
  }).sort((a, b) => b.rate - a.rate);
  const best = rows[0] ?? null;
  const worst = rows[rows.length - 1] ?? null;
  const gapPoints = best && worst ? best.rate - worst.rate : 0;
  return {
    rows, best, worst, gapPoints,
    note: best && worst
      ? `${best.label} يغلق ${best.rate}% و${worst.label} ${worst.rate}% — فارق ${gapPoints} نقطة. و${worst.label} ليس بطيئًا حين يُغلق (${worst.medianDays ?? 0} يومًا)، بل نادرًا ما يُغلق أصلًا.`
      : "",
  };
}

export interface SegmentTimeRow {
  landType: LandType; dealType: DealType; label: string; n: number; medianDays: number | null; sufficient: boolean;
}

/** Median days to close per land type × deal type; the three-deal rule stays visible. */
export function getSegmentClosingTime(parcels: Parcel[]) {
  const rows: SegmentTimeRow[] = [];
  for (const landType of LAND_TYPES)
    for (const dealType of ["sale", "lease"] as DealType[]) {
      const closed = parcels.filter((p) => p.land_type === landType && p.listing_type === dealType && isClosed(p));
      rows.push({
        landType, dealType, label: `${LAND_AR[landType]} · ${DEAL_AR[dealType]}`, n: closed.length,
        medianDays: median(closed.map((p) => p.days_on_market)), sufficient: closed.length >= MIN_SAMPLE,
      });
    }
  rows.sort((a, b) => Number(b.sufficient) - Number(a.sufficient) || (a.medianDays ?? Infinity) - (b.medianDays ?? Infinity));
  const ok = rows.filter((r) => r.sufficient && r.medianDays != null);
  const fastest = ok[0] ?? null;
  const slowest = ok[ok.length - 1] ?? null;
  const diff = fastest && slowest ? Math.round(((slowest.medianDays ?? 0) - (fastest.medianDays ?? 0)) * 10) / 10 : 0;
  return {
    rows, fastest, slowest, diff,
    note: fastest && slowest
      ? `${fastest.label} يُغلق في ${fastest.medianDays} يومًا و${slowest.label} في ${slowest.medianDays} يومًا — فارق ${diff} يومًا في تدوير رأس المال.`
      : "",
  };
}

export interface PricingReviewRow {
  id: string; district: string; area: Area; landType: LandType; dealType: DealType;
  segment: string; segKey: string; deltaPct: number; days: number; medianDays: number;
  domMultiplier: number; totalPrice: number; pricePerSqm: number; medianPricePerSqm: number;
}

/** Available, priced lands that are both above their segment's median price and slower than its median close. */
export function getPricingReview(parcels: Parcel[]) {
  const rows: PricingReviewRow[] = getNegotiationCandidates(parcels)
    .filter((c) => (c.priceDeltaPct ?? 0) > 0 && (c.domMultiplier ?? 0) > 1 && c.parcel.total_price_sar != null)
    .map((c) => ({
      id: c.parcel.parcel_id, district: c.parcel.district_ar, area: c.parcel.area_of_city,
      landType: c.parcel.land_type, dealType: c.parcel.listing_type,
      segment: `${AREA_AR[c.parcel.area_of_city]} · ${LAND_AR[c.parcel.land_type]} · ${DEAL_AR[c.parcel.listing_type]}`,
      segKey: `${c.parcel.area_of_city}|${c.parcel.land_type}|${c.parcel.listing_type}`,
      deltaPct: Math.round(c.priceDeltaPct!), days: c.parcel.days_on_market,
      medianDays: c.segment.medianClosingDays!, domMultiplier: c.domMultiplier!,
      totalPrice: c.parcel.total_price_sar!, pricePerSqm: c.parcel.price_per_sqm_sar!,
      medianPricePerSqm: c.segment.medianPricePerSqm!,
    }))
    .sort((a, b) => b.deltaPct - a.deltaPct);
  const totalValue = rows.reduce((s, r) => s + r.totalPrice, 0);
  const counts = new Map<string, { label: string; n: number }>();
  for (const r of rows) {
    const e = counts.get(r.segKey) ?? { label: r.segment, n: 0 };
    e.n += 1;
    counts.set(r.segKey, e);
  }
  const top = [...counts.entries()].sort((a, b) => b[1].n - a[1].n)[0];
  const topSegment = top ? { key: top[0], label: top[1].label, n: top[1].n } : null;
  return {
    rows, count: rows.length, totalValue, topSegment,
    note: topSegment && rows.length > 1
      ? `${topSegment.n} من ${rows.length} في شريحة واحدة (${topSegment.label}) — فالمشكلة شريحة واحدة تُراجع مرّة، لا ${rows.length} أرضًا متفرقة.`
      : "",
  };
}
