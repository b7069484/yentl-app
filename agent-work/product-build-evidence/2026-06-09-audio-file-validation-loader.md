# Audio File Validation Loader

Date: 2026-06-09

## Product slice

Audio/video upload now has a deterministic browser-operable validation path. Opening `/session?source=audio-file` jumps directly to the upload pane, and local validation builds expose a `Load validation WAV` button that fetches `/validation/yentl-synthetic-panel.wav`, wraps it as a real `File`, runs the same staging/duration-probe UI, and then processes through the existing audio-file transcription pipeline.

This closes the previous proof gap where media URL ingest had a full browser route but audio-file ingest still depended on a native file picker that the automated browser could not reliably drive.

## Files touched

- `components/session/ingest-panes/audio-ingest-pane.tsx`
- `app/session/page.tsx`
- `lib/validation/fixtures.ts`
- `tests/audio-ingest-pane.test.tsx`
- `tests/session-page.test.tsx`
- `tests/project-validation-page.test.tsx`

## Verification

- `npx vitest run tests/audio-ingest-pane.test.tsx tests/session-page.test.tsx tests/project-validation-page.test.tsx tests/api/transcribe-batch.test.ts tests/validation-media-fixtures.test.ts`
  - Passed: 5 files, 82 tests.
- Focused ESLint on changed source/test files.
  - Passed.
- `npm run build:automation`
  - Passed with webpack production build.
- `npx tsc --noEmit`
  - Passed after the production build regenerated Next route type stubs.
- `git diff --check`
  - Passed.

## Runtime proof

- Browser, mobile viewport `390x844`, local dev server on `http://localhost:3000`:
  - Opened `/session?source=audio-file`.
  - Confirmed the upload pane rendered with `Load validation WAV`.
  - Clicked `Load validation WAV`.
  - Confirmed the pane staged `yentl-synthetic-panel.wav` as a file with size, duration, cost, and an enabled `Process audio/video` button.
  - Clicked `Process audio/video`.
  - Watch opened at `/session?view=watch`.
  - Watch showed audio-file source `yentl-synthetic-panel.wav`, speakers `Moderator` and `Analyst`, 5 transcript lines, 2 claims, and no horizontal overflow (`scrollWidth=390`, `innerWidth=390`).

## Next gap

The next highest-impact product gap is to give text/document ingest the same deterministic browser proof across pasted text, dropped/local file fixtures, and source-review anchors, including mobile route entry and export carryover.
