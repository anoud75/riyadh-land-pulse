# Site Suitability Layer ("Where should I open a hospital / café?")

Goal: when the user asks something like "I want to build a hospital in district X", the assistant finds nearby competitors, measures driving time to the closest one, combines that with district population, and gives a clear score and recommendation, plus a map and a chart. Available to investors and the team. Runs on Mapbox only, with no Google.

## What the user will see
- Ask in chat: "أبي أفتح مستشفى في النرجس" or "وين أفضل حي لكوفي؟"
- The assistant answers with:
  - A suitability card for each candidate district or parcel: nearest competitor and its driving time in minutes, the number of competitors within 10 minutes, population, and a score with a label (فرصة عالية / متوسطة / مشبعة).
  - A comparison chart that ranks districts by opportunity.
  - The map opens in the side panel with competitor pins, the chosen parcels, and a 10/20/30-minute driving-time area around the target.
  - A short Arabic explanation, e.g. "أقرب مستشفى يبعد 28 دقيقة والكثافة السكانية عالية، فرصة قوية".
- On the investor map: a new "منافسون" toggle with a business-type picker (مستشفى، صيدلية، كافيه، مدرسة، سوبرماركت، مطعم) that shows competitor pins and the driving-time area.

## How the score works (fixed and testable)
- Demand: district population (GASTAT series already in the app; districts without data are marked "تقدير").
- Supply gap: driving time to the nearest competitor, plus the number of competitors within 10 minutes.
- Score from 0 to 100, with weights for each business type (a hospital rewards long driving times more; a café rewards foot traffic and penalizes dense competition more).
- Shows "بيانات غير كافية" instead of a number when data is missing. It never invents figures.

## Limits to know
- Mapbox place coverage in Riyadh is thinner than Google's. Every result is labeled with its source ("Mapbox") and the count of places found.
- Driving times are typical-traffic estimates, not live traffic.
- Usage is metered, so lookups are capped (25 places per search, 25 points per time matrix) and cached per district and business type.

## Technical details
- `src/lib/placesProvider.server.ts`: Mapbox Search Box category search (`/search/searchbox/v1/category/{cat}` with proximity and bbox), Matrix API (`driving-traffic`) and Isochrone API. Called through the Mapbox connector gateway with the secret token. If the linked connection has only a public token, the user is asked to add a secret (sk.) token through the reconnect card.
- `createServerFn` wrappers in `src/lib/places.functions.ts` with zod-validated input (category enum, district or parcel id). Results are cached in memory by key, with bounded concurrency.
- Pure `src/lib/siteSuitability.ts`: score, label, ranking and category weights. Unit tests in `src/test/siteSuitability.test.ts` cover the weights, the missing-data case and the ordering.
- Agent: new `analyzeSite` tool in `sarjAgent.server.ts` (both modes; investor mode still never receives inquiries). It returns `uis` payloads: a new `suitability` card kind, plus a chart and a map command with `pois` and `isochrone`. `classifyScope` allows business-site questions as in scope.
- `agentUi.ts`: add `SuitabilityCard` and the `pois`/`isochrone` map fields. `ChatMap` and `ParcelMap` render competitor pins and the driving-time polygon.
- `investor.map.tsx`: competitor toggle and category picker.
- AGENTS.md rule: competitor and driving-time data come only from the places provider, and scoring is a pure function.
