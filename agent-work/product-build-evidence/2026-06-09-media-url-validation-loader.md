# Media URL Validation Loader

Date: 2026-06-09

## Product slice

Direct media URL ingest now has a deterministic browser-operable validation path. Opening `/session?source=media-url` jumps directly to the Direct media pane, and local validation builds expose `Load validation media URL`, which fills `http://localhost:3000/validation/yentl-synthetic-panel.wav`, calls `/api/media-ingest`, preserves returned speaker labels through `bulkIngest`, and opens Watch.

This closes the proof gap where the deterministic local WAV path existed in the backend but the direct-media UI still required manual URL entry for browser validation.

## Files touched

- `components/session/ingest-panes/media-url-ingest-pane.tsx`
- `app/session/page.tsx`
- `lib/validation/fixtures.ts`
- `tests/media-url-ingest-pane.test.tsx`
- `tests/session-page.test.tsx`
- `tests/project-validation-page.test.tsx`

## Verification

- `npx vitest run tests/media-url-ingest-pane.test.tsx tests/session-page.test.tsx tests/project-validation-page.test.tsx tests/api/media-ingest.test.ts tests/api/transcribe-batch.test.ts tests/validation-media-fixtures.test.ts tests/watch-view.test.tsx tests/source-router.test.tsx`
  - Passed: 8 files, 137 tests.
- Focused ESLint on changed source/test files.
  - Passed.
- `npm run build:automation`
  - Passed with webpack production build.
- `npx tsc --noEmit`
  - Passed.
- `git diff --check` on changed source/test files.
  - Passed.

## Runtime proof

- Browser, mobile viewport `390x844`, local dev server on `http://localhost:3000`:
  - Opened `/session?source=media-url`.
  - Confirmed the route rendered `Paste a media URL`, the media URL input, `Load validation media URL`, and no horizontal overflow (`scrollWidth=390`, `clientWidth=390`).
  - Clicked `Load validation media URL`.
  - Confirmed Watch opened at `/session?view=watch`.
  - Confirmed media source `http://localhost:3000/validation/yentl-synthetic-panel.wav`.
  - Confirmed speaker labels `Moderator` and `Analyst`.
  - Confirmed 5 transcript lines linked to playback and 2 claims.
  - Confirmed transcript cues included the validation panel, city library budget, technology grant, social-platform-ban, and slippery-slope lines.
  - Browser console error log was empty.

## Next gap

The next highest-impact product gap is to make YouTube ingest deterministic and browser-operable in the same style: a validation loader or direct validation URL path that proves caption fallback, Watch handoff, mobile layout, and source/speaker continuity without relying on live YouTube availability.
