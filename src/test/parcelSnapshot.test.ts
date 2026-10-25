import { describe, expect, it } from "vitest";
import { circlePoints, encodePolyline, haloRadiusM, parcelRadiusM, snapshotUrl } from "@/lib/parcelSnapshot";

/** Decoder mirror of encodePolyline so the round trip is verified. */
function decodePolyline(s: string): [number, number][] {
  let i = 0, lat = 0, lng = 0;
  const out: [number, number][] = [];
  while (i < s.length) {
    const nums: number[] = [];
    for (let k = 0; k < 2; k++) {
      let shift = 0, res = 0;
      for (;;) {
        const b = s.charCodeAt(i++) - 63;
        res |= (b & 0x1f) << shift;
        shift += 5;
        if (b < 0x20) break;
      }
      nums.push(res & 1 ? ~(res >> 1) : res >> 1);
    }
    lat += nums[0]; lng += nums[1];
    out.push([lng / 1e5, lat / 1e5]);
  }
  return out;
}

describe("parcelSnapshot", () => {
  it("encodes the footprint circle so it round-trips back to the same points", () => {
    const pts = circlePoints(46.6753, 24.7136, 150);
    const decoded = decodePolyline(encodePolyline(pts));
    expect(decoded.length).toBe(33);
    for (let i = 0; i < pts.length; i++) {
      expect(Math.abs(decoded[i][0] - pts[i][0])).toBeLessThan(0.002);
      expect(Math.abs(decoded[i][1] - pts[i][1])).toBeLessThan(0.002);
    }
  });

  it("never draws a highlight smaller than the minimum radius", () => {
    expect(parcelRadiusM(null)).toBe(80);
    expect(parcelRadiusM(0)).toBe(80);
    expect(parcelRadiusM(5000)).toBe(80); // r ≈ 40 m — lifted to the minimum
    expect(parcelRadiusM(100000)).toBeCloseTo(Math.sqrt(100000 / Math.PI), 0);
  });

  it("grows the glow ring to stay visible, but shows a large parcel's real footprint", () => {
    expect(haloRadiusM(24.71, 15, 600, null)).toBeCloseTo(195, 0); // ~15% of image width across
    expect(haloRadiusM(24.71, 15, 600, 5000)).toBeCloseTo(195, 0); // tiny parcel → halo
    expect(haloRadiusM(24.71, 15, 600, 1_000_000)).toBeCloseTo(Math.sqrt(1_000_000 / Math.PI), 0); // 100 ha → real footprint
  });

  it("builds a static-map URL with pin and footprint path when a token exists", () => {
    const url = snapshotUrl({ lng: 46.6753, lat: 24.7136, area_sqm: 5000 }, { width: 600, height: 300 });
    if (url === null) return; // no token in this environment — the component shows the fallback
    expect(url).toContain("api.mapbox.com/styles/v1/mapbox/streets-v12/static/");
    expect(url).toContain("pin-s+7c3aed(46.67530,24.71360)");
    expect(url).toContain("path-2+7c3aed-0.85+7c3aed-0.18(");
    expect(url).not.toContain("enc:");
    expect(url).toContain("/46.67530,24.71360,15/600x300@2x");
    expect(url).toContain("access_token=");
  });
});
