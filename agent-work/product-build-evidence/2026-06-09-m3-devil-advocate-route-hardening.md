# M3 Devil's Advocate Route Hardening

Timestamp: 2026-06-09 22:01 EDT

## Scope

This was a focused M3 analysis-intelligence and route-safety slice for the Devil's Advocate rigor layer.

Implemented:
- Added declared JSON body-size rejection to `/api/devil-advocate`.
- Added invalid JSON handling so malformed requests return `400` instead of throwing through the route.
- Added route tests proving invalid and oversized requests do not call Grok.

## Why

Devil's Advocate is a trust layer. It should fail predictably and quietly when input is malformed or oversized, rather than crashing or reaching the model with a bad payload. This aligns it with the other model routes.

## Verification

Focused:
- `npx vitest run tests/devil-advocate-route.test.ts tests/devil-advocate-ownership-context.test.ts` passed: 2 files, 10 tests.
- `npx vitest run tests/api/model-route-security.test.ts` passed: 1 file, 26 tests.

Full gates:
- `npx tsc --noEmit` passed.
- `npm run lint` passed with 0 errors and the existing 18-warning baseline.
- `npm run test:run` passed: 147 files, 1647 tests.
- `npm run build` passed.
- `npm run build:automation` passed.

## Remaining M3 Work

- Review compact surfaces for whether Devil's Advocate confidence and weak assumptions are visible enough.
- Check claim/rhetoric ownership labels in mobile, extension, TV, and exports.
