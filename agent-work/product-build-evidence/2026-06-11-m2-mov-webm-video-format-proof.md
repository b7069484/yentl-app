# 2026-06-11 M2 MOV/WebM Video Format Proof

## Scope

Extended the media-ingestion proof from MP4-only video coverage to additional
real video containers that the upload UI already accepts: QuickTime/MOV and
WebM. This closes another part of the "all media ingestions work" gap for both
direct media URLs and uploaded video files.

## Product Change

- Generated valid local MOV and WebM fixtures from the existing synthetic panel:
  - `public/validation/yentl-synthetic-panel.mov`
  - `public/validation/yentl-synthetic-panel.webm`
- Added MOV/WebM entries to the validation media fixture registry with exact
  filename, path, MIME, and fixture ids:
  - `yentl_synthetic_panel_mov`
  - `yentl_synthetic_panel_webm`
- Added `Load validation MOV` and `Load validation WebM` to the Audio/video
  upload pane.
- Added direct URL and uploaded-file proof gates for MOV/WebM to
  `npm run ingestion:proof:local`.
- Added rendered browser handoff flows for MOV/WebM upload to
  `npm run ingestion:proof:ui`.
- Added the MOV/WebM upload and media-url fixtures to `/project/validation`.

## Proof

Fixture validity:

- MOV: QuickTime container, H.264 video, AAC audio, 33.3 seconds, 499,274 bytes.
- WebM: WebM container, VP9 video, Opus audio, 33.3 seconds, 279,551 bytes.

Local API proof:

```bash
YENTL_INGESTION_PROOF_ORIGIN=http://localhost:3000 npm run ingestion:proof:local
```

Result: passed at `2026-06-11T23:55:04.615Z`, 0 failures.

New/expanded checks:

```json
[
  {
    "name": "direct-mov-url-ingest",
    "mime": "video/quicktime",
    "utterance_count": 5,
    "speaker_count": 2,
    "validation_fixture_id": "yentl_synthetic_panel_mov"
  },
  {
    "name": "direct-webm-url-ingest",
    "mime": "video/webm",
    "utterance_count": 5,
    "speaker_count": 2,
    "validation_fixture_id": "yentl_synthetic_panel_webm"
  },
  {
    "name": "uploaded-mov-file-ingest",
    "file": "public/validation/yentl-synthetic-panel.mov",
    "mime": "video/quicktime",
    "utterance_count": 5,
    "speaker_count": 2,
    "validation_fixture_id": "yentl_synthetic_panel_mov"
  },
  {
    "name": "uploaded-webm-file-ingest",
    "file": "public/validation/yentl-synthetic-panel.webm",
    "mime": "video/webm",
    "utterance_count": 5,
    "speaker_count": 2,
    "validation_fixture_id": "yentl_synthetic_panel_webm"
  }
]
```

Rendered UI proof:

```bash
npm run ingestion:proof:ui
```

Result: passed at `2026-06-11T23:55:23.930Z`, 11 rendered flows, 0 failures.

New rendered flows:

- `mov-upload-validation-ui-handoff`: `/session?source=audio-file` ->
  `Load validation MOV` -> `/validation/yentl-synthetic-panel.mov` ->
  `/api/transcribe-batch` -> `/session?view=watch`.
- `webm-upload-validation-ui-handoff`: `/session?source=audio-file` ->
  `Load validation WebM` -> `/validation/yentl-synthetic-panel.webm` ->
  `/api/transcribe-batch` -> `/session?view=watch`.

## Verification

Focused regression:

```bash
node --check scripts/validation/prove-ingestion-local.mjs
node --check scripts/validation/prove-ingestion-ui-local.mjs
npx vitest run tests/validation-media-fixtures.test.ts tests/api/transcribe-batch.test.ts tests/api/media-ingest.test.ts tests/audio-ingest-pane.test.tsx tests/ingestion-proof-script.test.ts tests/ingestion-ui-proof-script.test.ts tests/project-validation-page.test.tsx
```

Result: 7 files passed, 96 tests passed.

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
- Full Vitest: 170 files passed, 1796 tests passed.
- Automation build: passed, 42/42 static pages.
- Whitespace diff check: passed.

## Remaining M2 Work

- Large-file streaming still needs explicit proof beyond small validation
  fixtures.
- Real user-file canaries should include larger, messy, and phone-recorded MOV,
  WebM, MP4, M4A, and MP3 samples.
- Physical mobile file picker/share target/microphone proof remains a
  device-level validation gate.
- Production proof should be rerun after this local batch is committed,
  CI-proven, and redeployed.
