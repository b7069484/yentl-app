# Product build evidence: quick-check duplicate detection

Date: 2026-06-09

## Slice

Claim-only quick check now detects when the user has already checked the same claim in the current session.

## Changes

- Added claim text normalization in `ClaimQuickCheckPane`.
- The pane now reads existing session claims and detects same-session duplicates despite punctuation/spacing differences.
- Duplicate claims show an existing-result notice.
- The duplicate state disables a new check and provides an `Open existing result` action to the existing claim detail route.
- Added a focused regression test proving duplicate input does not call the model or create a second claim card.

## Why

The complete flow spec requires a duplicate/recent-claim state for claim-only quick checks. Before this slice, the same standalone claim could be submitted repeatedly, creating duplicate cards and wasting verification calls.

## Verification

- `npx vitest run tests/claim-quick-check-pane.test.tsx`
- `npm run build:automation`
- `git diff --check`
- `npx tsc --noEmit`

Note: the first standalone `npx tsc --noEmit` attempt ran before `.next/types` had been regenerated and failed on missing generated Next type files. `npm run build:automation` regenerated those types successfully, and the subsequent `npx tsc --noEmit` passed.
