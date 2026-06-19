# M3 Attribution Context And Source Blockers

Date: 2026-06-11

## Product Change

- Threaded transcript attribution metadata into synthesis utterance payloads:
  - `attribution_status`
  - `attribution_reasons`
  - `overlap_class`
  - `turn_id`
  - `segment_id`
- Threaded the same attribution/floor-state context into nearby transcript lines used by claim extraction.
- Added `test-corpus/speaker-attribution/source-blockers.json` so the hard-window proof can distinguish:
  - missing reviewed label
  - source mismatch
  - window mismatch
  - review-required label gap

## Why It Matters

Yentl's top-level analysis should not flatten a conversation into clean speaker lines when the underlying transcript says ownership is uncertain, quoted, clipped, or overlapping. The synthesis/meta-read layer now receives that floor-state context directly.

The speaker-attribution proof also no longer treats every missing hard-window sidecar as the same kind of chore. It now names unusable or stale corpus targets that need replacement instead of inviting fabricated labels.

## Verification

- `npx vitest run tests/synthesis-ownership-context.test.ts tests/synthesize-route.test.ts tests/claim-ownership-orchestrator.test.ts tests/analyze-rhetoric-attribution-context.test.ts`
- `npx vitest run tests/speaker-attribution-proof-script.test.ts tests/speaker-attribution-score.test.ts tests/synthesis-ownership-context.test.ts tests/claim-ownership-orchestrator.test.ts`
- `npx tsc --noEmit`
- `npm run analysis:proof:speaker-attribution`

## Current Attribution Launch State

- Proof status: `ok: true`
- Launch ready: `false`
- Scored hard windows: 9 of 16
- Missing transcripts: 0
- Missing labels: 7
- Source/window blockers now explicitly classified:
  - `political_010_collapsed_panel`: source mismatch
  - `c2_mech_05_interruption_repair`: source mismatch
  - `c2_platform_03_many_speakers`: source mismatch
  - `c2_quote_09_harmful_quote`: window mismatch

## Next Move

Replace the bad attribution targets with real multi-speaker/platform/quote-boundary windows, then add reviewed labels for the remaining sensitive rows instead of forcing the current bad windows to pass.
