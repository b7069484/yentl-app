# Product build evidence: claim-detail evidence status

Timestamp: 2026-06-09T08:37:24-0400

## Product slice

Claim detail now includes an `Evidence status` panel so quick-check and claim-result pages explain the state of the evidence, not only the verdict pill.

The panel distinguishes:

- `Still checking sources`
- `Provisional read`
- `Opinion, not a factual check`
- `No reliable backing found`
- `Contradicted by source evidence`
- `Supported by source evidence`
- `Mixed or caveated evidence`

It also summarizes cited-source balance as support / contradict / mixed, including explicit `0 cited sources` copy for provisional or no-backing states.

## Files touched

- `components/session/claim-detail.tsx`
- `tests/item-detail.test.tsx`

## Verification

- `npx vitest run tests/item-detail.test.tsx tests/claim-quick-check-pane.test.tsx`
  - Passed: 2 files, 46 tests.
- `npx tsc --noEmit`
  - Passed.
- `npm run lint`
  - Passed with 0 errors and 18 existing warnings.
- `npm run build`
  - Passed.

## Browser proof

Route:

- `http://127.0.0.1:3000/session/detail/claim/media-sync-claim-budget?demo=validation&sample=media_playback_sync`

Desktop proof:

- Panel visible.
- Text: `Evidence status`, `Provisional read`, `First read`, `0 cited sources`.
- Horizontal overflow: `0`.

Mobile proof:

- Viewport: `390x844`.
- Panel visible.
- Text: `Evidence status`, `Provisional read`, `First read`, `0 cited sources`.
- Panel width: `342px`.
- Horizontal overflow: `0`.
- Console errors: `0`.

## Why this matters

The complete flow spec requires standalone claim checks to show source-search state and result variants, including no-valid-backing and still-checking states. This slice makes the result screen more truthful: a missing source-backed result is explained as evidence quality, not as a final claim that reality is unknowable.
