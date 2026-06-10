# M4 Mobile/PWA Local Proof - 2026-06-10

## Scope

- Added `npm run mobile:proof:local` as a repeatable local browser proof for
  the mobile/PWA path.
- The proof launches Chrome for Testing with a temporary profile, visits the
  mobile start page, session source picker, share-target text route, saved
  sessions library, and TV room mode.
- Each route is checked at `390px`, `430px`, and `768px`.
- The proof fails on horizontal overflow, missing route-specific text, or
  console/runtime errors, and records small visible controls for review.

## Latest Result

Passing command:

```bash
npm run mobile:proof:local
```

Fresh proof written to:

- `docs/superpowers/validation/mobile-pwa-local-proof.json`

Key result:

```json
{
  "ok": true,
  "widths": [390, 430, 768],
  "routes": [
    "/mobile",
    "/session",
    "/session?title=Shared%20note&text=The%20claim%20is%20specific.",
    "/sessions",
    "/tv?demo=validation&sample=cable_008"
  ],
  "failures": []
}
```

## Product Fix Found By The Proof

- `/sessions` was rendering the correct local fallback UI while still making an
  unavailable cloud-sync request that logged a browser `503` error.
- The page now skips account-sync fetches when the public Clerk key is absent
  and shows the existing local fallback message directly.

## Visual Evidence

Added `/mobile` to the screenshot capture and route-review surfaces:

- `docs/superpowers/validation/screenshots/route-mobile.png`
- `docs/superpowers/validation/screenshots/route-mobile-mobile.png`
- `public/visual-evidence/flow-screenshots/current/route-mobile.png`
- `public/visual-evidence/flow-screenshots/current/route-mobile-mobile.png`

## Verification

- `npm run mobile:proof:local`
- `npx vitest run tests/mobile-pwa-proof-script.test.ts tests/public-entry-pages.test.tsx tests/manifest.test.ts tests/ux-flow-dashboard.test.tsx tests/sessions-library-page.test.tsx`
- `npx tsc --noEmit`
- `npm run lint` (`0` errors, existing `18` warnings)
- `npm run test:run`
- `npm run build:automation`
