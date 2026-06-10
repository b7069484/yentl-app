# Detail dispute review flags

Timestamp: 2026-06-09T08:55:02-0400

## Product slice

Claim detail and marker detail no longer expose a dead-end `Dispute · coming soon` action. Both detail surfaces now let the user mark the item for human review, persist that review flag on the session item, and render a visible review panel.

## What changed

- `lib/types.ts`
  - Added a shared `ReviewFlag` type.
  - Added optional `review` metadata to `ClaimCard` and `RhetoricMarker`.
- `lib/client/session-store.ts`
  - Added `updateMarker(id, patch)` so marker detail can persist local corrections/review state.
- `components/session/review-flag-panel.tsx`
  - Added a shared review flag payload helper and human-review panel.
- `components/session/claim-detail.tsx`
  - Replaced disabled claim dispute placeholder with a real `Dispute` action.
  - Existing disputed claims render `Human review`, `Claim disputed`, and disable duplicate dispute as `Marked for review`.
- `components/session/marker-detail.tsx`
  - Replaced disabled marker dispute placeholder with the same review flow.
  - Existing disputed markers render `Human review`, `Marker disputed`, and disable duplicate dispute as `Marked for review`.
- `tests/item-detail.test.tsx`
  - Updated old placeholder expectations into behavioral tests for claim and marker review flags.

## Verification

- `npx vitest run tests/item-detail.test.tsx tests/session-store.test.ts tests/session-store-restore.test.ts`
  - Passed: 3 files, 73 tests.
- `npx tsc --noEmit`
  - Passed.
- `npm run lint`
  - Passed with 18 existing warnings and 0 errors.
- `npm run build`
  - Passed.
- `git diff --check -- lib/types.ts lib/client/session-store.ts components/session/review-flag-panel.tsx components/session/claim-detail.tsx components/session/marker-detail.tsx tests/item-detail.test.tsx`
  - Passed.
- `npm run test:run`
  - Passed: 146 files, 1,622 tests.

## Browser proof

Local server: `http://127.0.0.1:3000`

Claim route:

- Opened `/session/detail/claim/cable_008-claim-1?demo=validation&sample=cable_008`.
- Found exactly one `Dispute` button on the hydrated claim detail route.
- Clicked `Dispute`.
- Confirmed `review-flag-panel` text: `Human review`, `Claim disputed`, `Needs review`, and the claim review note.
- Confirmed button changed to disabled `Marked for review`.
- Confirmed horizontal overflow delta `0`.

Marker route:

- Opened `/session/detail/marker/cable_008-marker-1?demo=validation&sample=cable_008`.
- Found exactly one `Dispute` button on the hydrated marker detail route.
- Clicked `Dispute`.
- Confirmed `review-flag-panel` text: `Human review`, `Marker disputed`, `Needs review`, and the marker review note.
- Confirmed button changed to disabled `Marked for review`.
- Confirmed horizontal overflow delta `0`.
- Confirmed console errors `0`.
