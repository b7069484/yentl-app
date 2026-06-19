# M4 Auth-Return Mobile Proof - 2026-06-11

## Scope

Closed the M4 auth-recovery gap for the current guest-first build by making
account fallback routes preserve safe internal return context and reject unsafe
external return targets.

## Product Change

- Added `lib/auth-return.ts` for sanitizing account return targets.
- `/signin` and `/signup` now preserve safe internal return paths such as
  `/session?source=audio-file` and `/sessions?filter=cloud` in their fallback
  actions when Clerk/account auth is not configured.
- Unsafe external return targets and auth-loop targets are ignored, and the
  fallback returns users to a fresh local `/session` path.
- The fallback copy now tells mobile users that source, saved-session, or share
  context can stay attached through the account step.

## Browser Proof

`npm run mobile:proof:local` now checks 17 route surfaces at `390px`, `430px`,
and `768px`, adding:

- `/signin?redirect_url=%2Fsession%3Fsource%3Daudio-file`
- `/signup?return_to=%2Fsessions%3Ffilter%3Dcloud`
- `/signin?redirect_url=https%3A%2F%2Fevil.example%2Fsession`

The proof verifies:

- safe sign-in return link: `/session?source=audio-file`
- safe sign-up return link: `/sessions?filter=cloud`
- unsafe external target is absent from rendered text/hrefs
- no horizontal overflow
- no console/runtime errors

Artifact:

- `docs/superpowers/validation/mobile-pwa-local-proof.json`

Latest proof summary:

```json
{
  "ok": true,
  "generated_at": "2026-06-11T18:24:05.376Z",
  "widths": [390, 430, 768],
  "route_count": 17,
  "check_count": 51,
  "failures": []
}
```

## In-App Browser Spot Check

At `390px`, the Browser check on
`/signin?redirect_url=%2Fsession%3Fsource%3Daudio-file` confirmed:

- `overflowX: 0`
- visible fallback copy includes `Return to your Yentl flow`
- the primary fallback action href is `/session?source=audio-file`

## Verification

```bash
node --check scripts/validation/prove-mobile-pwa-local.mjs
npx vitest run tests/auth-fallback.test.tsx tests/mobile-pwa-proof-script.test.ts
npx tsc --noEmit
npm run mobile:proof:local
npm run lint
npm run test:run
npm run build:automation
npx tsc --noEmit
```

Results:

- Focused auth/mobile tests: 2 files, 8 tests passed.
- Initial TypeScript check: passed.
- Mobile browser proof: passed, 17 route surfaces, 51 checks, 0 failures.
- Lint: passed.
- Full Vitest: 162 files, 1721 tests passed.
- Automation build: passed, 42/42 static pages.
- Final TypeScript check after build regenerated `.next/types`: passed.
