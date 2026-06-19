# 2026-06-11 M3 Structured Meta-Read Proof

## Scope

Moved Yentl Opinion's conversation-level meta-read from a UI-only derivation into
a first-class synthesis contract that can be generated, sanitized, persisted,
restored, displayed, and exported.

## Product Changes

- Added `SynthesisMetaRead` to the shared synthesis/session types.
- Added optional `analysis_scope` to `/api/synthesize` requests so end-session
  synthesis can identify `full_session` versus `live_window` reads.
- Updated the synthesis prompt/schema to request `meta_read` with posture,
  source health, scope, uncertainty, and next-question fields.
- Added server-side meta-read fallback/sanitization so older model output still
  returns a meta-read, and overconfident `source_health="strong"` is downgraded
  when source context or clean owned claims are thin.
- Threaded `meta_read` through orchestrator refresh/error/fresh states,
  session persistence, restore, validation sample response types, and exports.
- Updated `SynthesisCard` to prefer structured `meta_read` while preserving the
  older per-speaker verdict-derived fallback.
- Added markdown and shareable HTML report rendering for meta-read fields.

## Verification

Focused regression:

```bash
npx vitest run tests/synthesize-route.test.ts tests/orchestrator-synthesis-state.test.ts tests/synthesis-persistence.test.ts tests/synthesis-card.test.tsx tests/end-session-synthesis.test.ts tests/export/markdown.test.ts tests/export/report.test.ts
```

Result: 7 test files passed, 101 tests passed.

Broad gates:

```bash
npx tsc --noEmit
npm run lint
npm run test:run
npm run build:automation
```

Results:

- TypeScript: pass.
- Lint: pass.
- Full tests: 163 files passed, 1731 tests passed.
- Automation build: pass, 42/42 static pages generated.

## Remaining M3 Work

- Run the structured meta-read contract through longer deploy replay windows
  after the next production redeploy.
- Add corpus-level quality scoring for whether `posture`, `source_health`, and
  `uncertainty` match expected evidence depth.
