# Clearer, clickable team pages: charts, add-a-parcel map, and offers

## What you will get

### 1. One clear chart style everywhere (اليوم، المحفظة، الأداء)

All team charts are rebuilt in one clean, consistent style:

- Every chart gets a one-line "how to read this" sentence under its title, labelled axes with units, a small legend, and its source.
- **Hover** shows a card with the parcel or segment details. **Click** opens the parcel (or filters the list under the chart).
- Filter chips above each chart (area, land type, sale or lease) update the chart straight away.

### 2. المحفظة: "Price per m² vs median, against days on market"

This chart is currently hard to read. It becomes a clear chart:

- The horizontal axis is days on market (0, 30, 60, 90 and so on), with a dashed line at the 90-day stagnation limit.
- The vertical axis shows how much the price per m² is above (+) or below (−) the median of similar closed deals.
- The red top-right area is labelled "أغلى من السوق وراكدة — تحتاج مراجعة سعر", with a count.
- Clicking a dot highlights its row in the table and opens a small card. Next to the chart there is also a **map/chart switch**, so the same parcels can be seen on the map.

### 3. اليوم

- **Net supply vs demand**: clear bars for each area and land type (surplus on one side, shortage on the other), with numbers on the bars. Clicking one opens the matching waiting buyers and parcels.
- **Longest-listed parcels**: sorted bars with a line for the median days. Clicking a bar opens the parcel.

### 4. الأداء

- **Monthly closed deals**: labelled bars. Hover shows the month and count.
- **Segment chart**: renamed "سرعة البيع حسب الشريحة". A "segment" is spelled out as area + land type + sale or lease (for example "شمال · سكني · بيع"). The legend explains that bubble size means the number of closed deals, up = higher price per m², and right = slower closing. Segments with fewer than 3 deals sit in a separate, explained list ("لا نعرض وسيطًا لأقل من 3 صفقات"). Clicking a bubble shows that segment's parcels.

### 5. أضف أرضاً: add with a map pin

- A step-by-step form: details → location → review.
- Location: a **map where you drop or drag a pin**. The coordinates fill in automatically, and the district and area are suggested from the nearest parcels. A warning appears if the pin is outside Riyadh.
- An option to **send a location request to the landowner**. It creates a link the owner opens to drop the pin themselves, and the parcel stays "بانتظار الموقع" until they do.
- A live preview card shows the parcel as investors will see it, plus how it changes the gaps and matches.

### 6. اعرض أرضاً: a real offer screen

- **Right column**: waiting inquiries with the buyer's request, budget and days waiting.
- **Middle**: the matching parcels as full cards with photo-style placeholders, price, area, street width, budget fit ("يتبقى X ريال") and a reason for each match. Each also has a mini map.
- **Left**: an offer preview (the message the buyer will receive). You can pick one or more parcels, add a note, and press "أرسل العرض". When nothing matches, it says why and suggests the closest alternatives.
- The sent-offers log shows status.

## Technical details

- New shared chart kit (`components/admin/chartKit.tsx`): axes, ticks, legend, tooltip, a "how to read" caption and click handlers. Existing charts in `charts.tsx` are rewritten on top of it. They stay SVG, use theme tokens and have no new library.
- Click actions use the existing routes (for example `/admin/portfolio?focus=SRE-xxx`, `/admin/inquiries?segment=...`). Search params are added with validation.
- Map pin: a Leaflet map loaded only in the browser (same pattern as `ChatMap`), with a draggable marker. District and area are suggested by a pure `nearestDistrict(lat,lng)` in `adminEngine.ts`, which is tested.
- Location request: `requestLocation(parcelId)` in `PortfolioProvider` creates a pending parcel and a `/locate/$token` page with the pin map. It is kept in the browser only, like offers today (no persistence across refresh).
- The offer screen reuses `getActionableWaitingInquiries`, `getFeasibility` and `sendOffer` (extended to several parcels plus a note), and adds a pure `matchReasons(parcel, inquiry)` with tests.
- Tests: nearestDistrict, matchReasons, and filter chips leaving the chart counts consistent with the engine (for example 10 stagnant).  better arabuc languge ux writing 

## Open question

"إرسال طلب الموقع" will only create a link to share (by WhatsApp or by hand). Actually sending SMS or WhatsApp would need an outside service; it can be added later if wanted.