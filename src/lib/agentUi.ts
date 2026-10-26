/// <reference types="geojson" />
import type { diagnoseRegion } from "./sarjAgentTools";
import type { PlaceCategory, SiteResult, UseCase } from "./siteSuitability";

export interface ChartPoint { label: string; value: number; value2?: number; id?: string }
export interface ChartSpec { type: "bar" | "diverging" | "scatter"; title: string; unit: string; series: ChartPoint[]; xLabel?: string; yLabel?: string; source: string }
export interface ReportSection { heading: string; text: string; table?: { headers: string[]; rows: (string | number | null)[][] }; chart?: ChartSpec }
export interface MapPoi { name: string; category: PlaceCategory; lng: number; lat: number; source?: string }
export interface MapCommand {
  action: "focus" | "fit_all" | "highlight" | "radius"; center: [number, number]; zoom: number; parcelIds: string[]; radiusKm: number | null; label: string;
  /** Color districts by this metric (district-level view). */
  choropleth?: "available" | "median_ppm" | "waiting" | "gap" | "dom" | null;
  /** Outline and zoom to this district name. */
  district?: string | null;
  /** Nearby places (Mapbox) and 10/20-minute driving areas. */
  pois?: MapPoi[];
  isochrone?: GeoJSON.FeatureCollection | null;
}

/** Structured payload the agent returns next to its prose; built by tools on the server. */
export type UiPayload =
  | { kind: "matching"; rows: { inquiry_id: string; investor_name: string; segment: string; budget_sar: number | null; matches: string[]; flag: string | null; wait_days: number }[] }
  | { kind: "cards"; parcelIds: string[] }
  | { kind: "negotiation_report"; funnel: { analyzed: number; in_budget: number; recommended: number }; parcelIds: string[]; multipliers: Record<string, number | null> }
  | { kind: "diagnosis"; data: ReturnType<typeof diagnoseRegion> }
  | { kind: "excluded"; rows: { inquiry_id: string; name: string; segment: string; wait_days: number }[] }
  | { kind: "chart"; chart: ChartSpec }
  | { kind: "report"; title: string; sections: ReportSection[] }
  | { kind: "map"; command: MapCommand }
  | { kind: "suitability"; useCase: UseCase; category: PlaceCategory | null; results: SiteResult[]; source: string }
  | { kind: "market_insight"; parcelId: string };
