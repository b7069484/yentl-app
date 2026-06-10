# Persistent Source Quote Anchors

Date: 2026-06-09

## Product Change

- Extended `DocumentAnchor` with durable `char_start`, `char_end`, and `quote_text` fields.
- Text, article, and timed-text ingestion now persist source quote text and block-relative character offsets where available.
- Claim creation now narrows a broad segment anchor to the best matching sentence for the extracted claim.
- `/api/extract-claims` anchor schema and prompt context now preserve and expose character ranges and exact quote text.
- Source Review now prefers persisted quote offsets/text before falling back to fuzzy sentence matching.
- Shared quote matching now lives in `lib/source-evidence.ts` so ingestion, extraction, exports, and review can use one scoring model.

## Verification

- Focused tests:
  - `npx vitest run tests/source-evidence.test.ts tests/text-ingest.test.ts tests/claim-ownership-orchestrator.test.ts tests/source-review-view.test.tsx tests/extract-claims-ownership.test.ts tests/verify-ownership-context.test.ts`
  - Result: 6 files passed, 52 tests passed.
- Focused lint:
  - `npx eslint lib/types.ts lib/source-evidence.ts lib/client/text-ingest.ts lib/client/orchestrator.ts lib/prompts/extract-claims.ts components/session/source-review-view.tsx tests/source-evidence.test.ts tests/text-ingest.test.ts tests/claim-ownership-orchestrator.test.ts tests/source-review-view.test.tsx tests/extract-claims-ownership.test.ts tests/verify-ownership-context.test.ts`
  - Result: passed.
- Typecheck:
  - `npx tsc --noEmit`
  - Result: passed.
- Production build:
  - `npm run build:automation`
  - Result: passed; `/session`, detail routes, `/mobile`, and `/tv` remain in the build output.
- Diff hygiene:
  - `git diff --check`
  - Result: passed.

## Browser Proof

- Loaded `http://localhost:3000/session?view=source` at 390px in the in-app browser.
- Confirmed the mobile app surface loaded without horizontal overflow:
  - viewport width: `390`.
  - scroll width: `390`.
  - horizontal overflow: `false`.
- Direct seeded Source Review proof for persisted anchors was not completed in-browser:
  - the running browser bundle did not expose the dev-only `window.__yentl`/`window.__factify` session handle.
  - the browser evaluation sandbox did not expose IndexedDB writes for the saved-session restore path.
  - a second dev server on port `3001` was blocked by the browser surface and then exited because the existing Next dev server already owns this checkout.
- Persisted quote-anchor behavior is therefore covered by focused unit/integration tests, while browser coverage for this slice is limited to rendered mobile shell health.

## Remaining Product Gap

Persistent source quote anchors now survive typed session serialization and claim creation, but the browser proof path needs a deterministic fixture/restore affordance that does not depend on dev-only globals or browser IndexedDB writes.
