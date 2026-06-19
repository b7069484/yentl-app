# M5 Cloud Sync Current-Tree Refresh - 2026-06-11

## Scope

Refreshed the cloud-sync proof after the launch-smoke and platform-proof changes so the current tree still has an honest saved-session continuity signal.

## Proof

Command:

```bash
YENTL_CLOUD_SYNC_PROOF_ORIGIN=http://localhost:3000 npm run cloud-sync:proof:local
```

Result: passed at `2026-06-12T00:21:06.800Z`.

Current local mode:

- app reachable: 200
- cloud configured: false
- cloud mode: `cloud_unavailable`
- list response: 503 `cloud_unavailable`
- save response: 503 `cloud_unavailable`
- authenticated proof requested: false
- failures: none

## Boundary

This is the expected local fallback proof. Authenticated cross-device cloud proof still requires a real `YENTL_CLOUD_SYNC_PROOF_AUTH_HEADER` against an environment with Clerk and database configuration.
