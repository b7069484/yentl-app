# 2026-06-11 M3 Speaker Attribution Hard-Window Proof

## Scope

Added a repeatable launch-style proof for multispeaker attribution quality. This
turns the existing hard-window corpus into an explicit gate for speaker purity,
claim-owner accuracy, unsafe attribution recall, and quote/stance risk tracking.

## Product/Proof Change

- Added `analysis:proof:speaker-attribution`.
- Added `scripts/validation/prove-speaker-attribution.ts`.
- Tightened `scripts/test-corpus/score-speaker-attribution.ts` so quoted,
  mocked, or questioned claim labels are no longer counted as automatic
  quote-vs-endorsement errors.
- The scorer now separates:
  - `non_asserted_claim_spans`
  - `unsafe_non_asserted_claim_spans`
  - `quote_vs_endorsement_errors`
- Added regression coverage in
  `tests/speaker-attribution-proof-script.test.ts`.

## Proof

Command:

```bash
npm run analysis:proof:speaker-attribution
```

Result:

```json
{
  "ok": true,
  "launch_ready": false,
  "summary": {
    "windows": 16,
    "scored": 9,
    "missing_labels": 7,
    "missing_transcripts": 0,
    "mean_speaker_purity": 0.9975402269130341,
    "mean_claim_owner_accuracy": 1,
    "unsafe_attribution_recall": 1,
    "quote_vs_endorsement_errors": 1,
    "non_asserted_claim_spans": 5,
    "unsafe_non_asserted_claim_spans": 1
  }
}
```

Passing checks:

- No missing transcripts.
- 9 scored hard windows.
- Mean speaker purity >= 0.95.
- Mean claim-owner accuracy >= 0.95.
- Unsafe attribution recall = 1.0 for labeled unsafe windows.

Current launch blockers:

- `political_010_collapsed_panel`
- `israel_010_sensitive_boundary`
- `holocaust_010_historical_framing`
- `c2_mech_05_interruption_repair`
- `c2_quote_09_harmful_quote`
- `c2_ident_10_identity_boundary`
- `c2_platform_03_many_speakers`

Artifacts:

- `docs/superpowers/validation/speaker-attribution-proof.json`
- `test-corpus/speaker-attribution/report/speaker-attribution-report.json`
- `public/speaker-attribution-report/speaker-attribution-report.json`

## Boundary

This proof validates the currently labeled hard windows and names the remaining
labeling gaps. It is not a full launch pass until the seven missing sidecars are
reviewed and scored.
