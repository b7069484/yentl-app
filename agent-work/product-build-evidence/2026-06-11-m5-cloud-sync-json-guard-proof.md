# M5 Cloud Sync JSON Guard Proof

## Purpose

Harden account-synced saved-session APIs so malformed JSON returns a deterministic `400 invalid_request` instead of a generic cloud error. This improves the cloud-sync launch path and makes recovery behavior cleaner for save/rename calls.

## Product Change

- Updated `app/api/sessions/route.ts` to parse save JSON through an `invalid_request` guard.
- Updated `app/api/sessions/[id]/route.ts` to parse rename JSON through an `invalid_request` guard.
- Added API tests for malformed save JSON and malformed rename JSON.
- Updated `scripts/validation/prove-cloud-sync-local.mjs` so cloud proof checks malformed save JSON in unconfigured mode and malformed save/rename JSON in signed-out/authenticated modes.
- Updated `tests/cloud-sync-proof-script.test.ts` to lock those proof checks.

## Current Cloud Proof

`YENTL_CLOUD_SYNC_PROOF_ORIGIN=http://localhost:3000 npm run cloud-sync:proof:local` passed and regenerated `docs/superpowers/validation/cloud-sync-local-proof.json`.

Current local cloud status:

- `ok`: `true`
- `cloud_mode`: `cloud_unavailable`
- `checks`: `5`
- New check: `invalid-save-json-guard`
- `failures`: `0`

The authenticated cloud-sync blocker remains valid because this environment still lacks real Clerk/database authenticated proof.

## Release Readiness Impact

`npm run release:readiness` now reads the refreshed local cloud proof:

- Local cloud proof: passing
- Local cloud mode: `cloud_unavailable`
- Local cloud check count: `5`
- Launch still blocked on:
  - `authenticated-cloud-sync-not-proven`
  - `production-authenticated-cloud-sync-not-proven`

## Verification

- `npx vitest run tests/api/sessions-cloud.test.ts tests/cloud-sync-proof-script.test.ts tests/session-sync.test.ts`
- `node --check scripts/validation/prove-cloud-sync-local.mjs`
- `npx tsc --noEmit --pretty false`
- `YENTL_CLOUD_SYNC_PROOF_ORIGIN=http://localhost:3000 npm run cloud-sync:proof:local`
- `npm run release:readiness`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run test:run` passed: 175 files, 1829 tests.
- `npm run build:automation` passed: 42/42 static pages.
- `git diff --check`
