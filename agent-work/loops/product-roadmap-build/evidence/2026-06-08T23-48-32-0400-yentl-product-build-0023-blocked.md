# YENTL-PRODUCT-BUILD-0023 c2_mech_05 preflight blocker

Timestamp: 2026-06-08T23:48:32-04:00

Status: blocked_needs_context

## Scope

Consumed exact build-ledger row: `YENTL-PRODUCT-BUILD-0023`

Intended target:

- `c2_mech_05_interruption_repair`
- Allowed sidecar path: `test-corpus-2/speaker-attribution/sidecars/c2_mech_05_interruption_repair.json`

No product sidecar or scorer output was changed for this row because transcript evidence did not support safe labeling.

## Preflight Evidence

Read from `test-corpus-2/transcripts/c2_mech_05.json`.

Full transcript:

- Total words: 1478
- Provider speakers across the full file: `0`
- First word starts at 7.2799997s
- Last word ends at 510.59s

0-90s target window:

- Word count: 236
- Provider speakers present: `0`
- Single detected turn: 7.28-89.77, provider speaker 0, mean speaker confidence about 0.740.
- Transcript text reads as a single-speaker BBC Question Time live-blog/article recap, not direct heated debate audio:
  - "BBC question time returns tonight with David Dimbleby..."
  - "Live updates from the show can be found below..."
  - "Polly McKenzie said that people have to be innocent until proven guilty..."

## Decision

Blocked instead of fabricating labels.

The manifest describes this row as a heated interruption/fragment-risk target where half-spoken fragments should not become standalone claims. The current 0-90s transcript has only one provider speaker and no observable interruption/repair sequence. Adding a sidecar as a clean single-speaker row would make the scorer greener while failing the intended failure-family coverage.

## Required Next Action

Needs human/product context or a replacement window:

- pick a different time span in `c2_mech_05` where the intended interruption/repair behavior is actually present,
- supply trusted captions/audio review, or
- replace this manifest row with a better candidate.

Do not create `test-corpus-2/speaker-attribution/sidecars/c2_mech_05_interruption_repair.json` from the current 0-90s transcript unless the product decision is to treat it as a single-speaker article-recap row rather than an interruption-repair row.
