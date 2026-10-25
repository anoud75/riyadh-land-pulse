# Population Projection 2026 (GASTAT 2022 to August 2026)

## What the GASTAT data contains
The uploaded files and API links give population for the **Riyadh region as a whole**: 8,591,748 in 2022. Districts have no population figures, so district numbers will be estimates, split by district land area and clearly tagged «تقدير».

## What gets built
1. **Projection function** in the portfolio engine: `projectPopulationTo2026(base2022)` applies 2.5% yearly compound growth over 4 years:
   `Math.round(base2022 * Math.pow(1.025, 4))`.
   Riyadh 2022: 8,591,748 becomes about **9,483,654** for the August 2026 snapshot.
2. **District estimate**: each of the 189 districts gets a share of the projected Riyadh total based on its land area. Every value is tagged «تقدير · مبني على GASTAT 2022 ونمو 2.5% سنويًا».
3. **Where it shows**:
   - The site and living analysis cards show the district's estimated 2026 population.
   - The business score gains a small demand boost for districts with more people. The weight is fixed and covered by tests.
   - The district footprint population chart adds a 2026 projected point, marked as a projection.
   - District hover cards on the map show «السكان 2026 (تقدير)».
4. **Labels**: GASTAT figures for 2022 and earlier stay tagged GASTAT. Anything from 2023 to 2026 is tagged as a projection, never as GASTAT data.

## Limits
- Splitting by land area assumes even density, so dense central districts come out too low and large outer districts too high. The label says so.
- The growth rate is fixed at 2.5% as you specified. It is not a GASTAT figure.

## Technical details
- `src/lib/portfolioEngine.ts`: export `projectPopulationTo2026` and a `GROWTH_RATE_2026 = 0.025` constant.
- `src/lib/districtPopulation.ts` (pure): district polygon area (spherical shoelace), `districtPopulation2026(geo)` returning `{ id, name_ar, population, source: "estimate" }`, built from `GASTAT_POP[2022].riyadh`.
- `districtSeries.ts`: footprint series appends 2026 using the projection with source `estimate`.
- `siteSuitability.ts`: `scoreBusiness` takes an optional population factor (at most 15 points, scaled against the district median). `SiteResult` gains `population2026`. The analysis passes it through, and the agent receives it with the estimate note.
- `ChatMap` hover and `SuitabilityBlock` display the value with the «تقدير» tag.
- Tests: the function returns 9,483,654 for 8,591,748; the district estimates sum to the Riyadh total within rounding; the population boost is capped at 15.
- Update the AGENTS.md district-series rule: 2023–2026 population values are projections tagged as estimates.
