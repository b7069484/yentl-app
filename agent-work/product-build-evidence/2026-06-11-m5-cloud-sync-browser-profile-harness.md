# 2026-06-11 M5 Cloud Sync Browser-Profile Harness

## Scope

Closed the proof-harness gap between authenticated API CRUD and a real
cross-device browser restore path. The cloud-sync proof can now verify that a
cloud save restores through the actual `/session?restore=...` workspace in two
separate browser profiles when an auth header is supplied.

## Product/Proof Change

- `scripts/validation/prove-cloud-sync-local.mjs` now runs an additional
  authenticated check:
  `authenticated-two-profile-browser-restore`.
- The check creates a cloud proof session, launches two isolated headless Chrome
  profiles, injects `YENTL_CLOUD_SYNC_PROOF_AUTH_HEADER` as an Authorization
  header through CDP, opens `/session?restore=<id>&view=overview`, and waits for
  restored workspace text.
- Each profile must show:
  - `Cloud sync two-profile proof`
  - `The budget vote happened last night.`
  - `Source health`
- The check fails on missing text, horizontal overflow, or console/runtime
  errors.
- The proof session is deleted in a `finally` block after the profile checks.
- Normal local runs without an auth header are unchanged and still prove the
  unconfigured/signed-out fallback path.

## Current Local Proof

`npm run cloud-sync:proof:local` passed in this environment:

- `cloud_mode`: `cloud_unavailable`
- checks:
  - `app-reachable`
  - `cloud-availability`
  - `unconfigured-list-response`
  - `unconfigured-save-response`
- failures: 0

Artifact:

- `docs/superpowers/validation/cloud-sync-local-proof.json`

## Verification

```bash
node --check scripts/validation/prove-cloud-sync-local.mjs
npx vitest run tests/cloud-sync-proof-script.test.ts tests/session-sync.test.ts tests/api/sessions-cloud.test.ts
npm run cloud-sync:proof:local
npx tsc --noEmit
npm run lint
npm run test:run
npm run build:automation
```

Results:

- Script syntax: passed.
- Focused cloud regression: 3 files, 14 tests passed.
- Local cloud fallback proof: passed.
- TypeScript: passed.
- Lint: passed.
- Full Vitest suite: 167 files, 1756 tests passed.
- Automation build: passed, 42 routes generated.

## Remaining M5 Work

- Run the authenticated proof with a real
  `YENTL_CLOUD_SYNC_PROOF_AUTH_HEADER`.
- Add a human/browser signed-in profile smoke once Clerk auth is available in
  the target environment.
- Repeat the authenticated proof against production after redeploy.
