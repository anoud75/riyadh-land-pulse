import type { Parcel } from "@/data/types";
import { getNegotiationCandidates, isAvailable, isPriced } from "./portfolioEngine";

export const SECTORS = [
  {
    key: "residential",
    title: "المجمعات السكنية والمشاريع الكبرى",
    body: "تحكمها كثافة السكان ووسيط سعر المتر في الشريحة وعدد أيام البيع فيها. فئات المعروض في الحي تسبق جودة الأرض نفسها.",
    weight: "وسيط الشريحة وأيام البيع",
    match: (p: Parcel) => isAvailable(p) && p.land_type === "residential",
  },
  {
    key: "logistics",
    title: "المستودعات والخدمات اللوجستية",
    body: "يحكمها عرض الشارع ومنفذ الشاحنات والقرب من المسارات التجارية. أرض بسعر متر منخفض وشارع ضيق ليست أرخص، بل غير صالحة.",
    weight: "عرض الشارع 36 مترًا فأكثر",
    match: (p: Parcel) => isAvailable(p) && p.land_type === "commercial" && p.street_width_m >= 36,
  },
  {
    key: "healthcare",
    title: "المستشفيات والمنشآت الصحية",
    body: "يحكمها عدد السكان داخل نطاق الوصول وزمن وصولهم، لا المسافة بالخط المستقيم، ويطرح النموذج من ذلك ما تخدمه المنشآت القائمة.",
    weight: "السكان داخل 15 دقيقة",
    match: (p: Parcel) => isAvailable(p) && p.land_type === "commercial" && p.area_sqm >= 2000,
  },
] as const;

/** Available parcels on market > 90 days and priced above their segment median. */
export function getStagnant(parcels: Parcel[]) {
  const list = getNegotiationCandidates(parcels).filter(
    (c) => isPriced(c.parcel) && c.parcel.days_on_market > 90 && (c.priceDeltaPct ?? 0) > 0,
  );
  return { count: list.length, total: list.reduce((s, c) => s + (c.parcel.total_price_sar ?? 0), 0) };
}
