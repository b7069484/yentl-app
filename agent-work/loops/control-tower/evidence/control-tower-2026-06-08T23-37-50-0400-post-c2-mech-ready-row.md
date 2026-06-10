# Control tower post-product sidecar reconciliation

Timestamp: 2026-06-08T23:37:50-04:00

Status: WARN/no STOP

## Result

`YENTL-PRODUCT-BUILD-0020` is verified done for the safe `cable_008_panel_open` sidecar slice.

The originally seeded paired target, `political_010_collapsed_panel`, was not safe to label automatically. It is now split to `YENTL-PRODUCT-BUILD-0021` as `blocked_needs_context`.

## Verification

- Focused scorer tests passed.
- `npm run speaker-attribution:score` passed:
  - 16 windows
  - 6 scored
  - 0 partial
  - 10 missing labels
  - 0 missing transcripts
  - mean speaker purity 99.7%
  - mean claim-owner accuracy 100.0%
- Report inspection showed `cable_008_panel_open` scored with speaker purity 0.9961127274503445, claim-owner accuracy 1, WER 0, and no missing labels.
- `npx tsc --noEmit` passed.

## Blocked Split

`YENTL-PRODUCT-BUILD-0021` captures the unsafe political row:

- `political_010` full transcript has 1783 words.
- Provider speakers across the full transcript: `0`.
- The 0-90s window reads as a single-channel recap of a debate, not direct multi-speaker debate audio.
- Required response: do not fabricate multi-speaker labels; get human/product context, trusted captions/audio review, or a replacement window.

## New Exact Ready Row

Seeded `YENTL-PRODUCT-BUILD-0022` for the next non-review corpus-2 mechanics sidecar:

- Target: `c2_mech_01_crosstalk`
- Allowed scope: `test-corpus-2/speaker-attribution/sidecars/c2_mech_01_crosstalk.json` plus generated scorer report outputs.
- Guardrail: preflight transcript evidence first; if ambiguous, write blocker/no-op evidence instead of inventing labels.

## Required Next Action

The next eligible `product-roadmap-build` worker should consume `YENTL-PRODUCT-BUILD-0022` at most once. Other lanes should no-op unless an exact ready row exists for their lane. Preserve the truth that attribution remains incomplete and no marker-owner readiness claim is allowed.
