# 2026-06-11 M3 Meta-Read Quality Scoring Proof

## Scope

Closed the M3 quality-scoring gap for Yentl Opinion's structured `meta_read`.
The app already produced a conversation-level meta-view; this slice makes the
sanitizer and proof harness explicitly grade whether posture, source health,
scope, and uncertainty match the actual evidence depth.

## Product Change

- Added `SynthesisMetaReadQualityAssessment` and
  `assessSynthesisMetaReadQuality(...)` to `lib/synthesis-meta-read.ts`.
- The assessment records:
  - expected vs actual posture, source health, and scope
  - clean owned claim count
  - uncertain claim count
  - marker count
  - partial claim count
  - source-context presence
  - mismatch reasons and a 0-100 score
- Strengthened `sanitizeSynthesisMetaRead(...)` so overconfident model output is
  capped by evidence depth:
  - thin/no-claim windows cannot remain `good_faith`
  - missing source context and zero clean claims cannot remain `strong`
  - request scope still overrides model scope
- `/api/synthesize` now passes sanitized speaker verdicts into meta-read
  sanitization so the evidence-depth cap can use the same per-speaker context as
  the rest of synthesis.
- `npm run analysis:proof:metaread` now writes quality details for every case,
  plus raw-vs-sanitized scoring for an overconfident model-output case.

## Proof

Meta-read proof:

```bash
npm run analysis:proof:metaread
```

Result: passed at `2026-06-11T21:13:33.403Z`, 5 corpus-style cases plus the
sanitizer case, 0 failures.

Quality artifact highlights:

```json
{
  "case_count": 5,
  "check_count": 6,
  "failures": 0,
  "raw_overconfident_score": 0,
  "sanitized_score": 100,
  "raw_mismatches": ["posture", "source_health", "scope", "uncertainty"]
}
```

Focused regression:

```bash
npx vitest run tests/synthesis-meta-read.test.ts tests/synthesis-metaread-proof-script.test.ts tests/synthesize-route.test.ts tests/api/model-route-security.test.ts tests/synthesis-card.test.tsx tests/synthesis-persistence.test.ts tests/end-session-synthesis.test.ts
```

Result: 7 files passed, 120 tests passed.

Broad gates:

```bash
npx tsc --noEmit
npm run lint
npm run test:run
npm run build:automation
git diff --check
```

Results:

- TypeScript: passed.
- Lint: passed.
- Full Vitest: 167 files passed, 1761 tests passed.
- Automation build: passed, 42/42 static pages.
- Whitespace diff check: passed.

## Remaining M3 Work

- Repeat the meta-read proof after production redeploy.
- Add larger real transcript replay scoring once replay artifacts include
  synthesis output, not just claims and markers.
