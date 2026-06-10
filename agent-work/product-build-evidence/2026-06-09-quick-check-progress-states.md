# Product build evidence: quick-check progress states

Date: 2026-06-09

## Slice

Claim-only quick check now exposes staged progress for the first read and the confirmed source-search pass.

## Changes

- Added a `CheckingStage` state to `ClaimQuickCheckPane`.
- The pane now shows a live status panel while checking:
  - `Building first read`
  - `Searching source evidence`
- The primary button label switches to `Searching sources` once the provisional read has completed and confirmed verification/source search is pending.
- Added a deferred-fetch regression test proving the intermediate source-search state is visible before confirmed verification resolves.

## Why

The complete flow spec requires source-search and still-checking states for claim-only quick check. Before this slice, the two-step verification flow was real, but the UI showed only a generic spinner-like `Checking claim` state.

## Verification

- `npx vitest run tests/claim-quick-check-pane.test.tsx`
- `npm run build:automation`
- `git diff --check`
- `npx tsc --noEmit`

Note: the first standalone `npx tsc --noEmit` attempt ran before `.next/types` had been regenerated and failed on missing generated Next type files. `npm run build:automation` regenerated those types successfully, and the subsequent `npx tsc --noEmit` passed.
