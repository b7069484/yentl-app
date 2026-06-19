# 2026-06-11 M2 Video File Upload Proof

## Scope

Closed the upload-path gap where Yentl accepted video files in the Audio/video
upload pane, but deterministic local proof only exercised the WAV upload path.
Direct MP4 URL ingestion was already covered; this slice proves MP4 as an
uploaded file through the rendered source picker and `/api/transcribe-batch`.

## Product Change

- Added format-aware validation-file lookup in `lib/server/validation-media-fixtures.ts`.
- Updated `/api/transcribe-batch` so local validation WAV and MP4 multipart
  uploads both return deterministic two-speaker transcript fixtures with the
  correct fixture id.
- Added `Load validation MP4` to the Audio/video upload pane beside the existing
  WAV loader.
- Added `video-upload-validation-ui-handoff` to the rendered ingestion proof.
- Added `video-file-mp4` to the `/project/validation` fixture catalog and
  runbook.
- Added regression coverage for MP4 fixture recognition, MP4 JSON URL
  transcription fixture, MP4 multipart upload fixture, and the rendered MP4
  validation loader button.

## Proof

Rendered source-picker proof:

```bash
npm run ingestion:proof:ui
```

Result: passed at `2026-06-11T23:43:09.307Z`, 9 flows, 0 failures.

New rendered flow:

- `video-upload-validation-ui-handoff`: `/session?source=audio-file` ->
  `Load validation MP4` -> staged `yentl-synthetic-panel.mp4` ->
  `/api/transcribe-batch` -> `/session?view=watch`.

Local ingest proof:

```bash
YENTL_INGESTION_PROOF_ORIGIN=http://localhost:3000 npm run ingestion:proof:local
```

Result: passed at `2026-06-11T23:46:35.002Z`, 0 failures.

New API proof gate:

- `uploaded-video-file-ingest`: posts `public/validation/yentl-synthetic-panel.mp4`
  as multipart form data to `/api/transcribe-batch` and verifies the
  deterministic two-speaker transcript.

The gate returns:

```json
{
  "file": "public/validation/yentl-synthetic-panel.mp4",
  "mime": "video/mp4",
  "byte_count": 499223,
  "utterance_count": 5,
  "speaker_count": 2,
  "validation_fixture_id": "yentl_synthetic_panel_mp4"
}
```

## Verification

Focused regression:

```bash
npx vitest run tests/api/transcribe-batch.test.ts tests/audio-ingest-pane.test.tsx tests/validation-media-fixtures.test.ts tests/ingestion-ui-proof-script.test.ts tests/project-validation-page.test.tsx
```

Result: 5 files passed, 68 tests passed.

Additional proof-script regression:

```bash
node --check scripts/validation/prove-ingestion-local.mjs
npx vitest run tests/ingestion-proof-script.test.ts tests/api/transcribe-batch.test.ts
```

Result: 2 files passed, 32 tests passed.

Broad gates:

```bash
npx tsc --noEmit
npm run lint
npm run test:run
npm run build:automation
git diff --check
```

Results:

- TypeScript: passed.
- Lint: passed.
- Full Vitest: 170 files passed, 1788 tests passed.
- Automation build: passed, 42/42 static pages.
- Whitespace diff check: passed.

## Remaining M2 Work

- Real user-upload variation still needs broader sample coverage across MOV,
  WebM, large-file streaming, and hosted file edge cases.
- Physical mobile file picker, share target, and microphone capture proof still
  need device-level validation.
- Production proof should be rerun after this local batch is committed,
  CI-proven, and redeployed.
