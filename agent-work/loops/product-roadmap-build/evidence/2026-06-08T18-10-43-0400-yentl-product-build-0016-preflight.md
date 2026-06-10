# YENTL-PRODUCT-BUILD-0016 Preflight

Timestamp: 2026-06-08T18:10:43-04:00

## Scope

Preflighted the queued immediate-wave product-roadmap row before the scheduled 6:30 PM worker.

No product code, sidecars, scorer logic, manifests, tests, package scripts, or reports were changed in this preflight.

## Findings

- `YENTL-PRODUCT-BUILD-0016` is still the only `ready_for_build` row assigned to `product-roadmap-build`.
- `test-corpus/transcripts/solo_001.json` exists.
- `test-corpus/transcripts/solo_008.json` exists.
- The current `solo_008_clean_control` manifest window (`120-150s`) is single-speaker according to provider labels.
- The current `solo_001_clean_control` manifest window (`60-120s`) is not a clean single-speaker span:
  - provider speaker `0`: about 34.64s
  - provider speaker `3`: about 18.88s
  - provider speaker `1`: about 0.32s
- A clean replacement span exists inside the same source:
  - `solo_001` `60-90s`
  - 104 words
  - provider speaker `0` only

## Ledger Adjustment

The row should allow the scheduled worker to adjust `test-corpus/speaker-attribution-windows.csv` for `solo_001_clean_control` from `60-120` to `60-90` before creating its sidecar. Without that adjustment, a one-speaker sidecar would misrepresent the evaluation truth.

The scheduled worker should still consume only `YENTL-PRODUCT-BUILD-0016`, add no sensitive/review-required labels, and leave the row `built_pending_verify` with evidence after running the row's verification.
