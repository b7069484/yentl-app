# M7 Trust/Copy Deploy Proof

Timestamp: 2026-06-10

## Command

```bash
npm run trust:proof:deploy
```

## Result

All required trust/legal page checks passed on `https://yentl.it`.

Artifact: `docs/superpowers/validation/trust-copy-deploy-proof.json`

## Deploy blockers (repo ahead of production)

Production FAQ is missing contact/privacy copy that was added locally in `app/faq/page.tsx`:

- `/contact` link
- `privacy@yentl.it` mailto

Redeploy required to clear `deploy_blockers` in the proof JSON.

## Product fix in repo

- `app/faq/page.tsx` now links to the contact page and publishes `privacy@yentl.it`.