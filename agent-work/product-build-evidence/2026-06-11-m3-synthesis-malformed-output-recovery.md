# 2026-06-11 M3 Synthesis Malformed Output Recovery

## Scope

During the external speech proof, one live `/api/synthesize` call returned a
model-wrapper-shaped object where valid synthesis JSON was embedded as an object
key and interrupted by tool markup before the final closing brace. The route
logged an `AI_NoObjectGeneratedError` and returned `500` before a later call
recovered.

## Product Change

- Hardened `app/api/synthesize/route.ts` recovery parsing so it can:
  - strip `</parameter>` / `</invoke>` tails;
  - recover JSON embedded as an object key;
  - rebalance the obvious `{ "text", "headlines" }` synthesis object when the
    wrapper tail cuts off the final object brace.
- Added regression coverage in `tests/synthesize-route.test.ts`.

## Verification

Focused:

```bash
npx vitest run tests/synthesize-route.test.ts tests/synthesis-meta-read.test.ts tests/synthesis-metaread-proof-script.test.ts
npx tsc --noEmit
```

Broad:

```bash
git diff --check
npm run lint
npm run test:run
npm run build:automation
```

Results:

- TypeScript: passed.
- Lint: passed.
- Full Vitest: 169 files, 1773 tests passed.
- Automation build: passed, 42/42 routes generated.
- Whitespace diff check: passed.
