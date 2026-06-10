# Product build evidence: quick-check result routing

Date: 2026-06-09

## Slice

Claim-only quick check now lands on the specific claim result detail after verification completes.

## Changes

- Updated `ClaimQuickCheckPane` so successful quick checks route to `/session/detail/claim/{id}`.
- Confirmed-verification fallback still updates the claim as provisional, then lands on the same result detail.
- Updated quick-check tests to expect the result-detail route instead of the broader claims list.

## Why

The complete flow spec calls for a quick-result path with save/export actions and result-state review. The claims list is useful for browsing many claims, but a one-claim quick check should land on the result the user just requested, especially now that claim detail carries context, re-check, Devil's Advocate, save, and export actions.

## Verification

- `npx vitest run tests/claim-quick-check-pane.test.tsx`
- `npm run build:automation`
- `git diff --check`
- `npx tsc --noEmit`

Note: the first standalone `npx tsc --noEmit` attempt ran before `.next/types` had been regenerated and failed on missing generated Next type files. `npm run build:automation` regenerated those types successfully, and the subsequent `npx tsc --noEmit` passed.
