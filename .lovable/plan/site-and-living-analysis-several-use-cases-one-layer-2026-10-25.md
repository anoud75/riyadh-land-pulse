# Site and Living Analysis (several use cases, one layer)

Goal: the assistant judges a district or parcel for whatever the user wants to do. It finds nearby places with Mapbox, measures driving times, adds district population and Sarj prices, and gives a clear score with a reason, a chart and a map.

## Use cases
Each case has its own checks and weights:

- **Open a business** (hospital, pharmacy, café, restaurant, school, supermarket, gym): finds competitors and asks whether there is a gap. Long drives to the nearest competitor, few competitors within 10 minutes and a high population score high.
- **Live there** (buy land for a home): finds services and asks whether the district has what daily life needs. It checks the drive to the nearest hospital, school, supermarket, mosque, pharmacy, park and café. Shorter drives and more services score high. Price per m² compared with the Riyadh median is part of the score (cheaper scores higher).
- **Invest or lease commercially**: looks at foot-traffic places nearby (restaurants, cafés, shops) plus street width and the parcel's days on market.

The assistant detects the case from the question:
- "أبي أفتح مستشفى في النرجس" → business, hospital
- "أبي أسكن في الملقا، هل فيه خدمات؟" → live there
- "قارن النرجس والياسمين للسكن" → live there, two districts

## What the user sees
- **Score card** per district or parcel: score from 0 to 100 and a label (فرصة عالية / متوسطة / مشبعة for business; ممتاز / جيد / ضعيف للسكن), plus 3 or 4 reasons in plain Arabic.
- **Living card**: a checklist of services with the drive time to each nearest one (e.g. مستشفى 6 دقائق، مدرسة 3 دقائق), the median price compared with Riyadh, and a link to the matching Sarj parcels.
- **Comparison chart** when there are several districts.
- **Map** in the side panel: place pins colored by type, the chosen parcels, and a 10/20-minute driving area.
- **Investor map**: a new "حولي" toggle with a picker (سكن / مستشفى / كافيه / ...) that shows the pins and driving area for the selected parcel.

## Honesty rules
- Every place count says "المصدر: Mapbox" and how many places were found. In some Riyadh areas Mapbox's place list is thin or the locations are approximate, so this is stated in the answer.
- Driving times are typical-traffic estimates.
- Missing data shows "بيانات غير كافية" instead of a number. The assistant never invents places or minutes.
- Investor mode still never sees buyer inquiries.

## Usage limits
Each search returns at most 25 places, and each time lookup covers at most 25 points. Results are cached per district and category to keep Mapbox costs low.

## Technical details
- `src/lib/placesProvider.server.ts`: Mapbox Search Box category, Matrix (driving-traffic) and Isochrone calls through the connector gateway (`MAPBOX_API_KEY` + `LOVABLE_API_KEY`). Responses are mapped to plain DTOs, cached in memory, with bounded concurrency.
- `src/lib/places.functions.ts`: createServerFn wrappers for the map toggle, with zod input.
- `src/lib/siteSuitability.ts`: a pure file holding the use-case definitions (categories and weights for business, living and commercial), plus `scoreBusiness`, `scoreLiving`, labels and ranking. Price comparison uses `districtStats`. Tests go in `src/test/siteSuitability.test.ts`: weights, missing data, ordering, and the living price factor.
- Agent: new `analyzeSite` tool with input `{ use_case, category?, districts[], parcel_ids? }` for both modes. It emits `suitability` / `living` cards, a chart and a map command with `pois` and `isochrone`. `classifyScope` lets living and business-site questions through.
- `agentUi.ts`: new card kinds plus `pois`/`isochrone` on MapCommand. ChatMap and ParcelMap render the pins and the polygon.
- AGENTS.md rule: place and drive-time data come only from the places provider; scoring is pure.
