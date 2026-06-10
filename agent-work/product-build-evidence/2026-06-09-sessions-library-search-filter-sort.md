# Sessions library search, filter, sort, and mobile rows

Date: 2026-06-09

## Product gap

The saved-sessions library needs to work as a real review surface once users
have more than a handful of local saves. The product plan calls for saved
session search, filtering, sorting, clear save-state handling, and mobile web
parity for library flows.

## Changes

- Added saved-session search across name, source, claim count, marker count,
  and speaker count.
- Added source filtering from the actual source kinds present in local saves.
- Added sorting by newest, oldest, name, most claims, and longest session.
- Added filtered-count copy, an empty filtered state, and a reset-view action.
- Updated saved-session rows for mobile with visible source/stats context,
  44px-friendly actions, and an explicit Resume action.
- Added explicit label targets for the search, source, and sort controls.

## Browser verification

Target: `http://localhost:3000/sessions`

Viewport: 390 x 844

Setup:

- Created a local snapshot from
  `http://localhost:3000/session?demo=validation&sample=cable_008&view=overview`.
- Saved it through the real Save local snapshot dialog.
- Opened the saved-sessions library.

Observed:

- Search, Source, and Sort controls each resolved to one accessible control.
- Source filter could select `youtube`.
- Sort could select `claims`.
- Searching for a non-matching term showed the empty filtered state.
- Reset library view restored search to empty, source to `all`, and sort to
  `recent`.
- Summary copy appeared: `Showing 1 of 1 local saves.`
- Privacy copy appeared: `Local saves live only in this browser.`
- Resume button measured 70px wide by 44px tall at mobile width.
- The temporary validation save was deleted after the verification pass.

## Verification

- `npx vitest run tests/sessions-library-page.test.tsx`
- `npm run build:automation`
- `npx tsc --noEmit` after `next build --webpack` regenerated `.next/types`
- `git diff --check`
