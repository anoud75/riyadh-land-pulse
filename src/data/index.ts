import rawParcels from "./parcels.json";
import rawInquiries from "./inquiries.json";
import type { RawInquiry, RawParcel } from "./types";
import { cleanInquiry, cleanParcel, markStagnant, scaleMismatch } from "@/lib/portfolioEngine";

export const initialParcels = markStagnant((rawParcels as RawParcel[]).map(cleanParcel));
export const initialInquiries = (rawInquiries as RawInquiry[])
  .map(cleanInquiry)
  .map((i) => ({ ...i, scaleMismatchWarning: scaleMismatch(initialParcels, i) }));
