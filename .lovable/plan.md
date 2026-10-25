# لوحة الفريق — Sarj Admin View

## Layout
- `/admin` becomes a layout with a right-hand RTL sidebar (mirrors the investor workspace): اليوم، المساعد، المحفظة (live count, 120)، أضف أرضاً، الاستفسارات (live "بلا رد" badge)، اعرض أرضاً، الأداء.
- Badges are computed live from `PortfolioProvider`, so adding SRE-121 or a new inquiry updates them right away.
- The existing team assistant moves into the المساعد page and stays available as a floating button on the other pages.

## Pages
1. **اليوم** (`/admin`)
   - 3 action cards, ordered by revenue: buy commercial land in the North (buyer count and largest budget), review the price of the stagnant northern parcels (>140 days, more than +20% over the median), and inquiries that a parcel already matches today (count and total budget).
   - 5 KPI cards, a diverging net demand vs supply chart (5 regions x residential/commercial), and a horizontal stagnant-lands chart with a median reference line.
2. **المحفظة**
   - Scatter plot of price/sqm delta vs days on market, with the stagnant quadrant shaded and counted.
   - Full table of all 120 parcels: sortable, searchable, filterable.
   - Quarantine cards for SRE-013 (no price) and SRE-098 (lat/lng were swapped, now corrected).
3. **أضف أرضاً**
   - Form pre-filled with SRE-121 النرجس. Total price is calculated automatically and read-only: 2,400 x 1,500 = 3,600,000.
   - Distance check against the Riyadh centre. Coordinates 24.4102, 46.9931 show a warning that the point is out of bounds (computed distance, about 27 km beyond the boundary).
   - Live impact preview before saving: the gap shifts (for example North commercial -8 to -7) and the form shows which of the waiting buyers the parcel matches. Saving pushes the parcel to both views.
4. **الاستفسارات**
   - Aging dot plot (days waiting per inquiry) and a 4-step funnel (new, contacted, viewing, closed).
   - Phone numbers are masked (0509•••). Pressing «الكشف» reveals the number and writes an audit-log entry (who and when) shown on the page.
   - Feasibility alert on INQ-035 نورة القحطاني: she wants a residential compound, but her matching plots are 306–400 sqm, below the 2,000 sqm a compound needs.
5. **اعرض أرضاً**
   - Choose a parcel and an inquiry, then see a match summary and a send action (records the offer in the inquiry's history).
6. **الأداء**
   - Monthly closed-deals bar chart (total shown) and a segment velocity bubble chart: median days on the x axis, price on the y axis, bubble size = number of deals. Segments with fewer than 3 deals are drawn hollow and labelled "عينة غير كافية".

## Numbers from the brief vs the data
Every figure is computed by the engine and never hard-coded. Earlier checks found differences from the brief: the median is 41.5 days, not 68, and 42 closed deals and 24 unanswered inquiries are still unverified. The build checks each figure. Where the data gives a different number, the page shows the engine's number and the summary lists each difference.

## Technical
- Routes: `admin.tsx` becomes the layout with `<Outlet/>`. New pages: `admin.index.tsx`, `admin.assistant.tsx`, `admin.portfolio.tsx`, `admin.add.tsx`, `admin.inquiries.tsx`, `admin.offer.tsx`, `admin.performance.tsx`, each with its own head().
- New pure module `src/lib/adminEngine.ts`: action cards, KPIs, stagnant quadrant, `previewParcelImpact(parcel)`, distance from bounds (haversine), aging, funnel, monthly closings, segment velocity, feasibility check. All of it reuses `portfolioEngine` and `sarjAgentTools`.
- Charts: hand-built SVG, in the same style as the footprint, using theme tokens.
- Provider additions: inquiry stage/offer history and a phone-reveal audit log (session state).
- Tests in `src/test/adminEngine.test.ts`: price 3,600,000; out-of-bounds warning for (24.4102, 46.9931); North commercial gap +1 after SRE-121; INQ-035 infeasible; stagnant count; the 3-deal minimum for velocity.
