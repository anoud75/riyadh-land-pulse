# Lands search goes to the smart assistant + better «من أنت؟» page

## 1. Search box and suggestions on the lands page

- Typing a sentence and pressing send opens «المساعد الذكي» and sends that sentence automatically as the first message in a new chat.
- The suggestion chips (مستودع، معرض سيارات، مجمع سكني، بيت عائلة، مكاتب، محل تجزئة، مطعم، مستشفى) stop filtering the lands. Clicking one fills the search box with a ready sentence (for example: «أبغى أرض لمستودع في الرياض») and puts the cursor at the end so the investor can add budget or area, then send.
- Small label above the chips: «اقتراحات للسؤال» so it is clear they are questions, not filters.
- The filter bar below (المنطقة، النوع، البيع/الإيجار، الميزانية…) stays as the only way to filter the land list.

## 2. «من أنت؟» page redesign

- Cleaner, more premium layout: Sarj logo on top, short line under the title, two large balanced cards with a clear icon, title, one-line description and a full-width action button («ادخل كمستثمر» / « شيل تسجيل دخول الفريق»).
- Remove the empty space inside the cards, consistent black icons, more rounded corners, subtle hover lift.
- Keep the privacy note at the bottom, smaller and centered.

## Technical details

- `src/routes/investor.chats.tsx`: add `validateSearch` with optional `q`; pass `initialPrompt` to `ChatWorkspace`.
- `ChatWorkspace`: new `initialPrompt` prop; on mount, start a new chat and call `send(initialPrompt)` once (ref guard against StrictMode double-run), then clear `q` from the URL so reload does not resend.
- `src/routes/investor.index.tsx`: form navigates to `/investor/chats?q=…`; CHIPS become `{ label, prompt }` and set `intent` + focus the input.
- `src/routes/who.tsx`: visual-only rewrite using design tokens.