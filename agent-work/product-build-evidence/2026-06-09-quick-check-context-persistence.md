# Product build evidence: quick-check context persistence

Date: 2026-06-09

## Slice

Claim-only quick checks now preserve user-provided disambiguation context beyond the initial verification request.

## Changes

- Added optional `ClaimCard.source_context` for per-claim source/disambiguation context.
- Added `sourceContextForClaimVerification(...)` so manual re-checks combine the session source context with any claim-specific context.
- Updated claim detail re-check to send the durable claim-specific source context.
- Updated claim detail UI to show compact quick-check context when present.
- Updated the quick-check pane to:
  - persist the claim/context as `text_doc.initial_text` for claim-only sessions
  - store context on the created claim card
  - mark claim-only cards as asserted, with explicit no-speaker attribution metadata
  - send `claim_context` to both provisional and confirmed verification calls

## Why

Before this slice, the optional quick-check context helped the initial verification request, but it could be lost afterward. Later re-checks from the detail page could verify the same claim without the user's disambiguating note, making the result less reliable than the original check.

## Verification

- `npx vitest run tests/claim-quick-check-pane.test.tsx tests/item-detail.test.tsx tests/verify-ownership-context.test.ts tests/synthesis-ownership-context.test.ts`
- `npm run build:automation`
- `git diff --check`
- `npx tsc --noEmit`

Note: the first standalone `npx tsc --noEmit` attempt ran before `.next/types` had been regenerated and failed on missing generated Next type files. `npm run build:automation` regenerated those types successfully, and the subsequent `npx tsc --noEmit` passed.
