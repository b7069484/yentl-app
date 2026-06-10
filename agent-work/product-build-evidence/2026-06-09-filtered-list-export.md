# Filtered claims and markers export

Date: 2026-06-09

## Product gap

The flow atlas marks the claims list as needing real filter/sort/status
semantics plus bulk export, and the export surface expects Markdown/JSON/report
choices. The claims and markers list already filtered and sorted correctly, but
its download control was only an inert icon button.

## Changes

- Added an export menu to the filtered claims and markers list.
- Added Markdown export for the currently visible filtered claims or markers.
- Added JSON export with session title, source metadata, active filter title,
  generated timestamp, methodology link, AI-assisted flag, item count, and only
  the currently filtered items.
- Kept the mobile control compact with a 44px export trigger and 44px menu
  choices.
- Included source and publication-review caveats in Markdown so copied exports
  stay honest outside the app.

## Browser verification

Target:
`http://localhost:3000/session?demo=validation&sample=israel_010&view=claims`

Viewport: 390 x 844

Observed:

- One `Export filtered claims` button appeared on the rendered claims list.
- Expanding it showed one `Markdown` choice and one `JSON` choice.
- Mobile target heights:
  - `Export filtered claims`: 44px
  - `Markdown`: 44px
  - `JSON`: 44px
- The menu and header showed no horizontal overflow at 390px.

Note: Codex in-app Browser does not support download capture, so browser
verification stopped before clicking the file choices. The actual `downloadFile`
calls, filenames, MIME types, and filtered payload contents are covered by the
focused component tests.

## Verification

- `npx vitest run tests/filtered-list.test.tsx tests/filter-selectors.test.ts`
- Browser check at 390 x 844 for menu visibility, target sizing, and overflow
- `npm run build:automation`
- `npx tsc --noEmit` after `next build --webpack` regenerates `.next/types`
- `git diff --check`
