# M6 Extension Latency Baselines

Timestamp: 2026-06-10

## Commands

```bash
npm run extension:proof:local
YENTL_EXTENSION_PROOF_MANUAL_CAPTURE=1 npm run extension:proof:local
npm run extension:proof:external
```

## Captured baselines (`latency_ms`)

| Proof | total_ms | capture_invocation_ms | first_transcript_wait_ms | panel_injection_ms |
|---|---:|---:|---:|---:|
| Local keyboard shortcut | 18030 | 1062 | 14030 | 16968 |
| Local popup automation | (see installed-extension-local-proof.json) | — | — | — |
| External Wikimedia popup | 14382 | 1209 | 5011 | 13173 |

Artifacts:

- `docs/superpowers/validation/installed-extension-local-proof.json`
- `docs/superpowers/validation/installed-extension-external-proof.json`