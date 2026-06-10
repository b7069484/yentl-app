# Source Review View

Date: 2026-06-09

## Product Change

- Added a first-class `/session?view=source` workspace view for imported text, article, document, and caption sessions.
- Added a `Source` session tab only for text/document sessions.
- Linked the overview source card into the full source review view.
- Shows the original imported text as navigable source blocks with:
  - extraction type
  - source block count
  - anchored transcript-line count
  - anchored claim count
  - per-block transcript and claim counts
  - direct links into matching claim detail pages
  - a claim map sidebar
- Added shared-text title dedupe so mobile/share-target payloads do not duplicate `title + title + body`.
- Added conservative claim-placement correction for weak anchors:
  - title-like blocks no longer collect body claims just because upstream claim extraction inherited the title segment anchor.
  - body claims with very poor paragraph overlap move beside the stronger matching source block.

## Verification

- Focused tests:
  - `npx vitest run tests/source-review-view.test.tsx tests/session-page.test.tsx tests/session-shell.test.tsx tests/home-overview.test.tsx`
  - Result: 4 files passed, 100 tests passed.
- Production build, standalone typecheck, and diff hygiene:
  - `npm run build:automation && npx tsc --noEmit && git diff --check`
  - Result: passed.
  - Build output still includes `/session`, `/session/detail/[type]/[id]`, `/mobile`, and `/tv`.

## Browser Proof

- Opened a real shared text URL:
  - `http://127.0.0.1:3000/session?title=Yentl%20source%20review%20proof&text=...`
- Processed through the real text ingest pane.
- Landed on `/session?view=overview`.
- Overview showed:
  - `Source` tab in the session header.
  - `Review source` link in the source card.
- Clicked the header `Source` tab into `/session?view=source`.
- Desktop 1280x720 proof:
  - `source-review-view` rendered.
  - 3 source blocks rendered: `Title`, `Paragraph 1`, `Paragraph 2`.
  - Title block showed `0 claims`.
  - Paragraph 1 showed 3 body claims.
  - Paragraph 2 showed the audit-timeline claim.
  - No horizontal overflow.
  - Console error log was empty.
- Mobile 390x844 proof:
  - Same source blocks and claim placement rendered.
  - No horizontal overflow.
  - Console error log was empty.

## Remaining Product Gap

This makes source/metaview review a first-class session surface. It does not yet add paragraph click-to-highlight syncing with the transcript, reviewer notes on source blocks, or a full side-by-side article reader for remote web pages that have not been imported into `initial_text`.
