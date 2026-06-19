# M7 CI Release-Gate Hardening - 2026-06-11

## Scope

Closed the gap between local launch proof and CI. The CI workflow now checks the production build and the local release-candidate smoke contract, so PRs cannot go green on type/lint/unit tests alone while the built app, mobile/PWA manifest contract, or TV/mobile entry surfaces are broken.

## Product/Proof Change

- `.github/workflows/ci.yml`
  - Added `npm run build:automation`.
  - Added `bash scripts/run-local-launch-smoke.sh`.
- `scripts/run-local-launch-smoke.sh`
  - Starts `next start` from the existing production build.
  - Waits for `/session`.
  - Runs `YENTL_SMOKE_BASE_URL=<local> YENTL_SMOKE_SKIP_INTERNAL=1 npm run smoke:launch`.
  - Cleans up the server on exit.
- `tests/ci-workflow.test.ts`
  - Locks that CI includes the production build and local release-smoke gate.
  - Locks that the smoke runner uses `next start`, waits for `/session`, uses the explicit local-only internal skip, and traps cleanup.

## Proof

Focused proof:

```bash
npx vitest run tests/ci-workflow.test.ts tests/launch-smoke-script.test.ts
bash scripts/run-local-launch-smoke.sh
```

Result: 2 files passed, 6 tests passed. The local release-smoke runner started `next start`, passed the launch smoke contract, and stopped the server.

Broad verification:

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
- Full Vitest: 171 files passed, 1809 tests passed.
- Automation build: passed, 42/42 static pages.
- Diff check: passed.

## Boundary

This does not push the current dirty tree or prove the GitHub-hosted runner on these uncommitted changes yet. It updates the workflow so the next PR/commit will run the stronger release gate in CI.
