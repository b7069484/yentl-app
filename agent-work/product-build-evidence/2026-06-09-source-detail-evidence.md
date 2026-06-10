# 2026-06-09 Source Detail Evidence

## Product slice

- Added a first-class `source` detail type at `/session/detail/source/{claimId}__source__{sourceIndex}`.
- Claim detail and claim learn-more source cards now link into source detail.
- Source detail shows:
  - source title, URL, stance, reputation, and evidence score
  - source visual provenance or explicit no-thumbnail state
  - evidence quality breakdown
  - claim-word alignment
  - source excerpt
  - attached parent claim and verdict score
  - parent-claim navigation
- Switched the internal source-detail id separator from `:source:` to `__source__` after browser proof showed the colon-shaped route could land in the missing-item state.
- Fixed the session header brand link to keep a 44px mobile tap target after the mobile browser pass caught it at 33px.

## Files touched in this slice

- `components/session/source-detail.tsx`
- `components/session/source-card.tsx`
- `components/session/item-detail.tsx`
- `components/session/claim-detail.tsx`
- `components/session/claim-learn-more.tsx`
- `components/session/session-shell.tsx`
- `app/session/detail/[type]/[id]/page.tsx`
- `tests/item-detail.test.tsx`
- `tests/source-card.test.tsx`
- `tests/session-shell.test.tsx`

## Browser proof

Route used:

- `http://127.0.0.1:3000/session/detail/source/solo_005-claim-1__source__0?demo=validation&sample=solo_005`

Desktop/default viewport:

- Source detail visible: yes
- Source title visible: `WDI: A changing world population`
- Evidence quality visible: yes
- Evidence score visible: `38`
- Claim alignment visible: `world, population`
- Attached parent claim visible: yes
- Parent claim link target: `/session/detail/claim/solo_005-claim-1`
- Horizontal overflow: no (`documentWidth=1280`, `clientWidth=1280`)
- Visible text overflowers: none
- Console errors: none

Mobile viewport:

- Viewport: `390x844`
- Source detail visible: yes
- Source title visible: yes
- Evidence quality visible: yes
- Evidence score visible: `38`
- Claim alignment visible: yes
- Attached parent claim visible: yes
- Parent claim link target: `/session/detail/claim/solo_005-claim-1`
- Horizontal overflow: no (`documentWidth=390`, `clientWidth=390`)
- Visible text overflowers: none
- Short visible link/button targets below 44px: none
- Console errors: none
- Temporary viewport override was reset after verification.

## Gates

- `npm test -- tests/item-detail.test.tsx tests/source-card.test.tsx` passed: 2 files, 39 tests.
- `npm test -- tests/item-detail.test.tsx tests/source-card.test.tsx tests/session-shell.test.tsx` passed after the mobile header target fix: 3 files, 87 tests.
- `npx tsc --noEmit` passed.
- `npm run build` passed.
- `npm run test:run` passed: 146 files, 1603 tests.
- `npm run lint` exited 0 with existing warnings in unrelated files.

## Remaining product direction

This closes one required complete-flow gap: `Source detail` is no longer just a missing flow node. It does not complete the larger Yentl goal; source detail should eventually support richer source previews, saved-review comments, and source-detail entry points from more list surfaces.
