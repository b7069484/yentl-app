# M4/M7 Mobile Device Canary Gate

## Purpose

Turn the physical iOS/Android launch blocker into a concrete evidence gate. Browser-emulated mobile proof remains useful for layout and route behavior, but it cannot prove share sheets, native file pickers, microphone permissions, PWA install/open behavior, or restore behavior on actual devices.

## Product Change

- Added `scripts/validation/prove-mobile-device-canary.mjs`.
- Added `npm run mobile:proof:devices`.
- Added `tests/mobile-device-canary-proof-script.test.ts`.
- Wired `docs/superpowers/validation/mobile-device-canary-proof.json` into `scripts/validation/prove-release-readiness.mjs`.
- Updated release readiness so emulated mobile proof no longer satisfies the physical-device launch gate.

## Canary Contract

The canary requires a manifest at `agent-work/validation/mobile-device-canaries.json` unless `YENTL_DEVICE_CANARY_MANIFEST` points elsewhere.

Required platforms:

- `ios`
- `android`

Required flows for each platform:

- `share_text`
- `share_web_url`
- `share_media_url`
- `file_picker_audio_video`
- `file_picker_text_document`
- `microphone_capture`
- `pwa_install_open`
- `saved_session_restore`

Each run must include device model, OS version, browser, test timestamp, passing flow statuses, and non-empty evidence files. The default freshness window is 14 days.

## Current Result

`npm run mobile:proof:devices` generated `docs/superpowers/validation/mobile-device-canary-proof.json` and failed as expected because no real device manifest exists yet.

Current canary status:

- `ok`: `false`
- `proof_scope`: `deploy`
- `production_like`: `true`
- `manifest_status`: `missing_manifest`
- `required_missing`: `ios:run`, `android:run`

## Release Readiness Impact

`npm run release:readiness` now reports the physical-device blocker with concrete evidence:

- Blocker: `physical-ios-android-device-proof-missing`
- Status: `missing_manifest`
- Evidence: `docs/superpowers/validation/mobile-device-canary-proof.json`
- Missing items: `ios:run`, `android:run`
- Next action: create the real device manifest, run `npm run mobile:proof:devices` against production, and keep evidence files for every required flow.

## Verification

- `node --check scripts/validation/prove-mobile-device-canary.mjs`
- `node --check scripts/validation/prove-release-readiness.mjs`
- `npx vitest run tests/mobile-device-canary-proof-script.test.ts tests/large-real-media-canary-proof-script.test.ts tests/release-readiness-proof-script.test.ts tests/mobile-pwa-proof-script.test.ts`
- `npm run mobile:proof:devices` failed intentionally with `missing_manifest` and wrote the proof artifact.
- `npm run release:readiness` passed report generation with `launch_ready: false`.
- `npx tsc --noEmit`
- `npm run lint`
- `npm run test:run` passed: 174 files, 1823 tests.
- `npm run build:automation` passed: 42/42 static pages.
- `git diff --check`
