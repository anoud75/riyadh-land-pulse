# Step-by-step weighted comparison

Turn the comparison page into a guided 4-step flow, so you can take your time and see which land fits your priorities best.

```text
[1 الأراضي] → [2 المعايير] → [3 الأهمية] → [4 النتيجة]
```

## Steps

1. **الأراضي** — pick 2 to 5 lands (same list and limits as today). «التالي» stays disabled until at least 2 are chosen.
2. **المعايير** — tick the criteria to compare (location, price, market, population, services). Only criteria that can be ranked (e.g. price, price per m², size, street width, gap from median, population, each service) count toward the score; descriptive ones (district, type) appear in the table but are marked «للعرض فقط».
3. **الأهمية** — each chosen ranked criterion gets a weight slider from 0 to 5 (default 3), with words: غير مهم · مهم قليلًا · مهم · مهم جدًا · أساسي. A live bar shows each criterion's share of the total (e.g. السعر 30%).
4. **النتيجة**
  - A winner card at the top: «الأنسب لك حسب معاييرك: أرض SRE-xxx في حي …» with its match score out of 100 and the 2–3 reasons that made it win (its strongest weighted criteria).
  - A ranking of all chosen lands with score bars.
  - A breakdown table: for each criterion, every land's value, its points, and the weight — the best value highlighted.
  - Clear notes when a land is missing data (no price, sample too small): that criterion is skipped for it, not guessed, and the score says so.
  - Buttons: «عدّل الأهمية» and «ابدأ من جديد». لا يقدر يعدل الويت من الجدول دون الحاجه انه يرجع من اول جديد 

You can go back to any earlier step at any time; choices are kept.

## Technical details

- New pure module `src/lib/weightedCompare.ts`: min–max normalize each ranked criterion across the chosen lands (direction-aware: lower price is better), lands with missing values get no points for that criterion and the weight is re-normalized per land, score = weighted average × 100, plus top contributing criteria.
- Unit tests in `src/test/weightedCompare.test.ts`: lower price wins when price is the only weight; weight 0 removes a criterion; equal values give equal points; missing data excluded, not zero-scored.
- `src/routes/investor.compare.tsx` reuses the existing criteria rows (their `best`/`dir`) and adds a stepper UI; weights live in page state.
- Record the scoring rule in `AGENTS.md`.