import type React from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { initialInquiries, initialParcels } from "@/data";
import type { Inquiry, Parcel, RawInquiry, RawParcel } from "@/data/types";
import { cleanInquiry, cleanParcel, nextId } from "@/lib/portfolioEngine";

export type Role = "investor" | "admin" | null;
export type MyInquiry = Inquiry & { parcel_id?: string; sample?: boolean };

/** Investor-submitted inquiries start numbering at INQ-068. */
const INVESTOR_ID_FLOOR = "INQ-067";

const SAMPLE_MY_INQUIRIES: MyInquiry[] = [
  { parcel: "SRE-015", d: "2026-08-02", st: "contacted", lt: "commercial", a: "East", pr: "sale", b: 60_000_000, w: "مستودع" },
  { parcel: "SRE-089", d: "2026-07-30", st: "new", lt: "commercial", a: "South", pr: "sale", b: 8_000_000, w: "مستودع" },
  { parcel: "SRE-042", d: "2026-07-21", st: "negotiating", lt: "residential", a: "North", pr: "sale", b: 5_000_000, w: "بيت عائلة" },
].map((s, i) => ({
  ...cleanInquiry({
    inquiry_id: `مسودة-${i + 1}`,
    date: s.d,
    investor_name: "",
    phone: "",
    wants_to: s.w,
    land_type_wanted: s.lt as Inquiry["land_type_wanted"],
    area_of_city_wanted: s.a as Inquiry["area_of_city_wanted"],
    prefers: s.pr as Inquiry["prefers"],
    budget_sar: s.b,
    budget_basis: "total purchase",
    intent: "comparing options",
    channel: "platform",
    status: s.st,
  }),
  parcel_id: s.parcel,
  sample: true,
}));

interface Ctx {
  parcels: Parcel[];
  inquiries: Inquiry[];
  addParcel: (p: Omit<RawParcel, "parcel_id"> & { parcel_id?: string }) => Parcel;
  addInquiry: (i: Omit<RawInquiry, "inquiry_id"> & { inquiry_id?: string }) => Inquiry;
  submitInvestorInquiry: (i: Omit<RawInquiry, "inquiry_id">, parcelId: string) => Inquiry;
  myInquiries: MyInquiry[];
  compareIds: string[];
  toggleCompare: (id: string) => void;
  role: Role;
  setRole: (r: Role) => void;
  investorName: string;
  setInvestorName: (n: string) => void;
  revealLog: RevealEntry[];
  revealPhone: (inquiryId: string) => void;
  offers: OfferEntry[];
  sendOffer: (inquiryId: string, parcelId: string, note?: string) => void;
  locationRequests: LocationRequest[];
  requestLocation: (parcelId: string, draft: LocationRequest["draft"]) => string;
  completeLocation: (token: string, lat: number, lng: number) => Parcel | null;
}

export interface RevealEntry { inquiry_id: string; by: string; at: string }
export interface OfferEntry { inquiry_id: string; parcel_id: string; at: string; note?: string | undefined }
export interface LocationRequest { token: string; draft: Omit<RawParcel, "parcel_id" | "lat" | "lng">; parcel_id: string; at: string; done: boolean }

// Keep one context object across hot reloads so live edits never orphan the provider.
const g = globalThis as { __sarjPortfolioCtx?: React.Context<Ctx | null> };
const PortfolioContext = (g.__sarjPortfolioCtx ??= createContext<Ctx | null>(null));

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [parcels, setParcels] = useState<Parcel[]>(initialParcels);
  const [inquiries, setInquiries] = useState<Inquiry[]>(initialInquiries);
  const [myInquiries, setMyInquiries] = useState<MyInquiry[]>(SAMPLE_MY_INQUIRIES);
  const [compareIds, setCompareIds] = useState<string[]>(["SRE-015", "SRE-077", "SRE-089"]);
  const [role, setRoleState] = useState<Role>(null);
  const [investorName, setNameState] = useState("");

  useEffect(() => {
    const r = localStorage.getItem("sarj.role") as Role;
    if (r === "investor" || r === "admin") setRoleState(r);
    setNameState(localStorage.getItem("sarj.name") ?? "");
  }, []);

  const setRole = useCallback((r: Role) => {
    setRoleState(r);
    if (r) localStorage.setItem("sarj.role", r);
    else localStorage.removeItem("sarj.role");
  }, []);
  const setInvestorName = useCallback((n: string) => {
    setNameState(n);
    localStorage.setItem("sarj.name", n);
  }, []);

  const addParcel: Ctx["addParcel"] = (p) => {
    const parcel = cleanParcel({
      ...p,
      parcel_id: p.parcel_id ?? nextId(parcels.map((x) => x.parcel_id), "SRE"),
    } as RawParcel);
    setParcels((prev) => [...prev, parcel]);
    return parcel;
  };
  const addInquiry: Ctx["addInquiry"] = (i) => {
    const inquiry = cleanInquiry({
      ...i,
      inquiry_id: i.inquiry_id ?? nextId(inquiries.map((x) => x.inquiry_id), "INQ"),
    } as RawInquiry);
    setInquiries((prev) => [...prev, inquiry]);
    return inquiry;
  };
  const submitInvestorInquiry: Ctx["submitInvestorInquiry"] = (i, parcelId) => {
    const id = nextId([...inquiries.map((x) => x.inquiry_id), INVESTOR_ID_FLOOR], "INQ");
    const inquiry = addInquiry({ ...i, inquiry_id: id });
    setMyInquiries((prev) => [{ ...inquiry, parcel_id: parcelId }, ...prev]);
    return inquiry;
  };
  const toggleCompare = (id: string) =>
    setCompareIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(-5)));
  const [revealLog, setRevealLog] = useState<RevealEntry[]>([]);
  const [offers, setOffers] = useState<OfferEntry[]>([]);
  const revealPhone = (inquiry_id: string) =>
    setRevealLog((prev) => [{ inquiry_id, by: "فريق سرج", at: new Date().toISOString() }, ...prev]);
  const sendOffer = (inquiry_id: string, parcel_id: string, note?: string) =>
    setOffers((prev) => [{ inquiry_id, parcel_id, at: new Date().toISOString(), note }, ...prev]);
  const [locationRequests, setLocationRequests] = useState<LocationRequest[]>([]);
  const requestLocation: Ctx["requestLocation"] = (parcel_id, draft) => {
    const token = Math.random().toString(36).slice(2, 10);
    setLocationRequests((prev) => [{ token, draft, parcel_id, at: new Date().toISOString(), done: false }, ...prev]);
    return token;
  };
  const completeLocation: Ctx["completeLocation"] = (token, lat, lng) => {
    const r = locationRequests.find((x) => x.token === token && !x.done);
    if (!r) return null;
    setLocationRequests((prev) => prev.map((x) => (x.token === token ? { ...x, done: true } : x)));
    return addParcel({ ...r.draft, parcel_id: r.parcel_id, lat, lng });
  };

  const value = useMemo(
    () => ({
      parcels, inquiries, addParcel, addInquiry, submitInvestorInquiry, myInquiries,
      compareIds, toggleCompare, role, setRole, investorName, setInvestorName,
      revealLog, revealPhone, offers, sendOffer, locationRequests, requestLocation, completeLocation,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parcels, inquiries, myInquiries, compareIds, role, investorName, revealLog, offers, locationRequests],
  );
  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error("usePortfolio must be used inside PortfolioProvider");
  return ctx;
}
