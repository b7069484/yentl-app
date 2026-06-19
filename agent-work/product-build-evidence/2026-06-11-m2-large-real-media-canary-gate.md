# M2/M7 Large Real Media Canary Gate

## Purpose

Turn the release blocker "large real media production canaries missing" into a runnable proof instead of a generic checklist item.

## Product Change

- Added `scripts/validation/prove-large-real-media-canary.mjs`.
- Added `npm run ingestion:proof:large-real-media`.
- Added `tests/large-real-media-canary-proof-script.test.ts`.
- Wired `docs/superpowers/validation/large-real-media-canary-proof.json` into `scripts/validation/prove-release-readiness.mjs`.
- Updated release readiness so synthetic/local media fixtures no longer satisfy the real production media canary gate.

## Canary Contract

The canary requires a manifest at `agent-work/validation/large-real-media-canaries.json` unless `YENTL_REAL_MEDIA_CANARY_MANIFEST` points elsewhere.

Required production-like cases:

- Real audio file, at least 4 MB.
- Real `video/mp4`, at least 4 MB.
- Real `video/quicktime`, at least 4 MB.
- Real `video/webm`, at least 4 MB.

Each case is uploaded through the client Blob path using `/api/upload-audio`, then transcribed through `/api/transcribe-batch` with `blob_url`.

## Current Result

`npm run ingestion:proof:large-real-media` generated `docs/superpowers/validation/large-real-media-canary-proof.json` and failed as expected because no real media manifest exists yet.

Current canary status:

- `ok`: `false`
- `proof_scope`: `deploy`
- `production_like`: `true`
- `manifest_status`: `missing_manifest`
- `required_missing`: `audio`, `video/mp4`, `video/quicktime`, `video/webm`

## Release Readiness Impact

`npm run release:readiness` now reports the large media blocker with concrete evidence:

- Blocker: `large-real-media-production-canaries-missing`
- Status: `missing_manifest`
- Evidence: `docs/superpowers/validation/large-real-media-canary-proof.json`
- Next action: create the real media manifest and run `npm run ingestion:proof:large-real-media` against production with Blob and Deepgram configured.

## Verification

- `node --check scripts/validation/prove-large-real-media-canary.mjs`
- `node --check scripts/validation/prove-release-readiness.mjs`
- `npx vitest run tests/large-real-media-canary-proof-script.test.ts tests/release-readiness-proof-script.test.ts tests/ingestion-proof-script.test.ts`
- `npm run ingestion:proof:large-real-media` failed intentionally with `missing_manifest` and wrote the proof artifact.
- `npm run release:readiness` passed report generation with `launch_ready: false`.
- `npx tsc --noEmit`
- `npm run lint`
- `npm run test:run` passed: 173 files, 1818 tests.
- `npm run build:automation` passed: 42/42 static pages.
- `git diff --check`
