# الخريطة + بصمة الحي

## 1. الخريطة (interactive map) — replaces the current dot map
- Real map with react-leaflet, centred on Riyadh (24.7136, 46.6753), clean light tiles (CARTO Positron, no key needed).
- Every parcel plotted as a circle: size grows with area (m²), colour by status — للبيع blue, للإيجار teal, غير متاحة gray (sold/leased/reserved). SRE-098 uses its corrected position.
- Top layer switcher re-colours the circles:
  - مدة العرض (days on market, short → long)
  - نوع الصفقة (default: sale/lease/unavailable as above)
  - عرض الشارع (narrow → wide)
  - وسيط سعر المتر (price/m² vs segment median; segments with fewer than 3 closed deals and SRE-013 shown as "no data" gray)
  - A small legend explains the active layer.
- Selecting a parcel:
  - Draws 5 / 10 / 15-minute driving reach shapes around it.
  - Places competitor pins (منافس).
  - Opens a right-hand drawer: district, ID, price, area, street, days, segment median comparison (or "عينة غير كافية"), what is not verified, links to the parcel page, "أضف للمقارنة" and "افتح بصمة الحي".
- Map loads only in the browser (avoids server-render crashes).

## 2. بصمة الحي — `/investor/footprint/$district`
- District selector: الملقا، النرجس، الياسمين، قرطبة، الرمال، ظهرة لبن، العريجاء, and a 2019–2026 year slider.
- Custom `<ThreeArmedFootprintSVG />`: three arms from one centre at 120° apart.
  - Upper-right arm — price/m² 2019–2026, سكني blue vs تجاري purple; the selected year is highlighted.
  - Upper-left arm — closed deals by days on market (<30, 30–60, 60–90, 90–150, +150), بيع blue vs إيجار purple, with a median capsule only when the district has 3+ closed deals.
  - Lower arm — population pyramid by age band, ذكور blue vs إناث purple.
- Side panels next to the chart list the exact numbers for each arm (values per year, deal counts per bucket, population per band) and the source of each.

## Data honesty (important)
- Our records hold one snapshot (2026), not a 2019–2025 history, and no population figures. I'll:
  - Use real 2026 values from the portfolio wherever they exist (closed deals and days on market are fully real).
  - Fill 2019–2025 prices and the population pyramid with clearly labelled **illustrative** sample series (marked "بيانات توضيحية — ليست من الهيئة العامة للإحصاء") until real GASTAT / historical files are provided.
- Reach shapes and competitor pins are also estimates (no routing service connected) and are labelled as such.
- If you can share real price history or GASTAT district data, they can replace the samples without changing the screens.

## Technical details
- Add `leaflet` + `react-leaflet`; the map component is loaded lazily inside a browser-only wrapper; Leaflet CSS via a link tag.
- `src/lib/mapLayers.ts`: pure colour/size functions per layer (tested: status colours, radius scaling, SRE-098 corrected, insufficient-sample → gray).
- `src/lib/reach.ts`: deterministic reach polygons (irregular rings scaled by assumed speed, seeded by parcel ID) and deterministic competitor points.
- `src/data/districtSeries.ts`: illustrative price history + population pyramid per district, flagged `illustrative: true`; `getDistrictFootprint(parcels, district, year)` merges real deal buckets with the series.
- `ThreeArmedFootprintSVG.tsx`: polar geometry — arm angles −30°, 210°, 90° (SVG), bars laid along each arm via rotation; pure SVG, no chart library.
- Sidebar الخريطة link unchanged; drawer button navigates to the footprint for the parcel's district (falls back to الملقا when the district is not in the list).
