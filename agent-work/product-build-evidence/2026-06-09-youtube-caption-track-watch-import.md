# YouTube Caption Track Watch Import

Date: 2026-06-09

## Product slice

The YouTube validation path now has a real recovery path when the embedded player does not advance. After `/session?source=youtube` and `Load validation YouTube` arm the caption track, `Analyze caption track` imports the timed captions through the same `bulkIngest` pipeline used by prepared transcript/media flows and opens Watch.

This closes the previous proof gap where YouTube ingest could arm 241 deterministic captions but browser validation still depended on the YouTube iframe playhead moving.

## Files touched

- `components/session/ingest-panes/youtube-ingest-pane.tsx`
- `lib/validation/fixtures.ts`
- `tests/youtube-ingest-pane.test.tsx`

## Verification

- `npx vitest run tests/youtube-ingest-pane.test.tsx tests/source-router.test.tsx tests/project-validation-page.test.tsx tests/session-page.test.tsx tests/api/youtube-ingest.test.ts tests/youtube-validation-fixtures.test.ts tests/watch-view.test.tsx`
  - Passed: 7 files, 105 tests.
- Focused ESLint on changed source/test files.
  - Passed.
- `npx tsc --noEmit`
  - Passed.
- `npm run build:automation`
  - Passed with webpack production build.
- `git diff --check` on changed source/test files.
  - Passed.

## Runtime proof

- Browser, mobile viewport `390x844`, local dev server on `http://127.0.0.1:3000`:
  - Opened `/session?source=youtube`.
  - Confirmed the YouTube pane rendered directly with `Load validation YouTube`.
  - Clicked `Load validation YouTube`.
  - Confirmed the input became `https://www.youtube.com/watch?v=fTznEIZRkLg`.
  - Confirmed `Hans Rosling: Global population growth, box by box` resolved and `Analyze caption track` appeared.
  - Confirmed no horizontal overflow before import (`bodyScrollWidth=390`, `docScrollWidth=390`, `overflowX=0`).
  - Clicked `Analyze caption track`.
  - Confirmed Watch opened at `/session?view=watch`.
  - Confirmed source title `Hans Rosling: Global population growth, box by box`, YouTube source metadata `TED · fTznEIZRkLg`, player container, transcript panel, and `Transcript 241`.
  - Confirmed 241 rendered transcript segment nodes and visible transcript text beginning `I still remember the day in school`.
  - Confirmed no horizontal overflow in Watch (`bodyScrollWidth=390`, `docScrollWidth=390`, `overflowX=0`).
  - Browser console error log was empty.

## Next gap

The next YouTube quality gap is result depth after the transcript lands in Watch: capture a deterministic analysis fixture or API-test seam that proves claim/marker extraction and synthesis quality for this 241-line caption import without depending on live model availability during browser proof.
