# Riyadh Land Pulse

management and analytical engine in src/data/ and src/lib/portfolioEngine.ts using all 120 parcels from sarj-lands-riyadh.json and 48 inquiries from investor-inquiries.json (snapshot 11 August 2026). 1) Build PortfolioProvider React Context holding all 120 parcels and 48 inquiries in state so adding SRE-121 or submitting inquiry INQ-068 updates both Investor and Admin views live. 2) Flag SRE-013 (Al Hamra) as missingPrice: true (keep in search, exclude from price sorting/medians/scatter), auto-swap inverted lat/lng for SRE-098 (Al Hazm) with coordinatesCorrected: true, and flag inquiries without budget (like INQ-022) as missingBudget: true. 3) Create getSegmentStats(area, landType, dealType) computing closed deals, median price/sqm, median closing days, and price concession %. Enforce: if closedDeals < 3, return insufficientSample: true and null medians. 4) Create getNegotiationCandidates computing daysOnMarket / segmentMedianDays multiplier and % price/sqm delta vs median. 5) Create Admin cross-matching engine computing net demand-supply gaps across all 5 regions x 2 land types.Prompt 2: هيكل التنقل والصفحة التعريفيةالصفحات 1، 2، 3 (الرئيسية، اعرض محفظتك، من أنت؟) 

بناء الشريط العلوي، ومبدل الواجهات الفوري، وصفحة النموذج السياقي للقطاعات.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://riyadh-land-pulse.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/77674e11-6cc9-4195-9a31-209f8f7c5967).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
