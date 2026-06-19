# M7 Launch Canary Template Workflow - 2026-06-11

## Scope

Made the remaining external launch blockers easier to execute without weakening the release gate. The templates are worksheets only; they do not count as passing evidence.

## Product/Proof Change

- Added `scripts/validation/create-launch-canary-templates.mjs`.
  - Generates template manifests for sensitive attribution review, physical iOS/Android canaries, and large real media canaries.
  - Reads the current speaker-attribution proof and pre-fills the required sensitive review window IDs.
  - Writes `docs/superpowers/validation/launch-canary-template-summary.json`.
- Added `npm run release:canary-templates`.
- Added generated templates:
  - `agent-work/validation/sensitive-attribution-reviews.template.json`
  - `agent-work/validation/mobile-device-canaries.template.json`
  - `agent-work/validation/large-real-media-canaries.template.json`
- Updated `/project/validation`.
  - Added a Launch Canaries section that names the external proof still required.
  - Shows each proof command, template path, real manifest path, proof artifact, and evidence needed.
  - Fixed mobile wrapping for long validation target paths that were causing horizontal overflow.
- Added `tests/launch-canary-template-script.test.ts`.
- Updated `tests/project-validation-page.test.tsx`.

## Proof

Command:

```bash
npm run release:canary-templates
```

Result:

- Passed.
- Wrote 3 templates.
- Sensitive attribution template includes 5 required review windows from the current speaker-attribution proof.

Readiness honesty check:

```bash
npm run release:readiness
```

Result:

- Passed as a report.
- `launch_ready: false`.
- External proof summary remains 0/3 passing until real manifests/evidence are supplied.

## Browser Proof

Target: `http://localhost:3000/project/validation`

Checks:

- Desktop 1280px: Launch canaries visible, 0 console errors, 0 horizontal overflow.
- Mobile 390px: Launch canaries visible, 0 console errors, 0 horizontal overflow.

## Verification

```bash
node --check scripts/validation/create-launch-canary-templates.mjs
npx vitest run tests/launch-canary-template-script.test.ts tests/project-validation-page.test.tsx tests/large-real-media-canary-proof-script.test.ts tests/mobile-device-canary-proof-script.test.ts tests/sensitive-attribution-review-proof-script.test.ts tests/release-readiness-proof-script.test.ts
npx vitest run tests/launch-canary-template-script.test.ts tests/project-validation-page.test.tsx
npx tsc --noEmit --pretty false
npm run lint
git diff --check
npm run test:run
npm run build:automation
```

Results:

- Script syntax: passed.
- Focused canary/readiness tests: 6 files passed, 24 tests passed.
- Focused page/template tests after wrapping fix: 2 files passed, 6 tests passed.
- Typecheck: passed.
- Lint: passed.
- Diff check: passed.
- Full Vitest: 176 files passed, 1836 tests passed.
- Automation build: passed, 42/42 static pages.

## Boundary

This does not complete the external proof. The launch blockers remain until the template files are copied to their real manifest paths with real editorial review, real device evidence, and real production-like media canary evidence.
