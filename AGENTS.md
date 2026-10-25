<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Portfolio data lives in `src/data/*.json` and is cleaned on load; all analytics are pure functions in `src/lib/portfolioEngine.ts` — keeps numbers deterministic and testable.
- `PortfolioProvider` (src/context) is the single live store for parcels and inquiries; views derive stats from it so investor and admin views update together.
- Segments with fewer than 3 closed deals never expose medians — the analysis must not present one-deal numbers as facts.
- The investor map has no district-footprint overlay — it shows parcels and district shading only, so the map stays a single live view.
- District statistics use GASTAT tables baked into `src/data/districtSeries.ts` (price index + Riyadh population) with a per-value source tag — keeps every number traceable to سرج, GASTAT, or estimate. Population values after 2022 are projections (2.5% yearly from GASTAT 2022) tagged as estimates; district populations split the Riyadh total by district area.
- AI agents (`src/lib/sarjAgent.server.ts`) only phrase results; every number, chart, report and map command comes from pure tools in `src/lib/sarjAgentTools.ts` / `src/lib/agentViz.ts`, replies carry a `uis` payload list, `classifyScope` (`src/lib/agentScope.ts`) refuses off-topic and team-only questions before the model runs, and investor mode is never given inquiries — prevents invented figures, persona mixing and data leaks.
- Admin dashboard figures come from pure functions in `src/lib/adminEngine.ts` (built on portfolioEngine/sarjAgentTools); pages never hard-code brief numbers — keeps them live and testable.
- All maps use Mapbox GL JS (public connector token, lazy-loaded behind ClientOnly); land-card thumbnails are Mapbox Static Images built by pure `src/lib/parcelSnapshot.ts`; Riyadh district boundaries live in `src/data/riyadhDistricts.json` and per-district figures come from pure `src/lib/districtStats.ts` — one map engine, real boundaries, testable numbers.
- Investor maps never receive inquiries, so demand metrics (waiting/gap) are team-only — keeps buyer data out of the investor view.
- Investor parcel markers use React portals into Mapbox markers with screen-space label collision handling; marks represent locations, not cadastral boundaries — keeps controls accessible and avoids fabricated parcel shapes.
- Place and driving-time data come only from `src/lib/placesProvider.server.ts` (Mapbox via gateway); site scores are pure functions in `src/lib/siteSuitability.ts` — keeps scores testable and every place traceable to Mapbox.
- Aqar market benchmarks come only from `src/lib/marketEngine.ts` over the imported static sample; they are asking prices and never mixed with Sarj closed deals.
- Open place data (Overture) is a static Riyadh snapshot in `src/data/overturePlaces.json` with release + fetch date; it is merged with Mapbox only through `src/lib/openPlaces.ts` (75 m + name dedupe) and every place keeps its source.
- The investor agent replies as strict JSON `{prose, ui_action}`; `src/lib/agentQualify.ts` (pure) gates parcel recommendations until budget or size is known, drops ids no tool returned, and strips UI-label text — the UI renders cards from ui_action, never from prose.
- Comparison scores are pure min–max weighted averages in `src/lib/weightedCompare.ts`; missing values are skipped (weight renormalized), never zero-scored — keeps rankings fair and testable.
