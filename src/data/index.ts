import rawParcels from "./parcels.json";
import rawInquiries from "./inquiries.json";
import type { RawInquiry, RawParcel } from "./types";
import { cleanInquiry, cleanParcel } from "@/lib/portfolioEngine";

export const initialParcels = (rawParcels as RawParcel[]).map(cleanParcel);
export const initialInquiries = (rawInquiries as RawInquiry[]).map(cleanInquiry);
