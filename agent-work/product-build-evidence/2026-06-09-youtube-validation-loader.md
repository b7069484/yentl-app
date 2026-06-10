# YouTube Validation Loader

Date: 2026-06-09

## Product slice

YouTube ingest now has a browser-operable validation path that matches the other source lanes. Opening `/session?source=youtube` jumps directly into the YouTube pane, and local validation builds expose `Load validation YouTube`, which fills `https://www.youtube.com/watch?v=fTznEIZRkLg`, calls `/api/youtube-ingest` with source-analysis consent, keeps the player and Yentl rail together, and arms timed captions in the same workspace.

The backend route is also covered for the deterministic local fallback: when live caption fetch fails for the curated Hans Rosling video in local/test/dev, `/api/youtube-ingest` returns the fixture transcript from `test-corpus/ground-truth/fTznEIZRkLg.en.vtt` instead of dropping into the generic no-caption error.

## Files touched

- `components/session/ingest-panes/youtube-ingest-pane.tsx`
- `lib/client/source-router.tsx`
- `lib/validation/fixtures.ts`
- `tests/youtube-ingest-pane.test.tsx`
- `tests/source-router.test.tsx`
- `tests/project-validation-page.test.tsx`
- `tests/api/youtube-ingest.test.ts`

## Verification

- `npx vitest run tests/youtube-ingest-pane.test.tsx tests/source-router.test.tsx tests/project-validation-page.test.tsx tests/session-page.test.tsx tests/api/youtube-ingest.test.ts tests/youtube-validation-fixtures.test.ts`
  - Passed: 6 files, 78 tests.
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
  - Confirmed the route rendered the YouTube pane directly, including the URL field, disabled Start button, player shell, Yentl analysis rail, and `Load validation YouTube`.
  - Clicked `Load validation YouTube`.
  - Confirmed the URL input became `https://www.youtube.com/watch?v=fTznEIZRkLg`.
  - Confirmed the title resolved to `Hans Rosling: Global population growth, box by box`.
  - Confirmed the player iframe remained in the workspace and the Yentl rail reported captions armed.
  - Confirmed the transcript panel displayed: `Press play if the YouTube controls are visible. Yentl will release 241 timed caption lines here as the video clock advances.`
  - Confirmed the no-playback recovery state exposed `Share tab audio` and `Use extension`.
  - Confirmed no horizontal overflow at `390px` (`bodyScrollWidth=390`, `docScrollWidth=390`, `overflowX=0`).
  - Browser console error log was empty.

## Next gap

The next product gap is to turn the armed YouTube caption state into a browser-verifiable transcript-release proof that does not depend on manually advancing the embedded YouTube player. A good next slice would add a dev-only caption release control or test adapter hook so the validation path can prove live transcript release, claim creation, and synthesis from the YouTube pane itself.
