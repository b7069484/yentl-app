# M3 Rhetoric Marker Attribution Safety

Timestamp: 2026-06-09 22:18 EDT

## Scope

- Hardened marker attribution assembly so transcript evidence is the safety floor.
- Model output can no longer upgrade an unsafe/uncertain transcript span to `confident`.
- Model output can no longer hide a transcript overlap class by returning `overlap_class: "none"`.
- Model-provided `source_turn_ids` and `source_segment_ids` are trusted only when they match overlapping transcript ids; otherwise transcript ids are used.
- Model output can still be more conservative than transcript evidence, e.g. marking a confident span as uncertain.

## Files

- `lib/client/orchestrator.ts`
- `tests/analyze-rhetoric-attribution-context.test.ts`

## Verification

- Focused rhetoric attribution set passed:
  - `npm run test:run -- tests/analyze-rhetoric-attribution-context.test.ts tests/marker-attribution-ui.test.tsx tests/transcript-segment-types.test.ts`
  - 3 files, 19 tests.
- `npx tsc --noEmit` passed.
- `npm run lint` passed with 0 errors and the existing 18-warning baseline.
- `npm run test:run` passed: 148 files, 1657 tests.
- `npm run build:automation` passed.
- `npm run build` passed.

## Notes

- This complements the UI attribution pass: the UI now avoids overclaiming unresolved marker ownership, and the client attribution layer now prevents unsafe model upgrades before markers reach the store.
- No automations, cron jobs, staging, commits, pushes, deployments, or dependency installs were performed.
