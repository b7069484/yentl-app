# Text Source Overview Review

Date: 2026-06-09

## Product Change

- Added a source-review card to the session overview for text/article/document sessions.
- Preserves the original pasted/imported source text as overview context after ingest.
- Shows extraction type, outline preview, anchored transcript count, and anchored claim count.
- Links directly from the overview into transcript and claims review.
- Shows an external original-source link when the session came from a web URL.

## Verification

- Focused tests:
  - `npx vitest run tests/home-overview.test.tsx tests/overview-selectors.test.ts tests/session-page.test.tsx`
  - Result: 3 files passed, 106 tests passed.
- Production build, standalone typecheck, and diff hygiene:
  - `npm run build:automation && npx tsc --noEmit && git diff --check`
  - Result: passed before this evidence file was added.

## Browser Proof

- Opened shared text route:
  - `http://127.0.0.1:3000/session?title=Yentl%20article%20overview%20proof&text=...`
- Processed the shared text through the real text-ingest UI.
- Landed on `http://127.0.0.1:3000/session?view=overview`.
- Source-review card rendered with:
  - `Pasted transcript`
  - `Plain text`
  - the pasted article text preview
  - `Paragraph 1` outline preview
  - `5` anchored transcript lines
  - `3` anchored claims
  - `Review transcript` and `Review claims` links
- Responsive proof:
  - 1280x720: card present, links intact, no horizontal overflow.
  - 390x844: card present, links intact, no horizontal overflow.

## Remaining Product Gap

This keeps article/text source context visible on the overview. It is not yet a full article-reader pane with paragraph-level highlighting, source excerpt jump targets, or side-by-side source/claim review.
