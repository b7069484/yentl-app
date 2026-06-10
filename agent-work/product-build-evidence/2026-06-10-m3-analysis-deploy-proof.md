# M3 Analysis Deploy Proof

Timestamp: 2026-06-10

## Commands

```bash
npm run analysis:proof:deploy:provisional
npm run analysis:proof:deploy:confirmed
```

## Result

Both deploy verification modes passed against `https://yentl.it` for `cable_008`, `solo_005`, and `interview_002` (10 utterances each).

Artifacts:

- `docs/superpowers/validation/analysis-deploy-provisional-proof.json`
- `docs/superpowers/validation/analysis-deploy-confirmed-proof.json`

Highlights:

- Provisional: successful verifications on cable/solo claims; interview produced rhetoric markers.
- Confirmed: cable 1 confirmed claim, solo 2 confirmed claims (1 failed), interview rhetoric-only window.
- Deploy rhetoric `400` responses are tolerated when claim verification still succeeds.

## Remaining depth

- Longer windows and `verify=both` on deploy.
- Uncertainty/meta-read behavior review on longer corpus segments.