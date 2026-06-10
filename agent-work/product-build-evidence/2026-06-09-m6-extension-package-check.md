# M6 Extension Package Check

Timestamp: 2026-06-09 23:17 EDT

## Scope

- Added a deterministic extension readiness verifier:
  - `npm run extension:check`
  - `scripts/validation/check-extension-package.mjs`
- The verifier checks:
  - Required extension files exist.
  - Launch manifest is MV3 and requires Chrome 116.
  - Required permissions are present.
  - Production manifest keeps localhost out of required `host_permissions`.
  - Localhost remains available through optional/local validation posture.
  - CSP includes production, local validation, and Deepgram endpoints.
  - Stale legacy domains such as `factify` are absent.
  - Extension JavaScript files parse.
  - Popup exposes status/start/stop capture controls.
  - README covers production install and local validation.
- Added regression coverage that executes the verifier:
  - `tests/extension-package-check.test.ts`
- Updated `docs/browser-tab-capture.md` so the extension popup is no longer listed as missing and the package check is documented.

## Files

- `package.json`
- `scripts/validation/check-extension-package.mjs`
- `tests/extension-package-check.test.ts`
- `docs/browser-tab-capture.md`

## Verification

- Extension package check passed:
  - `npm run extension:check`
  - Result: `ok: true`, MV3, version `0.1.0`, 11 required extension files checked.
- Focused extension/package tests passed:
  - `npm run test:run -- tests/extension-package-check.test.ts tests/extension-popup.test.ts tests/extension-same-page.test.ts tests/extension-content-script.test.ts tests/extension-offscreen.test.ts tests/extension-panel-view.test.tsx tests/extension-bridge.test.tsx tests/browser-tab-ingest-pane.test.tsx`
  - 8 files, 41 tests.
- Typecheck passed:
  - `npx tsc --noEmit`
- Lint passed with 0 errors and the existing 18-warning baseline:
  - `npm run lint`
- Full regression passed:
  - `npm run test:run`
  - 152 files, 1676 tests.
- Diff hygiene passed:
  - `git diff --check`

## Remaining Gap

- This is package readiness, not an installed-extension proof.
- Still outstanding for M6: manually load the extension in Chrome, capture the permission prompt, run the local fixture, run a real playable media page, run a real article page, and save screenshot/evidence from those actual Chrome states.
- No automations, cron jobs, staging, commits, pushes, deployments, dependency installs, or database pushes were performed.
