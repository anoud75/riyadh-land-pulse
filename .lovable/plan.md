# بصمة الحي فوق الخريطة نفسها

Match the recording: the footprint is drawn on top of the live map, not on a separate page.

## What the user will see
- On الخريطة, the "افتح بصمة الحي" button (and a new "بصمة الحي" mode in the top bar) no longer opens a new page. It switches the same map into footprint mode.
- The map flies and zooms to the chosen district. The district outline is highlighted in red, and the rest of the map is slightly faded.
- The three arms are drawn transparent over the map, centred on the district: price per m² (upper right), closed deals by days on market (upper left), population (bottom). A circular "lens" in the middle shows the district clearly.
- District name at the top, year selector (2019–2026) at the bottom. Changing the district moves the map and animates the arms; changing the year animates the bars.
- A small numbers panel at the side and a close (×) button to go back to the normal parcel map. Sidebar, filters and assistant stay where they are.
- The old /investor/footprint/... link redirects to the map in footprint mode, so existing links keep working.

## Technical details
- Add `mode: "parcels" | "footprint"` and `district` as search params on `investor.map.tsx`; the footprint route redirects there.
- New `FootprintOverlay` component: an absolutely positioned SVG layer over the Leaflet container (pointer-events off except controls), reusing `ThreeArmedFootprintSVG` with a transparent background and a circular cutout/lens.
- `ParcelMap` gets `focusDistrict`: flyTo the district centroid (from parcel coordinates), draw a highlight polygon (convex hull of the district's parcels, buffered) and dim the other layers.
- Bar transitions via CSS transitions on SVG rects/paths.
- Keep data honesty labels (illustrative 2019–2025 prices and population).
- Update the map/footprint test for the redirect and the district centroid.
