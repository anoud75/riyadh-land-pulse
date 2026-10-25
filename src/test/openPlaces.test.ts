import { describe, it, expect } from "vitest";
import { mergePlaces, placesInBbox, countBySource, type OpenPlacesFile, type SourcedPoi } from "@/lib/openPlaces";
import ov from "@/data/overturePlaces.json";

const mb = (name: string, lng: number, lat: number): SourcedPoi => ({ name, category: "cafe", lng, lat, source: "Mapbox" });
const o = (name: string, lng: number, lat: number): SourcedPoi => ({ name, category: "cafe", lng, lat, source: "Overture" });

describe("open places", () => {
  it("same café within 75 m with similar name counts once", () => {
    const r = mergePlaces([o("Barns", 46.6, 24.8)], [mb("barns", 46.6003, 24.8002)]);
    expect(r).toHaveLength(1); expect(r[0]!.source).toBe("Overture");
  });
  it("different name or > 75 m stays separate", () => {
    expect(mergePlaces([o("Barns", 46.6, 24.8)], [mb("Starbucks", 46.6003, 24.8)])).toHaveLength(2);
    expect(mergePlaces([o("Barns", 46.6, 24.8)], [mb("Barns", 46.602, 24.8)])).toHaveLength(2);
  });
  it("every place carries its source", () => {
    const f = ov as unknown as OpenPlacesFile;
    const list = placesInBbox(f, "hospital", [46.6, 24.7, 46.7, 24.8]);
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((p) => p.source === "Overture")).toBe(true);
    expect(countBySource([...list, mb("x", 0, 0)]).Mapbox).toBe(1);
    expect(f.release).toBe("2026-10-21.0");
  });
});
