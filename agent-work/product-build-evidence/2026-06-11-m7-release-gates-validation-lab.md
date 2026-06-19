# M7 Release Gates In Validation Lab - 2026-06-11

## Scope

Expanded `/project/validation` so it shows every remaining launch proof family, not only local ingestion fixtures and the manifest-based canaries.

## Product/Proof Change

- Updated `lib/validation/fixtures.ts`.
  - Changed launch canaries to support multiple proof commands and proof artifacts.
  - Added release-gate entries for:
    - authenticated cross-device cloud sync
    - production current-tree smoke
- Updated `app/project/validation/page.tsx`.
  - Renders one or more proof commands per gate.
  - Renders optional template/manifest paths only where they exist.
  - Renders one or more proof artifacts per gate.
  - Keeps long commands and paths wrapped on mobile.
- Updated `tests/project-validation-page.test.tsx`.

## Cloud Sync Finding

The environment cannot run the authenticated cloud-sync proof right now:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: absent
- `DATABASE_URL`: absent
- `YENTL_CLOUD_SYNC_PROOF_AUTH_HEADER`: absent

The code path remains ready for the real proof through:

```bash
YENTL_CLOUD_SYNC_PROOF_AUTH_HEADER='Bearer ...' npm run cloud-sync:proof:local
YENTL_CLOUD_SYNC_PROOF_AUTH_HEADER='Bearer ...' npm run cloud-sync:proof:deploy
```

## Browser Proof

Target: `http://localhost:3000/project/validation`

Checks:

- Desktop 1280px: cloud-sync and production-smoke gates visible, 0 console errors, 0 horizontal overflow.
- Mobile 390px: cloud-sync and production-smoke gates visible, 0 console errors, 0 horizontal overflow.

## Verification

```bash
npx vitest run tests/project-validation-page.test.tsx tests/launch-canary-template-script.test.ts
npx tsc --noEmit --pretty false
npm run lint
git diff --check
npm run test:run
npm run build:automation
```

Results:

- Focused tests: 2 files passed, 6 tests passed.
- Typecheck: passed.
- Lint: passed.
- Diff check: passed.
- Full Vitest: 176 files passed, 1836 tests passed.
- Automation build: passed, 42/42 static pages.

## Boundary

This does not complete authenticated cloud sync or production smoke. It makes the remaining gates visible and actionable from the validation lab. Authenticated cloud sync still requires Clerk, database, and a real signed-in auth header. Production smoke still requires committing/pushing the current tree, green CI, deploy, and rerunning production launch smoke.
