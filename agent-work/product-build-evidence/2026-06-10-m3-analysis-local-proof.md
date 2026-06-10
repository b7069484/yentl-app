# M3 Analysis Local Proof - 2026-06-10

## Scope

- Added `npm run analysis:proof:local` as a repeatable local proof for corpus
  replay and speaker-attribution quality.
- Replays three validation-functional corpus samples against the live local API.
- Scores speaker-attribution windows from the existing labeled sidecar set.

## Latest Result

Passing command:

```bash
npm run analysis:proof:local
```

Fresh proof written to:

- `docs/superpowers/validation/analysis-local-proof.json`

Key result:

```json
{
  "ok": true,
  "checks": [
    "corpus-replay-cable_008",
    "corpus-replay-solo_005",
    "corpus-replay-interview_002",
    "speaker-attribution-score"
  ],
  "failures": []
}
```

Replay highlights:

- `cable_008`: 1 claim, 6 rhetoric markers, speaker ownership preserved.
- `solo_005`: 5 claims, 0 errors across 12 replayed utterances.
- `interview_002`: 2 rhetoric markers, 0 errors across 12 replayed utterances.

Attribution highlights:

- 9 scored windows
- mean speaker purity: 99.8%
- mean claim-owner accuracy: 100.0%
- unsafe attribution recall: 100.0%

## Verification

- `npm run analysis:proof:local` passed.
- `npx vitest run tests/analysis-proof-script.test.ts` passed.

## Remaining M3 Work

- Replay with `verify=provisional` / `verify=confirmed` on a deployed host.
- Broader uncertainty/meta-read proof beyond the current attribution sidecars.
- Source evidence scoring review across more corpus categories.