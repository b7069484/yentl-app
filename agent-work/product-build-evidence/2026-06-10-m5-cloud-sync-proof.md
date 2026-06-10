# M5 Cloud Sync Proof Scaffold

Timestamp: 2026-06-10

## Scope

- Added `scripts/validation/prove-cloud-sync-local.mjs` with graceful mode detection.
- Added `npm run cloud-sync:proof:local` and `npm run cloud-sync:proof:deploy`.
- Added `tests/cloud-sync-proof-script.test.ts` static guard.

## Verified locally (no Clerk)

```bash
npm run cloud-sync:proof:local
```

Artifact: `docs/superpowers/validation/cloud-sync-local-proof.json`

- `cloud_mode: cloud_unavailable`
- `GET /api/sessions` → `503 cloud_unavailable`
- `POST /api/sessions` with valid payload → `503 cloud_unavailable`

## Verified on production host

```bash
npm run cloud-sync:proof:deploy
```

Artifact: `docs/superpowers/validation/cloud-sync-deploy-proof.json`

- `cloud_mode: signed_out`
- `GET /api/sessions` → `401 signed_out`
- `POST /api/sessions` with valid payload → `401 signed_out`
- `GET /api/sessions/[id]` → `401 signed_out`
- malformed save payload → `400 invalid_request`

## Remaining gate

Authenticated cross-device CRUD proof still needs `YENTL_CLOUD_SYNC_PROOF_AUTH_HEADER` with a signed-in Clerk session on a configured deployment.