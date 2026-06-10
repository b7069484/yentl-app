# M3 Ownership Attribution UI Safety

Timestamp: 2026-06-09 22:11 EDT

## Scope

- Tightened claim ownership chips so unresolved attribution statuses do not render as named owners.
- Added a shared attribution label helper for claim/marker rows and detail views.
- Updated compact claim rows to show neutral unresolved ownership language instead of a speaker avatar/name when claim ownership is uncertain, unsafe overlap, quote/clip, or not available.
- Updated compact marker rows and marker detail context to show attribution status instead of a said-by shortcut when marker attribution is unsafe or unavailable.
- Updated claim detail context to show `Ownership` for unresolved claim ownership and `Owner` only for resolved confident/probable/manual-corrected ownership.

## Files

- `components/session/attribution-labels.ts`
- `components/session/ClaimCard.tsx`
- `components/session/claim-row.tsx`
- `components/session/marker-row.tsx`
- `components/session/filtered-list.tsx`
- `components/session/claim-detail.tsx`
- `components/session/marker-detail.tsx`
- `tests/claim-card-ownership.test.tsx`
- `tests/marker-attribution-ui.test.tsx`
- `tests/item-detail.test.tsx`

## Verification

- `npx tsc --noEmit` passed.
- `npm run lint` passed with 0 errors and the existing 18-warning baseline.
- `npm run test:run -- tests/claim-card-ownership.test.tsx tests/marker-attribution-ui.test.tsx tests/item-detail.test.tsx` passed: 3 files, 53 tests.
- `npm run test:run` passed: 148 files, 1653 tests.
- `npm run build:automation` passed.
- `npm run build` passed.

## Browser Proof

- Desktop Browser route: `http://127.0.0.1:3000/session?demo=validation&sample=media_playback_sync&view=claims`
  - Rendered 2 claim links.
  - No console errors.
  - No horizontal overflow.
- Desktop Browser detail route: `/session/detail/claim/media-sync-claim-platform-collapse?demo=validation&sample=media_playback_sync&view=claims`
  - Evidence status and action controls rendered.
  - Attribution context rendered as `Said by Moderator · 00:17` for legacy validation data.
  - No console errors.
  - No horizontal overflow.
- Mobile Browser viewport: 390x844.
  - Claims route rendered 2 claim links.
  - Detail route rendered evidence status and attribution context.
  - No console errors.
  - No horizontal overflow.
  - Browser viewport reset after proof.

## Notes

- Existing validation demo fixtures do not currently include claim ownership metadata, so unresolved ownership wording is locked by unit/integration tests rather than by the browser fixture.
- No automations, cron jobs, staging, commits, pushes, deployments, or dependency installs were performed.
