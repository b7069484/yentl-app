# YENTL-PRODUCT-BUILD-0015 Independent Verification

Timestamp: 2026-06-08T17:24:06-04:00
Lane: product-roadmap-build
Status: verified_done

## Scope

Independently verify `YENTL-PRODUCT-BUILD-0015`, the hard-window speaker-attribution evaluation pack and scorer.

## Verification Commands

- `npx vitest run tests/speaker-attribution-score.test.ts`: PASS, 1 file / 2 tests.
- `npm run speaker-attribution:score`: PASS.
  - Windows: 16.
  - Scored: 1.
  - Partial: 0.
  - Missing labels: 15.
  - Missing transcripts: 0.
  - Mean speaker purity: 100%.
  - Mean claim-owner accuracy: 100%.
- `npx tsc --noEmit`: PASS.
- Direct public-report check against the Yentl dev server: PASS for `/speaker-attribution-report/index.html`.

## Smoke Window Correction

The independent pass caught and corrected a sidecar boundary mismatch in `test-corpus/speaker-attribution/sidecars/solo_003_smoke_single_speaker.json`. The scorer includes transcript words that overlap the window edges, so the reference text now includes the overlapping first and last words.

After correction, the scored smoke window reports:

- `label_status`: `scored`
- `speaker_purity`: `1`
- `claim_owner_accuracy`: `1`
- `wer`: `0`
- `missing_labels`: `[]`

## Result

`YENTL-PRODUCT-BUILD-0015` is verified done as an evaluation-harness slice.

Important limit: the report still shows 15 missing sidecars. That is the correct blocker state and does not permit a robust speaker-attribution launch claim.
