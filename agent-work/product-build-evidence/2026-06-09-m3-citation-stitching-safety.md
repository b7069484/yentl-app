# M3 Citation Stitching Safety

Timestamp: 2026-06-09 21:59 EDT

## Scope

This was a focused M3 analysis-intelligence slice for confirmed verification citations.

Implemented:
- Narrowed confirmed-source stance matching so a stance ref can no longer attach to a sibling URL by broad prefix alone.
- Kept exact normalized matches and harmless query/hash variants.
- Added regressions for sibling URL prefixes and query-string variants.

## Why

Confirmed verification builds user-facing source cards from authoritative web-search citations plus model-emitted stance refs. The previous fallback could match URLs too broadly, which risked attaching a `supports` / `contradicts` stance to the wrong cited page when two URLs shared a path prefix. Yentl now defaults unmatched citations to `mixed` instead of over-attaching stance.

## Verification

Focused:
- `npx vitest run tests/verify-confirmed-citations.test.ts` passed: 1 file, 13 tests.

Full gates:
- `npx tsc --noEmit` passed.
- `npm run lint` passed with 0 errors and the existing 18-warning baseline.
- `npm run test:run` passed: 147 files, 1645 tests.
- `npm run build` passed.
- `npm run build:automation` passed.

## Remaining M3 Work

- Audit Devil's Advocate trigger/visibility against weak evidence states.
- Check claim/rhetoric ownership language in compact surfaces and exports.
