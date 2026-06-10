# Claims status filter

Date: 2026-06-09

## Product gap

The claims-list target calls for status semantics, filtering by status, still
checking states, and mobile filters. The list had verdict, speaker, topic, and
sort controls, but claim status was not a URL filter and `checking` claims were
always hidden from the list.

## Changes

- Added `status=checking|provisional|confirmed` parsing to the claims filter
  selector.
- Kept default `All claims` behavior stable by hiding `checking` claims unless
  the user explicitly filters for that status.
- Added a claims-list status filter control and active status chip.
- Preserved status context in claim-detail links via the existing `from=`
  context mechanism.
- Added row-level status text for non-confirmed claim rows.
- Added review status to filtered-list Markdown exports.
- Enlarged active filter chip remove buttons to 44px on mobile.

## Browser verification

Target:
`http://localhost:3000/session?demo=validation&sample=israel_010&view=claims&status=provisional`

Viewport: 390 x 844

Observed:

- The rendered title was `Provisional claims`.
- The page rendered 14 provisional claim rows from the validation sample.
- The active `Provisional` status chip was visible.
- Mobile target heights:
  - `Export filtered claims`: 44px
  - `Remove Provisional filter`: 44px
- The filtered claims route showed no horizontal overflow at 390px.

## Verification

- `npx vitest run tests/filtered-list.test.tsx tests/filter-selectors.test.ts`
- Browser check at 390 x 844 for status-filter title, row count, target sizing,
  and overflow
- `npm run build:automation`
- `npx tsc --noEmit`
- `git diff --check`
