# Product build evidence: detail re-check preserves analysis context

Date: 2026-06-09

## Slice

Manual claim detail re-check now uses the same verification context shape as the orchestrated first-pass verification.

## Changes

- Added `lib/client/analysis-context.ts` as the shared pure context builder for:
  - `sourceContextForPrompt(source)`
  - `claimContextForVerification(claim)`
  - `compactContextPairs(...)`
- Updated `lib/client/orchestrator.ts` to consume the shared helpers rather than owning a private verification-context builder.
- Updated `components/session/claim-detail.tsx` so the `Re-check` request to `/api/verify-confirmed` includes:
  - `claim_text`
  - `source_context`
  - `claim_context`
- Updated `tests/item-detail.test.tsx` so the detail re-check test asserts the request body preserves source document context and ownership/stance/attribution context.

## Why

Before this slice, initial verification carried source and attribution context, but manual re-check from the claim detail page sent only raw claim text. That could make a later user-triggered re-check less informed than the first analysis pass, especially for imported documents, quoted/reported claims, and attribution-sensitive claims.

## Verification

- `npx vitest run tests/item-detail.test.tsx tests/verify-ownership-context.test.ts tests/synthesis-ownership-context.test.ts`
- `npm run build:automation`
- `git diff --check`
- `npx tsc --noEmit`

Note: the first standalone `npx tsc --noEmit` attempt ran before `.next/types` had been regenerated and failed on missing generated Next type files. `npm run build:automation` regenerated those types successfully, and the subsequent `npx tsc --noEmit` passed.
