# M2 Video URL And YouTube Context Proof - 2026-06-11

## Scope

Closed two ingestion gaps in the launch proof battery:

- deterministic direct MP4 video URL ingest through the same Media URL product path
- YouTube caption bulk-import claim extraction without future-caption context
  overflow

## Product Change

- Added MP4 validation support for `/validation/yentl-synthetic-panel.mp4` in
  the media-ingest fixture registry.
- `/api/media-ingest` now returns the deterministic panel transcript for both:
  - WAV: `yentl_synthetic_panel_wav`, `audio/wav`
  - MP4: `yentl_synthetic_panel_mp4`, `video/mp4`
- Added a visible `Load validation video URL` control to the Media URL pane.
- Added `direct-video-url-ingest` to `npm run ingestion:proof:local`.
- Added `direct-video-validation-ui-handoff` to `npm run ingestion:proof:ui`.
- Fixed `onFinalUtterance` context selection so bulk-imported captions do not
  include future transcript lines in the current claim-extraction request.

## Proof

`npm run ingestion:proof:local` passed with:

- `direct-media-url-ingest`: `audio/wav`, 5 utterances, 2 speakers
- `direct-video-url-ingest`: `video/mp4`, 5 utterances, 2 speakers
- YouTube caption ingest: 241 transcript segments

`npm run ingestion:proof:ui` passed with 8 rendered flows:

- web article
- direct media URL
- direct video URL
- audio upload
- TXT
- PDF
- YouTube caption track
- claim quick check

The YouTube UI flow no longer produces `/api/extract-claims` 400s from
oversized future-caption context.

## Verification

- `npx vitest run tests/api/media-ingest.test.ts tests/media-url-ingest-pane.test.tsx tests/ingestion-proof-script.test.ts tests/ingestion-ui-proof-script.test.ts tests/project-validation-page.test.tsx tests/verify-ownership-context.test.ts` passed: 6 files, 61 tests.
- `npm run ingestion:proof:local` passed.
- `npm run ingestion:proof:ui` passed.
- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `npm run test:run` passed: 170 files, 1783 tests.
- `npm run build:automation` passed.
- `git diff --check` passed.

## Remaining M2 Work

- Add real external MP4/WebM URL proof where the host permits server-side media
  fetch and transcription.
- Add physical-device mobile microphone/file-capture smoke.
- Re-run deploy proof after the current local batch is committed, CI-proven, and
  redeployed.
