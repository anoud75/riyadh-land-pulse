export const sar = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("en-US"));
export const pct = (n: number | null) => (n == null ? null : `${n > 0 ? "+" : ""}${n}%`);
export const STATUS_AR: Record<string, string> = {
  available: "متاحة",
  reserved: "محجوزة",
  sold: "مباعة",
  leased: "مؤجرة",
  new: "بانتظار الرد",
  contacted: "تم التواصل",
  negotiating: "قيد التفاوض",
};
