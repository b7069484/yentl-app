# Media Playback Sync Validation Sample

Date: 2026-06-09

## Product Change

- Added a deterministic validation sample at `/session?demo=validation&sample=media_playback_sync&view=watch`.
- The sample loads the local WAV fixture `/validation/yentl-synthetic-panel.wav` as an `audio_file` source.
- The workspace includes five timed transcript cues, two provisional claim cards, one rhetoric marker, two speakers, and a synthesis read.
- The validation catalog now exposes the media playback sync sample from `/project/validation`.
- The validation catalog fixture cards now shrink correctly on mobile through explicit `min-w-0` grid/card constraints.

## Verification

- Focused tests:
  - `npx vitest run tests/api/corpus-sample.test.ts tests/watch-view.test.tsx tests/project-validation-page.test.tsx tests/session-page.test.tsx`
  - Result: 4 files passed, 58 tests passed.
- Focused lint:
  - `npx eslint app/api/corpus-sample/route.ts app/project/validation/page.tsx lib/validation/fixtures.ts tests/api/corpus-sample.test.ts tests/watch-view.test.tsx`
  - Result: passed.
- Typecheck:
  - `npx tsc --noEmit`
  - Result: passed.
- Production build:
  - `npm run build:automation`
  - Result: passed; `/session`, `/project/validation`, `/mobile`, and `/tv` remain in the build output.
- Diff hygiene:
  - `git diff --check`
  - Result: passed.

## Browser Proof

- Opened `http://localhost:3000/session?demo=validation&sample=media_playback_sync&view=watch` in the in-app browser at `390x844`.
- Initial rendered metrics:
  - audio element present: `true`.
  - audio source: `/validation/yentl-synthetic-panel.wav`.
  - source header: `yentl-synthetic-panel.wav`.
  - transcript cue count: `5`.
  - transcript starts: `0`, `4`, `10`, `17`, `25`.
  - queue claim count: `2`.
  - queue marker count: `1`.
  - viewport width: `390`; scroll width: `390`; horizontal overflow: `false`.
- Interaction proof:
  - clicked `queue-claim-media-sync-claim-platform-collapse`.
  - audio current time updated to `17`.
  - current transcript segment updated to `transcript-seg-17`.
  - segment `17` state became `current`.
  - status counter showed `2 claims · 1 marker`.
- Catalog proof:
  - opened `http://localhost:3000/project/validation` at `390x844`.
  - media sample link was visible.
  - after the mobile grid fix, viewport width: `390`; scroll width: `390`; horizontal overflow: `false`; widest article right edge: `370`.

## Remaining Product Gap

The media playback sync sample now proves prepared local audio review end-to-end. Next high-value fixtures should prove direct media URL ingest against `/api/media-ingest`, provider-backed audio transcription against `/api/transcribe-batch`, and article/extension highlight states with the same browser-openable pattern.
