# M7 Release Readiness Gate - 2026-06-11

## Scope

Added a machine-readable release-readiness gate that keeps local proof success separate from actual launch readiness. The goal is to prevent a broad green local battery from being mistaken for final launch readiness while external proof gates remain open.

## Product/Proof Change

- Added `scripts/validation/prove-release-readiness.mjs`.
  - Reads core local proof artifacts for session UX, ingestion API/UI, text documents, meta-read synthesis, speaker attribution, mobile/PWA, PWA native contract, cloud-sync local mode, Chrome extension, extension store readiness, and local a11y.
  - Reads deploy proof artifacts for ingestion, analysis, cloud sync, a11y, and trust copy.
  - Writes `docs/superpowers/validation/release-readiness-proof.json`.
  - Exits successfully as a report by default, but supports `YENTL_RELEASE_READINESS_STRICT=1` for a future hard gate.
- Added `release:readiness` to `package.json`.
- Added `tests/release-readiness-proof-script.test.ts`.

## Current Result

Command:

```bash
npm run release:readiness
```

Result: passed as a report at `2026-06-12T00:28:41.922Z`.

Readiness summary:

- local proofs: 13/13 passing
- deploy artifacts: 5/5 passing
- `launch_ready`: false
- blockers: 6

Current blockers named by the report:

- `human-review-sensitive-attribution`
- `authenticated-cloud-sync-not-proven`
- `production-authenticated-cloud-sync-not-proven`
- `physical-ios-android-device-proof-missing`
- `large-real-media-production-canaries-missing`
- `production-release-smoke-current-tree-missing`

Advisory:

- deploy proof artifacts are older than the newest local proofs and should be rerun after the current tree is committed, CI-proven, deployed, and smoked.

## Verification

```bash
npx vitest run tests/release-readiness-proof-script.test.ts
npm run release:readiness
npx tsc --noEmit
npm run lint
npm run test:run
npm run build:automation
git diff --check
```

Results:

- Focused readiness test: 1 file passed, 4 tests passed.
- Typecheck: passed.
- Lint: passed.
- Full Vitest: 172 files passed, 1813 tests passed.
- Automation build: passed, 42/42 static pages.
- Diff check: passed.

## Boundary

This does not close the named blockers. It makes them explicit and machine-readable so the project can keep moving toward launch without overstating the current state.
