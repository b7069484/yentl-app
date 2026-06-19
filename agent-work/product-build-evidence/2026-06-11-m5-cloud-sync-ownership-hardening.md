# 2026-06-11 M5 Cloud Sync Ownership Hardening

## Scope

Hardened account-synced saved-session upserts so a local/session id cannot
overwrite another Clerk account's cloud save during a conflict or race.

## Product Change

- `saveCloudSession()` now adds a Drizzle `setWhere` guard to the `sessions.id`
  upsert, limiting conflict updates to rows owned by the current
  `clerk_user_id`.
- After the guarded upsert, the store rechecks ownership before returning a
  success response.
- Added a regression test that simulates the race: the first ownership check sees
  no row, the upsert path runs, and the post-upsert ownership check sees the id
  owned by another account. The save returns `409 conflict` instead of success.

## Verification

Focused cloud/session regression:

```bash
npx vitest run tests/api/sessions-cloud.test.ts tests/session-sync.test.ts tests/sessions-library-page.test.tsx tests/save-session-button.test.tsx tests/session-page.test.tsx tests/saved-session-hydrator.test.tsx tests/cloud-sync-proof-script.test.ts
```

Result: 7 test files passed, 75 tests passed.

Broad gates:

```bash
npx tsc --noEmit
npm run lint
npm run test:run
npm run build:automation
```

Results:

- TypeScript: pass.
- Lint: pass.
- Full tests: 166 files passed, 1749 tests passed.
- Automation build: pass, 42/42 static pages generated.

## 2026-06-11 Proof Harness Hardening

Extended `scripts/validation/prove-cloud-sync-local.mjs` so the authenticated
branch no longer stops at save/rename/delete. When
`YENTL_CLOUD_SYNC_PROOF_AUTH_HEADER` is supplied, the branch now proves:

- authenticated list availability;
- save response envelope and serialized session body;
- load-by-id after save;
- list membership after save;
- rename and load-back persistence;
- renamed row in the list response;
- `/tv?restore=<id>` route render;
- delete;
- post-delete `404`;
- deleted row absent from the list response.

Latest artifacts:

- `docs/superpowers/validation/cloud-sync-local-proof.json`: `ok:true`,
  `cloud_mode:"cloud_unavailable"`, generated `2026-06-11T19:56:49.138Z`.
- `docs/superpowers/validation/cloud-sync-deploy-proof.json`: `ok:true`,
  `cloud_mode:"signed_out"`, generated `2026-06-11T19:56:49.707Z`.

Additional verification:

- `node --check scripts/validation/prove-cloud-sync-local.mjs` passed.
- `npx vitest run tests/cloud-sync-proof-script.test.ts tests/api/sessions-cloud.test.ts tests/session-sync.test.ts tests/sessions-library-page.test.tsx` passed: 4 files, 38 tests.
- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `npm run test:run` passed: 166 files, 1749 tests.
- `npm run build:automation` passed: 42/42 static pages.
- `npm run cloud-sync:proof:local` passed against `http://127.0.0.1:3000`.
- `npm run cloud-sync:proof:deploy` passed against `https://yentl.it`.
- `git diff --check` passed.

## 2026-06-11 Browser-Profile Harness Extension

The authenticated proof branch now includes
`authenticated-two-profile-browser-restore`. When
`YENTL_CLOUD_SYNC_PROOF_AUTH_HEADER` is supplied, the script creates a cloud
proof session, launches two isolated Chrome profiles, injects the auth header
through CDP, opens `/session?restore=<id>&view=overview`, verifies restored
workspace text and no horizontal overflow/runtime errors, then deletes the proof
session.

Latest local fallback artifact:

- `docs/superpowers/validation/cloud-sync-local-proof.json`: `ok:true`,
  `cloud_mode:"cloud_unavailable"`, generated `2026-06-11T20:34:03.645Z`.

Additional verification:

- `node --check scripts/validation/prove-cloud-sync-local.mjs` passed.
- `npx vitest run tests/cloud-sync-proof-script.test.ts tests/session-sync.test.ts tests/api/sessions-cloud.test.ts` passed: 3 files, 14 tests.
- `npm run cloud-sync:proof:local` passed.
- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `npm run test:run` passed: 167 files, 1756 tests.
- `npm run build:automation` passed: 42 routes generated.

## Remaining M5 Work

- Authenticated cross-device CRUD still needs a real signed-in proof via
  `YENTL_CLOUD_SYNC_PROOF_AUTH_HEADER`.
- The browser/device-profile harness is now implemented, but still needs to be
  run with a real auth header and then repeated against production after
  redeploy.
