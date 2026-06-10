# Marker learning field guide

Timestamp: 2026-06-09T09:00:42-0400

## Product slice

Marker learning no longer shows a dead chapter placeholder. The learn page now surfaces the existing taxonomy chapter data where available, adds marker examples and practice questions, and makes session occurrences more educational by showing rationale and severity.

## What changed

- `lib/taxonomy/index.ts`
  - Carries the existing `chapter` field from `book-entries.json` into `TaxonomyEntry`.
- `components/session/marker-learn-more.tsx`
  - Replaced the muted chapter placeholder with a real `Book field guide` card when a book chapter exists.
  - Uses a `Practice field guide` card for extra taxonomy entries that do not have book chapters.
  - Adds an `Example` section from taxonomy entries.
  - Adds a `Practice check` section with marker-type-specific review questions for fallacies, biases, and rhetoric.
  - Expands occurrence cards to include the detected quote, marker explanation, timestamp, and severity.
- `tests/learn-more.test.tsx`
  - Replaced placeholder assertions with product assertions for mapped book chapters, extra-entry practice cards, examples, practice questions, occurrence rationale, and severity.

## Verification

- `npx vitest run tests/learn-more.test.tsx tests/taxonomy.test.ts tests/wiki-slug.test.ts`
  - Passed: 3 files, 44 tests.
- `npx tsc --noEmit`
  - Passed.
- `npm run lint`
  - Passed with 18 existing warnings and 0 errors.
- `git diff --check -- lib/taxonomy/index.ts components/session/marker-learn-more.tsx tests/learn-more.test.tsx`
  - Passed.
- `npm run build`
  - Passed.
- `npm run test:run`
  - Passed: 146 files, 1,624 tests.

## Browser proof

Local server: `http://localhost:3000`

Desktop route:

- Opened `/session/learn/marker/slippery_slope`.
- Confirmed heading `Slippery Slope Fallacy`.
- Confirmed `Book field guide`.
- Confirmed `Chapter: Deficiency in Evidence Fallacies`.
- Confirmed taxonomy example text about increased cultural sensitivity.
- Confirmed `Practice check` and the fallacy question about the reasoning chain.
- Confirmed no old placeholder copy: no `Chapter mapping is not available` and no `Book chapter`.
- Confirmed `1` learning-path card, `2` reading links, `5` related-pattern links.
- Confirmed horizontal overflow delta `0`.

Mobile route:

- Set viewport to `390x844`.
- Opened `/session/learn/marker/loaded_language?demo=validation&sample=cable_008`.
- Confirmed heading `Loaded Language`.
- Confirmed `Practice field guide`.
- Confirmed rhetoric practice question about persuasive wording.
- Confirmed one real occurrence card with quote `dismiss as confusion or misinformation`.
- Confirmed occurrence rationale: `Pejoratively characterizes opposing explanations as dismissive, preemptively delegitimizing alternative interpretations of voter behavior.`
- Confirmed timestamp `00:33` and severity `subtle`.
- Confirmed `1` occurrence link and `6` related-pattern links.
- Confirmed horizontal overflow delta `0`.
- Confirmed console errors `0`.
- Reset viewport after proof.
