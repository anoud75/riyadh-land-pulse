# Sarj Real Estate Intelligence Platform — PRD v2.0

Audited against the live engine on the 11 August 2026 data snapshot. Every figure below is printed by `src/lib/engineAudit.ts` in the browser console.

## 1. Thesis
Riyadh land decisions are made on impressions. Sarj turns a 120-parcel portfolio and 48 buyer inquiries into deterministic, traceable answers for two personas: the investor and the internal team.

## 2. Baseline figures (engine-verified)
- 120 parcels: 62 available, 42 closed (sold or leased).
- Overall median days on market for closed deals: 41.5 days.
- Stagnant capital: 12 available parcels worth 104,058,000 SAR sit above both their segment's closed median days on market and closed median price per sqm.
- North commercial: 8 inquiries with 19,844,000 SAR of combined budget against 0 available parcels.
- 24 of 48 inquiries (50%) are still unattended.
- Highest-priced available sale parcel: SRE-015 in Al-Rimal at 58,214,000 SAR.

## 3. Data hygiene firewall
- Riyadh bounding box 24.3°N–25.1°N, 46.4°E–47.1°E. Coordinates outside the box that fit once swapped are auto-corrected and flagged (SRE-098, Al-Hazm).
- Price quarantine: SRE-013 (Al-Hamra) has no price. It stays in the 120-parcel count and the catalog, but is excluded from every price ranking, chart and median.
- Small-sample suppression: a segment (area × land type × deal type) with fewer than 3 closed deals returns no medians (e.g. South commercial sale, 1 deal). Sale and annual lease prices are never mixed.
- Population: GASTAT 2022 projected to 2026 at 2.5% compound growth, tagged as an estimate.

## 4. Buyer-fit checks
- Scale mismatch: INQ-035 asks for a residential compound in North Riyadh with a 4.094M SAR budget; the in-budget plots are 306–450 sqm villa plots, below the 2,000 sqm compound threshold. The inquiry carries a scale-mismatch warning.
- Missing budgets are flagged on load; no inquiry in the current snapshot lacks one.

## 5. Scoring
- Comparison scores are min–max weighted averages. A missing value is skipped and the remaining weights are renormalized (w'k = wk / Σ valid w); it is never scored as zero.
- Site suitability covers business gaps, living quality and commercial footfall from Mapbox and Overture places plus district population.

## 6. Dual-agent architecture
- The AI only phrases results; every number, chart and map command comes from pure tools.
- Investor agent never receives inquiries, buyer names, phones or budgets. It asks for budget or size before recommending any parcel, and replies as `{prose, ui_action}` so interface labels never appear in chat text.
- Team agent sees parcels and inquiries and returns tool-built summaries and tables.
- Off-topic questions are refused before the model runs. All Arabic replies pass the editing guide.

## 7. What we chose not to build
- No login screen: a role switch keeps the demo frictionless; data separation is enforced in the agent tools, not by a session.
- No district footprint overlay on the team dashboard: one live map view avoids duplicated, conflicting visuals.
- No online payments: land transactions in Riyadh close offline through notarized contracts.

## 8. Known differences from earlier drafts
- Earlier drafts quoted 10 stagnant parcels worth 101.6M SAR. The audited definition yields 12 parcels worth 104,058,000 SAR.
- INQ-022 was cited as missing a budget; it has a 6,644,000 SAR budget.
