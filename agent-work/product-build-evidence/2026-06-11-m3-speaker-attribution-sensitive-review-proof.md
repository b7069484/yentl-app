# M3 Speaker Attribution Sensitive-Review Proof - 2026-06-11

## Scope

Hardened the speaker-attribution launch proof so the scored multi-speaker gate and the public-sensitive-review gate are not collapsed into one vague `launch_ready` flag.

## Product/Proof Change

- `scripts/validation/prove-speaker-attribution.ts` now emits `public_claims_review_status`.
- The proof now names `human_review_required_windows` with source id, failure family, expected risk, label status, and scoring metrics.
- `scored_windows` now includes `review_required`, `failure_family`, and `expected_risk` so downstream launch reports can distinguish clean controls from sensitive public-claim rows.
- `tests/speaker-attribution-proof-script.test.ts` now locks the review-status contract.

## Proof

Focused proof:

```bash
npx vitest run tests/speaker-attribution-proof-script.test.ts
npx tsx scripts/validation/prove-speaker-attribution.ts
```

Result: 1 file passed, 5 tests passed. Speaker attribution proof passed at `2026-06-12T00:14:13.859Z`.

Current proof result:

- `launch_ready`: true
- scored windows: 16/16
- mean speaker purity: 0.9967
- mean claim-owner accuracy: 1
- unsafe attribution recall: 1
- quote-vs-endorsement errors: 0
- public claims review status: `review_required_before_public_claims`
- human-review-required windows: 5
  - `israel_010_sensitive_boundary`
  - `holocaust_010_historical_framing`
  - `c2_quote_09_brown_quote_boundary`
  - `c2_ident_10_identity_boundary`
  - `c2_platform_07_clip_stack`

Broad verification after this change:

```bash
npx tsc --noEmit
npm run lint
npm run test:run
npm run build:automation
git diff --check
```

Results:

- Typecheck: passed.
- Lint: passed.
- Full Vitest: 170 files passed, 1805 tests passed.
- Automation build: passed, 42/42 static pages.
- Diff check: passed.

## Boundary

This does not claim human/editorial review is complete. It makes that remaining public-claims review gate machine-readable while preserving the current hard-window scoring proof.
