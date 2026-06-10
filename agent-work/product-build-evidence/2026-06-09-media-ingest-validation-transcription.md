# Media Ingest Validation Transcription

Date: 2026-06-09

## Product Change

- Added a shared deterministic validation transcription fixture for `public/validation/yentl-synthetic-panel.wav`.
- `/api/media-ingest` now returns that fixture for the exact local validation WAV URL when validation demos are enabled.
- `/api/transcribe-batch` now returns that same fixture for both the JSON URL path and multipart upload path when the exact validation WAV is used.
- The fixture preserves the production no-diarization shape: `speaker_id: null`, `attribution_status: not_available`, `source_audio_kind: audio_file`, and no invented speaker labels.
- The response includes `validation_fixture: true` and `validation_fixture_id: yentl_synthetic_panel_wav` so validation proof cannot be mistaken for a live Deepgram call.
- `/project/validation` now includes a "Local validation WAV transcription" fixture row for the deterministic media URL path.

## Verification

- Focused tests:
  - `npx vitest run tests/api/media-ingest.test.ts tests/api/transcribe-batch.test.ts tests/validation-media-fixtures.test.ts tests/project-validation-page.test.tsx tests/media-url-ingest-pane.test.tsx`
  - Result: 5 files passed, 71 tests passed.
- Focused lint:
  - `npx eslint app/api/media-ingest/route.ts app/api/transcribe-batch/route.ts lib/server/validation-media-fixtures.ts lib/validation/fixtures.ts tests/api/media-ingest.test.ts tests/api/transcribe-batch.test.ts tests/validation-media-fixtures.test.ts tests/project-validation-page.test.tsx`
  - Result: passed.
- Typecheck:
  - `npx tsc --noEmit`
  - Result: passed.
- Production build:
  - `npm run build:automation`
  - Result: passed; `/api/media-ingest`, `/api/transcribe-batch`, `/project/validation`, `/mobile`, and `/tv` remain in the build output.
- Diff hygiene:
  - `git diff --check`
  - Result: passed.

## Runtime API Proof

- `POST /api/media-ingest` with consent and `http://localhost:3000/validation/yentl-synthetic-panel.wav`:
  - HTTP status: `200`.
  - `validation_fixture`: `true`.
  - `validation_fixture_id`: `yentl_synthetic_panel_wav`.
  - `mime`: `audio/wav`.
  - utterance starts: `0`, `4`, `10`, `17`, `25`.
  - speakers: `[]`.
- `POST /api/transcribe-batch` JSON URL path with consent and `duration_sec: 31.953`:
  - HTTP status: `200`.
  - `validation_fixture`: `true`.
  - returned the same five timed utterances.
- `POST /api/transcribe-batch` multipart upload path with the actual WAV fixture:
  - HTTP status: `200`.
  - `validation_fixture`: `true`.
  - returned the same five timed utterances.
- `POST /api/media-ingest` without consent:
  - HTTP status: `428`.
  - error code: `SOURCE_CONSENT_REQUIRED`.

## Browser Proof

- Opened `http://localhost:3000/project/validation` in the in-app browser at `390x844`.
- The "Local validation WAV transcription" fixture row was visible.
- The source link and `public/validation/yentl-synthetic-panel.wav` local path were visible.
- Viewport width: `390`; scroll width: `390`; horizontal overflow: `false`.

## Remaining Product Gap

The app now has deterministic backend proof for media URL transcription and audio upload transcription without requiring a live provider call. Next high-value slices should connect this fixture through the full Media URL UI into Watch with persisted session evidence, then add a live-provider canary that runs only when `DEEPGRAM_API_KEY` is available and records provider drift separately from deterministic validation.
