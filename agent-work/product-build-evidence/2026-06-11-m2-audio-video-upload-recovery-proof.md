# 2026-06-11 M2 Audio/Video Upload Recovery Proof

## Scope

Closed a user-facing upload-intake polish gap: the file upload path accepts audio
and video, but parts of the UI and recovery behavior still read like an
audio-only path with a plain error sentence.

## Product Change

- Renamed the upload badge to `Audio/video upload`.
- Updated the hidden file input label to `Select audio or video file`.
- Replaced upload errors with a structured recovery alert that explains the
  failure class and offers two alternate intake paths:
  - `Use media URL`
  - `Use browser tab`
- Added tailored recovery guidance for unsupported files, files over 500 MB,
  recordings over 4 hours, validation-WAV load failure, and transcription
  failure while a file is still staged.
- Updated the mobile proof route expectation so `/session?source=audio-file`
  verifies the audio/video upload label at narrow widths.

## Proof

Focused tests:

```bash
npx vitest run tests/audio-ingest-pane.test.tsx tests/mobile-pwa-proof-script.test.ts
```

Result: 2 files passed, 31 tests passed.

Local static/code gates:

```bash
npx tsc --noEmit
npm run lint
git diff --check
```

All passed.

Rendered proof:

```bash
npm run mobile:proof:local
npm run ingestion:proof:ui
```

Results:

- `mobile:proof:local`: passed at `2026-06-11T21:07:36.267Z`, 19 routes,
  57 width checks, 0 failures, origin `http://localhost:3000`.
- `ingestion:proof:ui`: passed at `2026-06-11T21:07:57.670Z`, 7 source
  handoff flows, 0 failures, origin `http://localhost:3000`.

In-app Browser proof at 390px:

- Route: `http://localhost:3000/session?source=audio-file`
- `Audio/video upload`: visible.
- `Drop an audio or video file`: visible.
- `Load validation WAV`: visible.
- Horizontal overflow: 0.
- Console errors: 0.

## Remaining M2 Work

- Real-world external user-file variation still needs broader canary coverage.
- Physical-device mic/share/install behavior remains a real-device M4 gate.
