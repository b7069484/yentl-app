# YENTL-PRODUCT-BUILD-0016 Verification

Timestamp: 2026-06-08T18:38:43-04:00

## Scope

Independently verified the scheduled product-roadmap build for `YENTL-PRODUCT-BUILD-0016`.

Prior build evidence: `agent-work/loops/product-roadmap-build/evidence/2026-06-08T18-32-43-0400-yentl-product-build-0016.md`

No product code, manifests, sidecars, scorer logic, UI files, API files, provider files, or capture/consent behavior were changed in this verification pass.

## Verification

- PASS: `npx vitest run tests/speaker-attribution-score.test.ts`
  - 1 test file passed.
  - 2 tests passed.
- PASS: `npm run speaker-attribution:score`
  - `Speaker-attribution windows: 16`
  - `Scored: 3, partial: 0, missing labels: 13`
  - `Mean speaker purity: 100.0%`
  - `Mean claim-owner accuracy: 100.0%`
- PASS: report inspection from `test-corpus/speaker-attribution/report/speaker-attribution-report.json`
  - `windows: 16`
  - `scored: 3`
  - `partial: 0`
  - `missing_labels: 13`
  - `missing_transcripts: 0`
  - `solo_001_clean_control`: scored, `60-90s`, 104 words, speaker purity 1, claim-owner accuracy 1, WER 0
  - `solo_008_clean_control`: scored, `120-150s`, 82 words, speaker purity 1, claim-owner accuracy 1, WER 0
- PASS: `npx tsc --noEmit`

## Result

`YENTL-PRODUCT-BUILD-0016` is verified done.

This verification expands clean solo-control hard-window coverage from one smoke row to three scored rows. It does not claim robust speaker-attribution readiness; 13 sidecars remain missing and marker-owner accuracy still needs hard-window marker labels.
