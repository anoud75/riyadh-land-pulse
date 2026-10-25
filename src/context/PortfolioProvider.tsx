import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { initialInquiries, initialParcels } from "@/data";
import type { Inquiry, Parcel, RawInquiry, RawParcel } from "@/data/types";
import { cleanInquiry, cleanParcel, nextId } from "@/lib/portfolioEngine";

export type Role = "investor" | "admin" | null;

interface Ctx {
  parcels: Parcel[];
  inquiries: Inquiry[];
  addParcel: (p: Omit<RawParcel, "parcel_id"> & { parcel_id?: string }) => Parcel;
  addInquiry: (i: Omit<RawInquiry, "inquiry_id"> & { inquiry_id?: string }) => Inquiry;
  role: Role;
  setRole: (r: Role) => void;
  investorName: string;
  setInvestorName: (n: string) => void;
}

const PortfolioContext = createContext<Ctx | null>(null);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [parcels, setParcels] = useState<Parcel[]>(initialParcels);
  const [inquiries, setInquiries] = useState<Inquiry[]>(initialInquiries);
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

  const value = useMemo(
    () => ({ parcels, inquiries, addParcel, addInquiry, role, setRole, investorName, setInvestorName }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parcels, inquiries, role, investorName],
  );
  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error("usePortfolio must be used inside PortfolioProvider");
  return ctx;
}
