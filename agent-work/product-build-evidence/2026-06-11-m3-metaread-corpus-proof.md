# 2026-06-11 M3 Meta-Read Corpus Proof

## Scope

Added a deterministic corpus-style proof for Yentl Opinion's structured
`meta_read` so the conversation-level read is evaluated for posture,
source-health, scope, uncertainty, and next-question behavior.

## Product Changes

- Moved synthesis meta-read scoring and sanitizing into
  `lib/synthesis-meta-read.ts` as the single shared implementation.
- Updated `/api/synthesize` to use the shared scorer/sanitizer.
- Validation synthesis fixtures now receive a structured `meta_read` without
  regrading their known fixture speaker verdicts.
- Added `npm run analysis:proof:metaread`, which writes
  `docs/superpowers/validation/synthesis-metaread-proof.json`.

## Proof Coverage

The proof checks five corpus-style situations:

- thin live window with no claims/source context -> `insufficient` and `unknown`
- good-faith full session with multiple clean sourced claims -> `good_faith` and
  `strong`
- repeated contradicted claims plus markers -> `bad_faith_risk`
- quoted/reported claims -> excluded from clean owned claims
- mixed full-session partial evidence -> `mixed` and `mixed`

It also checks that overconfident model output is sanitized: `source_health`
cannot remain `strong` when the request has no source context and too few clean
owned claims.

## Verification

Proof script:

```bash
npm run analysis:proof:metaread
```

Result: pass, 5 cases plus sanitizer check, no failures.

Focused regression:

```bash
npx vitest run tests/synthesis-meta-read.test.ts tests/synthesis-metaread-proof-script.test.ts tests/synthesize-route.test.ts tests/api/model-route-security.test.ts tests/synthesis-card.test.tsx tests/synthesis-persistence.test.ts tests/end-session-synthesis.test.ts
```

Result: 7 test files passed, 117 tests passed.

Broad gates:

```bash
npx tsc --noEmit
npm run lint
npm run test:run
npm run build:automation
```

Results:

- TypeScript: pass.
- Lint: pass.
- Full tests: 165 files passed, 1738 tests passed.
- Automation build: pass, 42/42 static pages generated.

## Remaining M3 Work

- Run the same meta-read proof after production deploy.
- Add larger real transcript replay scoring once replay artifacts include
  synthesis output, not just claims and markers.
