# Product build evidence: quick-check needs-context guard

Date: 2026-06-09

## Slice

Claim-only quick check now asks for context before checking ambiguous standalone claims.

## Changes

- Added a conservative needs-context guard in `ClaimQuickCheckPane`.
- Context-free claims with ambiguous references such as `he`, `she`, `they`, `it`, `this`, or `that` now stop locally and ask who/what the claim refers to.
- Context-free claims with relative time references such as `yesterday`, `today`, `recently`, or `last week` now ask for date/place/source/event context before checking.
- If the user provides context, the same claim shape can proceed through the existing quick-check verification flow.
- Added focused tests for both the blocked ambiguous case and the context-provided success case.

## Why

The complete flow spec requires too-vague/needs-context recovery for claim-only checking. Before this slice, any claim with at least three words could trigger verification, even when the model could not responsibly know who, what, or when the claim referred to.

## Verification

- `npx vitest run tests/claim-quick-check-pane.test.tsx`
- `npm run build:automation`
- `git diff --check`
- `npx tsc --noEmit`

Note: the first standalone `npx tsc --noEmit` attempt ran before `.next/types` had been regenerated and failed on missing generated Next type files. `npm run build:automation` regenerated those types successfully, and the subsequent `npx tsc --noEmit` passed.
