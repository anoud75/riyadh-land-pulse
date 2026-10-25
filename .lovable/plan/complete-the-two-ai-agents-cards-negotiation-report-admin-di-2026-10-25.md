# Complete the two AI agents: cards, negotiation report, admin diagnosis, preloaded chats

## Already implemented (verified)
- Real LLM through Lovable Cloud AI (no external key needed), one server function with investor/admin modes.
- Investor mode never receives inquiries; all numbers come from pure tools.
- Tools: filterAndRankParcels, getParcelComparison, getSupplyDemandGaps, getActionableWaitingInquiries, getStagnantCapitalReport.
- Map assistant falls back to the rule-based analyst if AI fails.

## Missing — to build
1. **Structured ui_payload** returned with every reply: `{ kind: "cards" | "negotiation_report" | "diagnosis" | "table", parcelIds, filters, funnel? }`. Chat renders inline clickable parcel cards (e.g. SRE-086, SRE-081, SRE-092, SRE-091 by street width).
2. **New investor tool `getNegotiationMarginReport(budget, area, type)`**: funnel analyzed -> in budget -> recommended (top 3 by days-on-market multiplier). Rendered as split-screen report (تقرير هامش التفاوض) with a mini-map highlighting the 3 parcels.
3. **Investor context**: segment medians summary + district context fed via a `getMarketContext` tool (keeps numbers tool-sourced rather than free text in the prompt).
4. **محادثاتي becomes a real chat page**: sidebar list preloaded with the PDF scenarios (truck-access leases, negotiation report, comparison...), each opening its stored conversation; a "new chat" lets an evaluator ask anything live.
5. **Admin tool `diagnoseNorthMarket`**: North commercial stockout loss (sum of buyer budgets, buyer count, 0 inventory) vs North residential oversupply (parcels vs inquiries, median closing days, concession %).
6. **Waiting-buyer matching** explicitly lists excluded buyers with no inventory (e.g. سعد المطيري, wait days, North commercial) with the reason.
7. **مساعد الفريق** gets the same preloaded history sidebar from the PDF scenarios.

## Number policy
Brief figures (11 -> 9 -> 3; SRE-042 x2.5, SRE-052 x2.2, SRE-041 x2.2; 64.2M across 8 buyers; 24 vs 11; 96 days; 7.1%) are added as tests. Where the engine gives a different value, the engine's value is shown and the difference is reported — never forced.

## Technical details
- Supabase Edge Functions are not used; TanStack `createServerFn` + Lovable AI Gateway (gpt-6-astra, Responses API) as now.
- Extend `AgentResult` in `sarjAgent.server.ts` with `ui_payload`; tools populate it server-side (model cannot fabricate IDs).
- New components: `ChatParcelCards`, `NegotiationReport` (with small Leaflet map, client-only), shared `AgentChat` used by محادثاتي, map assistant, and مساعد الفريق.
- Preloaded scenarios stored in `src/data/chatScenarios.ts`, loaded into PortfolioProvider.
- Vitest tests per tool with the brief's values; PII test for investor payloads.
