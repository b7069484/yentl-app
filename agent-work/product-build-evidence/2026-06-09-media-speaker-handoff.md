# Media Speaker Handoff

Date: 2026-06-09

## Product slice

Media URL and audio-file ingest now preserve provider/sample speaker metadata through the shared `bulkIngest` handoff. When a transcription response includes `speakers`, the orchestrator registers those speaker ids and applies their labels before appending transcript segments, so Watch, Transcript, synthesis, exports, and TV/mobile surfaces receive the same speaker map as the transcription layer.

Also carried the same label preservation into validation demo hydration so corpus/sample sessions do not flatten named speakers back to generic `Speaker N` labels. The deterministic local WAV fixture now returns a two-speaker panel (`Moderator`, `Analyst`) with confident attribution, so the direct-media validation path proves speaker handoff without live Deepgram dependency.

## Files touched

- `lib/client/ingest-orchestrator.ts`
- `components/session/ingest-panes/media-url-ingest-pane.tsx`
- `components/session/ingest-panes/audio-ingest-pane.tsx`
- `app/session/page.tsx`
- `components/session/validation-sample-hydrator.tsx`
- `lib/server/validation-media-fixtures.ts`
- `tests/ingest-orchestrator.test.ts`
- `tests/media-url-ingest-pane.test.tsx`
- `tests/audio-ingest-pane.test.tsx`
- `tests/session-page.test.tsx`
- `tests/validation-media-fixtures.test.ts`
- `tests/api/media-ingest.test.ts`
- `tests/api/transcribe-batch.test.ts`

## Verification

- `npx vitest run tests/api/media-ingest.test.ts tests/api/transcribe-batch.test.ts tests/validation-media-fixtures.test.ts tests/ingest-orchestrator.test.ts tests/media-url-ingest-pane.test.tsx tests/audio-ingest-pane.test.tsx tests/session-page.test.tsx`
  - Passed: 7 files, 126 tests.
- Focused ESLint on changed source/test files.
  - Passed.
- `npm run build:automation`
  - Passed with webpack production build.
- `npx tsc --noEmit`
  - First run failed because `.next/types` stubs were missing from the prior build state.
  - Re-ran after `npm run build:automation`; passed.

## Runtime proof

- Local server: `http://localhost:3000/session` returned 200.
- Runtime API proof: `POST /api/media-ingest` for `http://localhost:3000/validation/yentl-synthetic-panel.wav` returned `validation_fixture: true`, speakers `Moderator` and `Analyst`, and speaker ids `[0, 0, 1, 0, 1]`.
- Browser, mobile viewport `390x844`:
  - Opened `/session?url=http%3A%2F%2Flocalhost%3A3000%2Fvalidation%2Fyentl-synthetic-panel.wav`.
  - Media URL pane prefilled the WAV, processed it, and reached `/session?view=watch`.
  - Watch showed named speaker controls for `Moderator` and `Analyst`, the direct media source, 5 transcript lines, 2 claims, and no horizontal overflow (`scrollWidth=390`, `innerWidth=390`).

## Next gap

The direct-media path now has one deterministic proof route. Next highest-impact gap is likely the file-upload UI path with a real browser-file selection proof, so audio-file ingest gets the same runtime confidence as media URL ingest.
