# M3 Synthesis Speaker Verdict Safety

Timestamp: 2026-06-09 22:15 EDT

## Scope

- Added deterministic post-processing to `/api/synthesize` so model-provided `per_speaker_verdicts` cannot overstate factual grades.
- Speaker factual grades are now recomputed from clean owned claims:
  - Owned by the speaker.
  - Attribution absent for legacy data or resolved as `confident`, `probable`, or `manual_corrected`.
  - Not `uncertain`, `unsafe_overlap`, `quote_or_clip`, or `not_available`.
  - Not `quoted`, `reported`, `mocked`, `questioned`, or `unclear`.
- Unsupported model factual grades are downgraded or corrected with deterministic one-line caveats.
- Faith grades remain model-provided because the current synthesis request does not include per-speaker marker counts.

## Files

- `app/api/synthesize/route.ts`
- `tests/synthesize-route.test.ts`

## Verification

- Focused synthesis/security set passed:
  - `npm run test:run -- tests/synthesize-route.test.ts tests/synthesis-ownership-context.test.ts tests/api/model-route-security.test.ts`
  - 3 files, 48 tests.
- `npm run lint` passed with 0 errors and the existing 18-warning baseline.
- `npm run test:run` passed: 148 files, 1655 tests.
- `npm run build:automation` passed.
- `npm run build` passed.
- Standalone `npx tsc --noEmit` passed.

## Notes

- Two `npx tsc --noEmit` attempts failed while running concurrently with `next build` because `.next/types` files were being rewritten. The same TypeScript command passed when rerun alone after build completion.
- No automations, cron jobs, staging, commits, pushes, deployments, or dependency installs were performed.
