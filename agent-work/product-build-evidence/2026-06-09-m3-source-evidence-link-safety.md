# M3 Source Evidence Link Safety

Timestamp: 2026-06-09 21:55 EDT

## Scope

This was a focused M3 analysis-intelligence slice for evidence explainability and overclaim prevention.

Implemented:
- Added `SourceClaimLinkStrength` with `direct`, `weak`, and `none` states.
- Changed source dossier linked counts to count only direct claim-source alignment.
- Preserved weak single-word overlap in the UI/export copy as `weak overlap only: ...` instead of counting it as directly linked evidence.
- Preserved short numeric terms like `30` and `42` so dates, amounts, and other numeric anchors can still create direct alignment when appropriate.

## Why

Before this slice, a source could be counted as directly linked to a claim if it shared one generic non-stopword such as `city`, `earth`, or `safety`. That made source summaries look stronger than the evidence warranted. Yentl now distinguishes weak overlap from direct support while still showing the user why the source was considered.

## Verification

Focused:
- `npx vitest run tests/source-evidence.test.ts tests/item-detail.test.tsx tests/export/json.test.ts tests/export/markdown.test.ts tests/export/report.test.ts tests/learn-more.test.tsx` passed: 6 files, 94 tests.
- `npx vitest run tests/session-storage.test.ts` passed: 1 file, 19 tests.

Full gates:
- `npx tsc --noEmit` passed.
- `npm run lint` passed with 0 errors and the existing 18-warning baseline.
- `npm run test:run` passed: 147 files, 1643 tests.
- `npm run build` passed.
- `npm run build:automation` passed.

## Remaining M3 Work

- Audit prompt schemas and parser fallbacks for explicit uncertainty language.
- Tighten Devil's Advocate visibility and whether it is generated only when enough evidence exists.
- Check speaker/ownership safeguards in rhetoric and claim outputs against current UI/export language.
