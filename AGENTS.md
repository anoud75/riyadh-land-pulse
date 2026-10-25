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
- District footprint is an overlay on /investor/map driven by the `footprint` search param; the old /investor/footprint route only redirects — keeps one live map.
- District footprint series use GASTAT tables baked into `src/data/districtSeries.ts` (price index + Riyadh population) with a per-value source tag — keeps every number traceable to سرج, GASTAT, or estimate.
- AI agents (`src/lib/sarjAgent.server.ts`) only phrase results; every number, chart, report and map command comes from pure tools in `src/lib/sarjAgentTools.ts` / `src/lib/agentViz.ts`, replies carry a `uis` payload list, `classifyScope` (`src/lib/agentScope.ts`) refuses off-topic and team-only questions before the model runs, and investor mode is never given inquiries — prevents invented figures, persona mixing and data leaks.
- Admin dashboard figures come from pure functions in `src/lib/adminEngine.ts` (built on portfolioEngine/sarjAgentTools); pages never hard-code brief numbers — keeps them live and testable.
