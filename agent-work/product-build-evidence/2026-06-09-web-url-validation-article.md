# Web URL Validation Article

Date: 2026-06-09

## Product slice

Web/article URL ingest now has a deterministic local validation path. Opening `/session?source=web-url` jumps directly to the article URL pane, and local validation builds expose `Load validation article`, which imports `http://localhost:3000/validation/yentl-synthetic-article.html` through `/api/article-ingest`, preserves article text as a `text_doc` web source, runs transcript/claim ingestion, and opens Overview.

This closes the prior proof gap where web/article ingest had parser and API coverage but no one-click browser-operable validation route.

## Files touched

- `public/validation/yentl-synthetic-article.html`
- `lib/server/validation-article-fixtures.ts`
- `app/api/article-ingest/route.ts`
- `components/session/ingest-panes/web-url-ingest-pane.tsx`
- `app/session/page.tsx`
- `lib/validation/fixtures.ts`
- `lib/client/text-ingest.ts`
- `components/session/home-overview.tsx`
- `tests/web-url-ingest-pane.test.tsx`
- `tests/api/article-ingest.test.ts`
- `tests/session-page.test.tsx`
- `tests/project-validation-page.test.tsx`
- `tests/text-ingest.test.ts`
- `tests/home-overview.test.tsx`

## Verification

- `npx vitest run tests/web-url-ingest-pane.test.tsx tests/api/article-ingest.test.ts tests/session-page.test.tsx tests/project-validation-page.test.tsx tests/source-router.test.tsx tests/text-ingest.test.ts tests/home-overview.test.tsx tests/source-review-view.test.tsx`
  - Passed: 8 files, 110 tests.
- Focused ESLint on changed source/test files.
  - Passed.
- `npm run build:automation`
  - Passed with webpack production build.
- `npx tsc --noEmit`
  - Passed.
- `git diff --check` on changed source/test/fixture files.
  - Passed.

## Runtime proof

- Browser, mobile viewport `390x844`, local dev server on `http://localhost:3000`:
  - Opened `/session?source=web-url`.
  - Confirmed the route rendered `Paste a page URL`, `Load validation article`, and the URL input with no horizontal overflow (`scrollWidth=390`, `clientWidth=390`).
  - Clicked `Load validation article`.
  - Confirmed Overview opened at `/session?view=overview`.
  - Confirmed article source `Yentl Validation Article`, origin `yentl-synthetic-article.html`, extracted article text, `2` reviewable utterances, and `3` claims after analysis catch-up.
  - Confirmed the imported article included both the library-budget claim and the Ridgeview school phone-locker claim.
  - Clicked `Review source`.
  - Confirmed Source view stayed inside the active session at `/session?view=source` instead of reloading into the source picker.
  - Confirmed Source view showed the article text, `16` source blocks, `2` anchored lines, and `5` anchored claims after claim extraction continued.
  - Browser console error log was empty.

## Quality fix discovered during proof

The first browser pass showed `Review source` used plain in-app anchors from Overview, causing a full page reload and loss of the in-memory session. The source-review buttons now use Next `Link` for in-app navigation, while the external origin link remains a normal anchor.

The first pass also showed compact articles could collapse into one long article utterance. `parseArticleText()` now defaults to smaller article chunks so source review and metaview preserve more article structure.

## Next gap

The next highest-impact product gap is direct media URL browser parity: add a one-click local validation URL path in the media URL pane, prove it reaches Watch with the deterministic WAV transcript, and verify mobile/source/export carryover from that route.
