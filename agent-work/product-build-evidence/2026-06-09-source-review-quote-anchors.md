# Source Review Quote Anchors

Date: 2026-06-09

## Product Change

- Added sentence-level source quote matching for claims mapped to imported text blocks.
- Source review now derives the best matching sentence inside a source block by claim/source token overlap.
- Source claim cards now show a `Source quote` preview instead of only paragraph-level context.
- Added mobile-safe `Highlight quote` controls for mapped claims.
- Selecting a quote now highlights the exact matching sentence inside the source text with a visible `mark`.
- The focused source rail also exposes quote previews and can jump back to the source block while activating a quote.

## Verification

- Focused lint:
  - `npx eslint components/session/source-review-view.tsx components/session/item-detail.tsx lib/client/sibling-nav.ts tests/source-review-view.test.tsx tests/item-detail.test.tsx`
  - Result: passed.
- Focused tests:
  - `npx vitest run tests/source-review-view.test.tsx tests/item-detail.test.tsx tests/filter-selectors.test.ts tests/filtered-list.test.tsx`
  - Result: 4 files passed, 108 tests passed.
- Production build:
  - `npm run build:automation`
  - Result: passed; `/session`, detail routes, `/mobile`, and `/tv` remain in the build output.
- Standalone typecheck:
  - `npx tsc --noEmit`
  - Result: passed.
- Diff hygiene:
  - `git diff --check`
  - Result: passed.

## Browser Proof

- Rendered a fresh text/document intake flow at 390px mobile viewport on `http://localhost:3000/session`.
- Used visible app flow:
  - staged dummy text.
  - clicked `Process transcript`.
  - opened Source review.
  - confirmed quote preview cards and quote highlight buttons rendered.
  - clicked a quote highlight button.
- Confirmed in the rendered DOM:
  - quote highlight button count: `5`.
  - source quote preview count: `5`.
  - active quote button count: `2` because the active claim appears in both block context and focused rail.
  - highlighted sentence text: `The city published the release log on Friday and said the update was available to the public.`
  - visible undersized quote-button target count: `0`.
  - viewport width: `390`; scroll width: `390`; horizontal overflow: `false`.

## Remaining Product Gap

Source review now supports sentence-level quote anchors, but it still needs character-offset persistence from ingestion and extraction so quote anchors survive edits/reloads without relying on best-match reconstruction.
