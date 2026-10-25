/// <reference types="geojson" />
import geoRaw from "@/data/riyadhDistricts.json";
import type { Parcel } from "@/data/types";
import { districtBounds, districtStats, findDistrict, type DistrictCollection } from "./districtStats";
import { isAvailable, isPriced, median } from "./portfolioEngine";
import { driveMinutes, isochrone, searchPlaces, type Poi } from "./placesProvider.server";
import * as S from "./siteSuitability";

const GEO = geoRaw as unknown as DistrictCollection;

export interface SiteAnalysis {
  useCase: S.UseCase; category: S.PlaceCategory | null; results: S.SiteResult[];
  pois: Poi[]; isochrone: GeoJSON.FeatureCollection | null; center: [number, number] | null; missing: string[];
}

export async function analyzeSite(parcels: Parcel[], input: { use_case: S.UseCase; category: S.PlaceCategory | null; districts: string[] }): Promise<SiteAnalysis> {
  const stats = districtStats(GEO, parcels, []);
  const riyadhMedian = median(parcels.filter(isPriced).map((p) => p.price_per_sqm_sar!));
  const results: S.SiteResult[] = []; const pois: Poi[] = []; const missing: string[] = [];
  let firstCenter: [number, number] | null = null;
  const category = input.use_case === "business" ? input.category ?? "hospital" : null;

  for (const name of input.districts.slice(0, 4)) {
    const f = findDistrict(GEO, name);
    if (!f) { missing.push(name); continue; }
    const st = stats.find((s) => s.id === f.properties.id)!;
    const [[x0, y0], [x1, y1]] = districtBounds(f);
    const center: [number, number] = [(x0 + x1) / 2, (y0 + y1) / 2];
    firstCenter ??= center;
    const pad = 0.06; const bbox: [number, number, number, number] = [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
    const base = { district: f.properties.name_ar, useCase: input.use_case, category, medianPpm: st.medianPpm, riyadhMedianPpm: riyadhMedian, parcelIds: st.parcelIds.filter((id) => { const p = parcels.find((x) => x.parcel_id === id); return p && isAvailable(p); }) };

    if (input.use_case === "business") {
      const found = await searchPlaces(category!, center, bbox);
      const mins = await driveMinutes(center, found.map((p) => [p.lng, p.lat]));
      const valid = mins.filter((m): m is number => m != null);
      const nearestMin = valid.length ? Math.min(...valid) : null;
      const within10 = valid.filter((m) => m <= 10).length;
      const sc = S.scoreBusiness(category!, { found: found.length, nearestMin, within10 });
      pois.push(...found.slice(0, 25));
      const reasons = found.length
        ? [`أقرب ${S.CATEGORY_AR[category!]} على بُعد ${nearestMin ?? "—"} دقيقة بالسيارة`, `${within10} منافسًا خلال 10 دقائق`, `${found.length} مكانًا وُجد في Mapbox حول الحي`]
        : [`لم يجد Mapbox أي ${S.CATEGORY_AR[category!]} حول الحي؛ قد تكون البيانات ناقصة`];
      if (base.parcelIds.length) reasons.push(`${base.parcelIds.length} أرض متاحة لدى سرج في الحي`);
      results.push({ ...base, ...sc, reasons, found: found.length, nearestMin, within10 });
    } else if (input.use_case === "living") {
      const lists = await Promise.all(S.LIVING_SERVICES.map((c) => searchPlaces(c, center, bbox)));
      const near = lists.map((l) => l.slice(0, 3));
      const flat = near.flat();
      const mins = await driveMinutes(center, flat.map((p) => [p.lng, p.lat]));
      let k = 0;
      const services: S.ServiceCheck[] = S.LIVING_SERVICES.map((c, i) => {
        const ms = near[i]!.map(() => mins[k++] ?? null).filter((m): m is number => m != null);
        return { category: c, label_ar: S.CATEGORY_AR[c], minutes: ms.length ? Math.min(...ms) : null, count: lists[i]!.length };
      });
      const sc = S.scoreLiving(services, st.medianPpm, riyadhMedian);
      pois.push(...flat);
      const far = services.filter((s) => s.minutes == null || s.minutes > 15).map((s) => s.label_ar);
      const reasons = [
        `${services.filter((s) => s.minutes != null && s.minutes <= 10).length} من ${services.length} خدمات خلال 10 دقائق`,
        far.length ? `أبعد أو غير موجود: ${far.join("، ")}` : "كل الخدمات الأساسية قريبة",
        st.medianPpm != null && riyadhMedian ? `وسيط سعر المتر ${st.medianPpm.toLocaleString("en-US")} ريال مقابل ${riyadhMedian.toLocaleString("en-US")} في الرياض` : "لا توجد صفقات كافية لسعر الحي لدى سرج",
      ];
      results.push({ ...base, ...sc, reasons, services, found: flat.length, nearestMin: null, within10: 0 });
    } else {
      const lists = await Promise.all(S.FOOTFALL_CATEGORIES.map((c) => searchPlaces(c, center, bbox)));
      const flat = lists.flat().slice(0, 24);
      const mins = await driveMinutes(center, flat.map((p) => [p.lng, p.lat]));
      const within10 = mins.filter((m) => m != null && m <= 10).length;
      const sc = S.scoreCommercial(within10, flat.length, st.avgDom);
      pois.push(...flat);
      results.push({ ...base, ...sc, reasons: [`${within10} مطعمًا وكافيه ومركز تسوق خلال 10 دقائق`, st.avgDom != null ? `متوسط أيام العرض في الحي ${st.avgDom} يومًا` : "لا أراضٍ متاحة لقياس سرعة البيع"], found: flat.length, nearestMin: null, within10 });
    }
  }
  const iso = firstCenter ? await isochrone(firstCenter) : null;
  return { useCase: input.use_case, category, results: S.rankResults(results), pois, isochrone: iso, center: firstCenter, missing };
}
