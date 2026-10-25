import type { diagnoseRegion } from "./sarjAgentTools";

/** Structured payload the agent returns next to its prose; built by tools on the server. */
export type UiPayload =
  | { kind: "cards"; parcelIds: string[] }
  | { kind: "negotiation_report"; funnel: { analyzed: number; in_budget: number; recommended: number }; parcelIds: string[]; multipliers: Record<string, number | null> }
  | { kind: "diagnosis"; data: ReturnType<typeof diagnoseRegion> }
  | { kind: "excluded"; rows: { inquiry_id: string; name: string; segment: string; wait_days: number }[] };
