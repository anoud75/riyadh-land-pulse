# Mapbox district-level map + market data from outside sources

## 1. Switch maps to Mapbox GL JS
- Connect Mapbox (you paste your public token once in a connect card; free tier is enough).
- Replace the current OpenStreetMap maps with Mapbox in: investor map, chat side-panel map, portfolio map toggle, add-land pin map, offer mini-maps.
- Keep every current behaviour: assistant zoom in/out and fly-to, clickable parcel dots, draggable pin, radius circle.

## 2. District level (الأحياء)
- Add Riyadh district boundary shapes (open data, about 190 districts) as a layer.
- Each district is colored by a metric you pick from a switch: available parcels, median price per m², waiting buyers, net gap (demand minus supply), days on market.
- Hover a district: name + its numbers. Click: zoom to it and list its parcels and waiting buyers.
- Zooming out shows districts; zooming in shows individual parcels.
- The assistant can say "highlight north districts by gap" and the map colors and zooms by itself.

## 3. About sa.aqar.fm/graphql
That address is Aqar's private, internal feed for their own app, not a public service. Pulling from it without their written permission likely breaks their terms and can be blocked at any time, so the plan does not connect to it automatically.

Data like theirs that would help Sarj:
- Asking prices per m² by district and land type: compare our prices with the market.
- Listing counts per district: real competing supply.
- Listing age: how long similar land sits unsold.
- Price changes over time: a market trend line.
- Street width, frontage, use (residential/commercial): better matching.

Safe ways to get this:
- If you get an agreement or API access from Aqar, I add a GraphQL connection on the server with their key, and the numbers show up as a "market" layer with a source tag "Aqar".
- Until then: use GASTAT and the Real Estate Registry / Ministry of Justice deal data, which are public.

## Technical details
- Mapbox via connector; browser uses `VITE_LOVABLE_CONNECTOR_MAPBOX_PUBLIC_TOKEN`; map components lazy-loaded behind ClientOnly (no SSR import).
- District GeoJSON in `src/data/riyadhDistricts.geojson`; district stats from a new pure function in adminEngine/portfolioEngine (tested).
- `mapCommand` gets `choropleth` + `focusDistrict` options.
- Optional future: `src/lib/marketSource.server.ts` server function with a GraphQL client, used only with an authorized key.
