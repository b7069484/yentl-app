# Product build evidence: claim detail Devil's Advocate panel

Date: 2026-06-09

## Slice

Claim detail now surfaces the existing session Devil's Advocate brief as a visible rigor layer under the claim.

## Changes

- Added a compact Devil's Advocate section to `components/session/claim-detail.tsx`.
- The panel renders:
  - brief stance
  - three strongest challenge points
  - weakest assumption
  - follow-up questions
  - queued/fresh/refreshing/error state badge
- Added item-detail regression coverage proving a populated claim detail renders the Devil's Advocate brief.

## Why

The complete flow spec requires Devil's Advocate under claim/detail views. Before this slice, the app could generate and export a Devil's Advocate brief, but populated claim detail did not expose that rigor layer where users audit an individual claim.

## Verification

- `npx vitest run tests/item-detail.test.tsx tests/claim-quick-check-pane.test.tsx`
- `npm run build:automation`
- `git diff --check`
- `npx tsc --noEmit`

Note: the first standalone `npx tsc --noEmit` attempt ran before `.next/types` had been regenerated and failed on missing generated Next type files. `npm run build:automation` regenerated those types successfully, and the subsequent `npx tsc --noEmit` passed.
