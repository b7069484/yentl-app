# Quick-check recovery routing

Timestamp: 2026-06-09T08:49:19-0400

## Product slice

Quick-check verification failures now preserve the created claim card and route the user to a retryable result detail instead of leaving the failure stranded on the intake form.

## What changed

- `components/session/ingest-panes/claim-quick-check-pane.tsx`
  - When `/api/verify-provisional` fails after a quick-check claim has been created, the claim is updated to a provisional recovery state.
  - The recovery claim uses `primary_label: "UNVERIFIABLE"`, score `0`, annotation `Verification interrupted`, no sources, and the API failure message as the explanation.
  - The user is routed to `/session/detail/claim/{id}` so the claim remains visible and can be rechecked.
- `components/session/claim-detail.tsx`
  - Claim detail now treats the `Verification interrupted` annotation as a recovery state.
  - The evidence panel shows `Verification needs retry`, mode `Recovery`, source summary, and directs the user to use Re-check after the connection or rate limit clears.
- `tests/claim-quick-check-pane.test.tsx`
  - The rate-limit case now asserts the created claim is converted into a retryable recovery result and navigates to detail.
- `tests/item-detail.test.tsx`
  - Added claim-detail coverage for the interrupted verification recovery panel and visible retry message.

## Verification

- `npx vitest run tests/claim-quick-check-pane.test.tsx tests/item-detail.test.tsx tests/session-page.test.tsx`
  - Passed: 3 files, 75 tests.
- `npx tsc --noEmit`
  - Passed.
- `npm run lint`
  - Passed with existing warnings only.
- `npm run build`
  - Passed.
- `git diff --check -- components/session/ingest-panes/claim-quick-check-pane.tsx components/session/claim-detail.tsx tests/claim-quick-check-pane.test.tsx tests/item-detail.test.tsx`
  - Passed.

## Browser proof

No browser proof was run for this exact recovery branch because the app does not currently expose a deterministic local fixture for forcing `/api/verify-provisional` to fail after claim creation. The recovery path is covered by focused component tests and the production build. The adjacent quick-check mobile surface was browser-proved in `2026-06-09-mobile-quick-check-sheet.md`.
