# M7 Launch Smoke — yentl.it

Timestamp: 2026-06-10

## Command

```bash
YENTL_SMOKE_BASE_URL=https://yentl.it npm run smoke:launch
```

## Result

All default launch smoke checks passed:

- manifest `share_target` → `/session`
- public entry pages (`/`, `/pricing`, `/faq`, `/demo`)
- public contact page
- guest-first `/session` entry (`200`)
- internal corpus sample not publicly exposed (`404`)
- internal project surfaces not publicly exposed

Skipped optional checks (not requested):

- rate-limit exhaustion (`YENTL_SMOKE_RATE_LIMIT=1`)
- Blob upload token (`YENTL_SMOKE_BLOB_TOKEN=1`)

## Implication

Production deploy at `https://yentl.it` passes the core M7 security/public-surface gate that local dev intentionally fails.