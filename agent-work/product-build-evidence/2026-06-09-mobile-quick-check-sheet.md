# Product build evidence: mobile quick-check sheet

Timestamp: 2026-06-09T08:44:23-0400

## Product slice

Claim-only quick check now has a mobile-first action sheet and direct source deep link.

Changes:

- Added `/session?source=claim` and `/session?source=quick-check` support.
- The source query selects the claim-only pane directly with `intent: "claim_only"`.
- Added a mobile-only quick-check action sheet with:
  - current state summary
  - character count
  - disabled/enabled submit state
  - duplicate-result state
  - checking/source-search state
- Made the main submit button full-width on mobile while preserving desktop sizing.

## Files touched

- `app/session/page.tsx`
- `components/session/ingest-panes/claim-quick-check-pane.tsx`
- `tests/claim-quick-check-pane.test.tsx`
- `tests/session-page.test.tsx`

## Verification

- `npx vitest run tests/claim-quick-check-pane.test.tsx tests/item-detail.test.tsx tests/session-page.test.tsx`
  - Passed: 3 files, 74 tests.
- `npx tsc --noEmit`
  - Passed.
- `npm run lint`
  - Passed with 0 errors and 18 existing warnings.
- `npm run build`
  - Passed.
- `git diff --check -- app/session/page.tsx components/session/ingest-panes/claim-quick-check-pane.tsx tests/claim-quick-check-pane.test.tsx tests/session-page.test.tsx`
  - Passed.

## Browser proof

Route:

- `http://127.0.0.1:3000/session?source=claim`

Mobile viewport:

- `390x844`

Initial state after route effect:

- Heading: `Check one specific claim`
- Sheet text: `Quick check Add a factual claim 0 / 2,000 characters Check`
- Sheet rect: `366x81`
- Main button rect: `316x48`
- Mobile sheet button rect: `69.21875x44`
- Mobile sheet button disabled: `true`
- Horizontal overflow: `0`

Ready state after entering a valid sample claim:

- Sheet text: `Quick check Ready to check 59 / 2,000 characters Check`
- Main button enabled: `true`
- Mobile sheet button enabled: `true`
- Horizontal overflow: `0`
- Console errors: `0`

## Why this matters

The complete flow plan still listed `mobile quick-check sheet` as missing. This slice makes claim-only checking usable as a direct mobile capture path instead of forcing users to scroll back to the primary button or start from the generic picker.
