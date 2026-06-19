# 2026-06-11 M2 Large Media Upload Streaming Proof

## Scope

Closed a launch-risk gap in the large-file upload path. The Audio/video upload
pane accepts MP4, MOV, and WebM, and large files are routed through Vercel Blob
before `/api/transcribe-batch`; however, the upload-token route only allowed
audio MIME types. Large video files could therefore be rejected before
transcription.

## Product Change

- Updated `/api/upload-audio` token generation from audio-only to audio/video
  media support.
- Added these video MIME types to the Blob upload token allowlist:
  - `video/mp4`
  - `video/quicktime`
  - `video/webm`
- Updated route comments to describe audio/video media upload rather than
  audio-only upload.
- Added `large-media-upload-streaming-contract` to
  `npm run ingestion:proof:local`.
- Strengthened `tests/api/upload-audio.test.ts` so the upload-token route must
  keep allowing MP4, MOV, and WebM.

## Proof

Local ingestion proof:

```bash
YENTL_INGESTION_PROOF_ORIGIN=http://localhost:3000 npm run ingestion:proof:local
```

Result: passed at `2026-06-12T00:01:14.559Z`, 0 failures.

New proof gate:

```json
{
  "name": "large-media-upload-streaming-contract",
  "ok": true,
  "client_blob_threshold_bytes": 4194304,
  "server_stream_threshold_bytes": 52428800,
  "max_upload_bytes": 524288000,
  "blob_upload_route": "/api/upload-audio",
  "transcription_route": "/api/transcribe-batch",
  "allowed_large_video_types": [
    "video/mp4",
    "video/quicktime",
    "video/webm"
  ]
}
```

The contract gate verifies:

- client files at/above 4 MB use Vercel Blob upload;
- Blob upload sends consent payload and uses `/api/upload-audio`;
- uploaded Blob URLs are handed to `/api/transcribe-batch` as JSON
  `blob_url`;
- private Blob URLs are streamed to Deepgram via `transcribeStream`;
- uploaded Blob URLs are deleted after transcription;
- direct multipart uploads over 50 MB use the stream path;
- upload tokens allow large MP4, MOV, and WebM files up to 500 MB.

## Verification

Focused regression:

```bash
node --check scripts/validation/prove-ingestion-local.mjs
npx vitest run tests/ingestion-proof-script.test.ts tests/api/upload-audio.test.ts tests/audio-ingest.test.ts tests/streaming-upload.test.ts tests/api/transcribe-batch.test.ts
```

Result: 5 files passed, 84 tests passed.

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

- This proof is a contract/unit/local API proof, not a real 300 MB browser upload
  to Vercel Blob.
- Real phone-recorded large MP4/MOV/WebM samples still need canary runs in a
  production-like environment with Blob storage and Deepgram configured.
- Physical iOS/Android file picker, share target, and microphone capture remain
  device-level proof gates.
