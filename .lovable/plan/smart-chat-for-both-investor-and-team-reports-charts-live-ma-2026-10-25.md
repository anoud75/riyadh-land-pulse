# Smart chat for both investor and team: reports, charts, live map, strict roles

## What you will get

1. **The team assistant gets the same look as محادثاتي**: a full page with the glowing orb, a large text box, starter cards, past chats grouped by date, rich parcel cards and a side panel. The small floating chat stays only as a shortcut on the other team pages.
2. **The assistant writes reports**: you can ask for "a report on the North" or "a negotiation margin report". It opens in the side panel with three tabs (الملخص، الجداول، المصادر), and you can download it as a PDF or print it.
3. **Charts inside the chat**: when you compare, the assistant draws a chart directly in its answer: bars comparing price and price per m², a gap chart showing demand against supply, a scatter of days on market against price change, and a timeline. Each chart has a short caption and its source.
4. **The map lives inside the chat**: the assistant opens a real map in the side panel and controls it on its own. It zooms into a district, zooms out to all of Riyadh, highlights the parcels it is talking about, draws an access radius (for example 15 minutes by car), and switches between the parcel layer and the district footprint. Asking "قرّب على الملقا" or "أرني كل الشمال" moves the map without leaving the chat. You can still pan and zoom by hand.
5. **No mixing between roles**:
   - **Investor (محلّل المواقع)**: talks only about parcels, prices, districts, comparisons and the user's own inquiries as a buyer. If asked about the team's work, for example "why are the inquiries stalled?", "which buyers are waiting?" or "what is the stockout loss?", it politely says this is outside its role and suggests a question it can answer.
   - **Team (مساعد الفريق)**: speaks as the internal sales team. A request like "أريد أرضًا تجارية في الشمال" is read as "which waiting buyers does this match, and what inventory do we have to offer them". It does not reply as if you were a buyer.
   - **Off-topic** (cooking, sports, general coding and the like): both assistants apologise briefly and say: "أنا أجيب فقط عن أراضي سرج في الرياض: البحث والمقارنة والأسعار والخريطة" (or the team version), then offer 3 suggestions.
6. **Starter questions for each role**: the team page gets its own starter cards and preloaded chats (North diagnosis, excluded buyers, stagnant capital, an offer report). The investor page keeps its own.

## Technical details

- **Shared workspace**: turn `ChatWorkspace` into a component that takes `mode: "investor" | "admin"`, with its sidebar links, greeting, starters and history set per mode. `/admin/assistant` renders it full-screen. The admin layout hides its sidebar on that page, the same way `investor.tsx` does. `AgentChat.tsx` is retired.
- **New `UiPayload` kinds** in `agentUi.ts`, all built by server tools so the model never invents numbers or IDs:
  - `chart`: `{ type: "bar" | "diverging" | "scatter" | "line", title, series, source }`
  - `report`: `{ title, sections: [{ heading, text, table?, chart? }] }`
  - `map`: `{ action: "focus" | "fit_all" | "highlight" | "radius" | "layer", center?, zoom?, parcelIds?, radiusKm?, layer? }`
  A reply can carry several payloads, so the type becomes `ui: UiPayload[]`.
- **New tools in `sarjAgentTools.ts`** (pure and tested): `buildComparisonChart`, `buildGapChart`, `buildReport(topic)`, `mapCommand(district|region|parcelIds|radius)`. District centres come from the existing parcel coordinates.
- **Map in the panel**: reuse `ParcelMap` behind `ClientOnly` with lazy loading. It takes a `command` prop and calls `flyTo`, `fitBounds` and its highlight and circle layers. Wheel and pinch zoom stay native.
- **Charts**: reuse the SVG charts in `components/admin/charts.tsx` and add a generic Bar/Line wrapper. Report export uses print CSS (`window.print` on the panel). No new library is needed.
- **Role guardrails** (three layers):
  1. **Prompt**: each system prompt opens with a scope block that defines the role, lists allowed and forbidden topics, and gives the exact refusal sentence.
  2. **Tools**: investor mode is still never given inquiry or team tools. Admin mode gets a "team framing" instruction.
  3. **Server pre-check**: a cheap keyword and intent check (`classifyScope`) runs before the model call. It returns the fixed refusal for off-topic questions and for team-only questions asked in investor mode, which saves credits and cannot be talked around.
- **Tests**: `classifyScope` (a cooking question is refused in both modes, "لماذا استفساراتي واقفة" from the team side is refused in investor mode, a parcel question is allowed), `mapCommand` (الملقا gives the right centre and zoom), plus chart and report builders that return real engine numbers.
- Update the AGENTS.md rule on agents to cover the scope guard and the multi-payload UI.
