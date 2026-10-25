# Investor Workspace (واجهة المستثمر)

Replaces the current investor placeholder with a full workspace for the signed-in investor (e.g. العنود السميل). Every number comes from the live portfolio engine, so adding parcels or inquiries updates the screens straight away.

## Layout
- Right-hand RTL sidebar: logo, "محادثة جديدة +", search, and nav items with live counts:
  - الأراضي (available count, 62)
  - محادثاتي (5, sample conversation titles; the AI chat comes in the next step)
  - الخريطة (simple Riyadh dot map of parcels; SRE-098 uses the corrected position)
  - المقارنة (number of parcels in the comparison, starts with SRE-015, SRE-077, SRE-089 → 3)
  - استفساراتي (the investor's own inquiries, starts at 3)
  - Saved searches: مستودعات شرق الرياض، تجاري شمال الرياض، شارع 40 مترًا فأكثر (each applies its filters)
- Bottom: investor name + status. On narrow screens the sidebar collapses into a top menu.
- Comparison list and the investor's inquiries are kept in the shared store, so badges update everywhere.

## 1. الأراضي (land list) — `/investor`
- Greeting "أهلاً {first name} — ما الذي تنوين بناءه؟" with an intent text box and sector chips: مستودع، معرض سيارات، مجمع سكني، بيت عائلة، مكاتب، محل تجزئة، مطعم، مستشفى. Chips set filters (e.g. مستودع → commercial, wide street first; بيت عائلة → residential sale).
- Filter bar: available (62) / all (120) toggle, region, land type, sale/lease, max budget, minimum street width, sort (newest, price, street width, time on market). Parcels with no price never take part in price sorting.
- Featured wide card: الرمال SRE-015 — 58,214,000 SAR, 12,128 m², 60 m street, 128 days.
- 3-column grid of parcel cards (price, price/m², area, street, days, status). SRE-013 الحمراء shows "السعر غير مسجل — لا تدخل الترتيب بالسعر". Each card has "أضف للمقارنة".

## 2. Parcel detail — `/investor/parcels/$parcelId`
- Header with district, region, type, deal, price, key facts.
- "لماذا رُشّحت لك": price per m² vs segment median (SRE-015: +45% vs 3,300 SAR median of 9 closed deals) and days on market vs segment median closing days (128 vs 24). Segments with fewer than 3 closed deals show "عينة غير كافية" instead.
- "ما لم يتحقق منه": zoning and boundaries not verified with the authority; reach figures are estimates; flags for missing price / corrected coordinates when relevant.
- Nearby parcels: closest available parcels by distance (corrected coordinates).
- Actions: add to comparison, "استفسر عن هذه الأرض".

## 3. المقارنة — `/investor/compare`
- Matrix for the selected parcels (default SRE-015, SRE-077, SRE-089): price, price/m², area, street, days on market, segment median, price delta, time-on-market multiplier. Rows where "best" is meaningful get a marker.
- South Commercial Sale has only 1 closed deal, so its price delta shows "عينة غير كافية".
- Bottom "الخطوة التالية" advisory built from the numbers (e.g. which parcel has the most negotiation room, which segment lacks data).

## 4. Inquiry form — `/investor/inquire/$parcelId`
- "استفسارك عن أرض المناخ" (SRE-081), pre-filled: name, land type, region, sale/lease, budget 1,000,000 SAR per year, use (مستودع), intent.
- Shows remaining headroom: budget − annual rent = 1,000,000 − 713,000 = 287,000 SAR.
- Suggests a stronger fit for trucks: المنصورية SRE-086 (80 m street, 960,000 SAR/year, within budget), with "أضفها".
- "احفظه مسودة" and "إرسال الاستفسار". Sending creates the next inquiry number (INQ-068 as requested) in the shared store: it shows in استفساراتي and in the team dashboard right away.
- استفساراتي page (`/investor/inquiries`) lists the investor's inquiries with status.

## Technical details
- New engine helpers (pure, tested): `getParcelInsight(parcels, id)` (delta %, multiplier, sample flag), `getNearbyParcels`, `compareParcels(ids)`, `computeHeadroom(budget, parcel)`, `suggestAlternatives(inquiryDraft)`.
- Provider gains `compareIds`, `toggleCompare`, `myInquiryIds`; `addInquiry` accepts an explicit id. To match the brief, the first investor submission uses INQ-068 (the dataset's ids skip numbers; the highest in the file is INQ-048), later ones increment from there.
- The 3 starting "my inquiries" are sample entries tied to the investor (labelled as samples).
- Routes: `investor.tsx` becomes a layout with sidebar + `<Outlet />`; children `investor.index.tsx`, `investor.parcels.$parcelId.tsx`, `investor.compare.tsx`, `investor.inquire.$parcelId.tsx`, `investor.inquiries.tsx`, `investor.map.tsx`, `investor.chats.tsx`.
- Admin page gains a "latest inquiries" list so INQ-068 is visible there.
- Tests: SRE-015 +45% / 3,300 / 9 deals / 24 days; South commercial sale delta is insufficient; headroom 287,000; SRE-086 suggested; submitting adds INQ-068 visible to admin data.
