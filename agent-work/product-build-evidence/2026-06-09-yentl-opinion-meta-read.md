# 2026-06-09 - Yentl Opinion meta-read

## Product gap

The overview reference backlog marked `Yentl Opinion`, good-faith/bad-faith meta-read, live update state, and mobile overview as launch-critical gaps. The synthesis card already had paragraph/headline/per-speaker verdict rendering, but it did not surface a conversation-level opinion read or prove that validation demos hydrate that state through the real app path.

## Built

- Renamed the synthesis card heading to `Yentl Opinion`.
- Added a `Meta-read` panel derived from per-speaker faith verdicts:
  - `Good-faith read`
  - `Mixed-faith read`
  - `Bad-faith risk`
  - `Still forming`
- Added count chips for good-faith, mixed, bad-faith risk, and uncertain speaker reads.
- Added explicit caveats so bad-faith risk is not framed as a final judgment about intent.
- Preserved `per_speaker_verdicts` through synthesis refresh and error transitions so the overview does not lose its metaview while Yentl is rechecking.
- Added replay-derived validation sample synthesis to `/api/corpus-sample` and hydrated it through:
  - `/session?demo=validation&sample=...`
  - shared validation sample hydrator used by detail/learn routes.

## Verification

- `npx vitest run tests/api/corpus-sample.test.ts tests/session-page.test.tsx tests/synthesis-card.test.tsx tests/home-overview.test.tsx tests/watch-view.test.tsx tests/orchestrator-synthesis-state.test.ts`
  - 6 files passed, 114 tests passed.
- `npx vitest run tests/api/corpus-sample.test.ts tests/session-page.test.tsx tests/synthesis-card.test.tsx tests/orchestrator-synthesis-state.test.ts`
  - 4 files passed, 69 tests passed after the final build-fix edit.
- `npm run build:automation`
  - Passed.
- `npx tsc --noEmit`
  - Passed.
- `git diff --check`
  - Passed.

## Browser proof

- Desktop route: `http://localhost:3000/session?demo=validation&sample=cable_008&view=overview`
  - Verified `Yentl Opinion` visible.
  - Verified `data-testid="synthesis-meta-read"` visible.
  - Verified `data-testid="per-speaker-verdicts"` visible.
- Mobile viewport: `390x844`
  - Verified no horizontal overflow.
  - Verified meta-read panel stayed within viewport.
  - Verified per-speaker verdict section stayed within viewport.

## Current limitation

Validation sample synthesis is deterministic and replay-derived. It is not a live model result and deliberately says so in the card text. Live sessions still depend on `/api/synthesize` for model-generated opinion text and per-speaker verdicts.
