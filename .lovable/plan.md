# Sarj — Portfolio engine + navigation & landing pages

Builds the data engine (Prompt 1) and the first three screens from the PDF (Prompt 2): Home, "Show your portfolio" request form, and "Who are you?" role picker. Arabic-first, RTL, matching the PDF look (white top bar, dark grid hero, violet accent, warm off-white body). Data stays in the browser for now (no backend), per the brief; the AI agent is a later step.

## 1. Data and engine
- Copy the two JSON files into `src/data/` (120 parcels, 48 inquiries, snapshot 11 Aug 2026).
- Clean-up on load:
  - SRE-013 (Al Hamra) → `missingPrice: true`; stays searchable, excluded from price sorting, medians, and scatter charts.
  - SRE-098 (Al Hazm) → lat/lng swapped back automatically, `coordinatesCorrected: true` (general rule: if lat looks like a longitude, swap).
  - Any inquiry with no budget (e.g. INQ-022) → `missingBudget: true`.
- `getSegmentStats(area, landType, dealType)`: closed deals (sold/leased), median price/sqm, median closing days, price concession %. If closed deals < 3 → `insufficientSample: true` and all medians `null`.
- `getNegotiationCandidates()`: for available parcels, days-on-market ÷ segment median days (e.g. ×2.5) and % price/sqm vs median; null when the segment sample is insufficient or price is missing.
- `getSupplyDemandGaps()`: 5 regions × 2 land types → available parcels, open inquiries, net gap (e.g. North Commercial 0 vs 8; North Residential +13 surplus).
- Small tests asserting these numbers: the SRE-013/098 and INQ-022 flags, the <3 sample rule (South Commercial Sale), the North gaps.

## 2. Live shared state
- `PortfolioProvider` (React Context) at the app root holding parcels + inquiries, with `addParcel` (next id SRE-121) and `addInquiry` (next id INQ-068 style). All engine results are derived from state, so Investor and Admin views update instantly.
- Current role (`investor` | `admin` | none) and investor name also kept in context (saved in the browser).

## 3. Top bar + instant view switcher
- Logo (uploaded Sarj mark, also set as favicon), links: النموذج السياقي، القطاعات، المنصة؛ "تسجيل الدخول" and violet "تحدّث مع فريقنا".
- Inside the platform, a compact switch "مستثمر / فريق سرج" swaps views immediately without reload.

## 4. Pages
- `/` Home: dark hero with stats computed live from the engine (120 parcels / 88 districts, 48 inquiries, 42 closed, median closing days), contextual-model section with the reach-ring illustration, three sector cards (residential compounds, warehouses/logistics, healthcare) with live matching-parcel counts, "what becomes measurable" figures, "analysis limits" notes, closing CTA.
- `/contextual-model` (القطاعات / النموذج السياقي): sector weights explained per sector, linking to segment analysis.
- `/portfolio-request` (اعرض محفظتك): form (name, company, email, optional phone, portfolio size chips, free-text question), "what happens next" 4 steps, direct contact block. Submits locally with a confirmation; not sent anywhere yet.
- `/who` (من أنت؟): two cards — باحث عن أرض → name step → investor area placeholder; فريق سرج → admin area placeholder. Investor/admin screens themselves come in the next prompt.

## Technical details
- Files: `src/data/parcels.json`, `src/data/inquiries.json`, `src/data/types.ts`, `src/lib/portfolioEngine.ts` (pure functions taking arrays), `src/context/PortfolioProvider.tsx`, `src/components/SiteHeader.tsx`, `ViewSwitcher.tsx`, routes `index.tsx`, `contextual-model.tsx`, `portfolio-request.tsx`, `who.tsx`, `who.name.tsx`, placeholder `investor.tsx`, `admin.tsx`.
- `<html dir="rtl" lang="ar">`, IBM Plex Sans Arabic + a mono for figures via link tag; design tokens in `styles.css` (ink, violet primary, off-white surface).
- Medians: standard median; concession % = (asking − closed)/asking where available, otherwise based on listed vs segment median — confirmed against data during build.
- Each route gets its own Arabic title/description metadata.
