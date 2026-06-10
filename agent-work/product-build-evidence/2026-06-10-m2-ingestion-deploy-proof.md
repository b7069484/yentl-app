# M2 Ingestion Deploy Proof — 2026-06-10

## Command

```bash
npm run ingestion:proof:deploy
```

## Result

Pass with `deploy_blockers`. Core security and external ingest paths are green on `https://yentl.it`:

- consent gate (`428`)
- SSRF block (`400`)
- external article ingest (WCAG22)
- external media ingest (DeepSpeech smoke WAV)
- upload-audio consent gate + token with consent (`clientToken`)

## Deploy blockers (redeploy / env parity)

Production still diverges from local proof for:

- validation fixture article/media ingest
- PDF document ingest (`500`)
- document upload missing-file / unsupported-type (`500` instead of `400`/`415`)
- YouTube caption ingest for `fTznEIZRkLg` (`PRIVATE` on prod)

## Artifact

- `docs/superpowers/validation/ingestion-deploy-proof.json`