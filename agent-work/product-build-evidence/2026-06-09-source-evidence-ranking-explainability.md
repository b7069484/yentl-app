# 2026-06-09 - Source evidence ranking explainability

## Product gap

The source dossier ranked sources by evidence strength and marked the first source in each stance lane as `Strongest`, but the ranking ingredients were not visible enough. A user could see `score 38` without knowing that the score came from reputation tier, source excerpt presence, and image validation status.

## Built

- Added a visible evidence-breakdown line under each source in the grouped source comparison.
- Added a desktop hover/focus title with the same score explanation.
- Kept the scoring local and deterministic:
  - Reputation tier.
  - Excerpt presence.
  - Validated source image.
- The improvement applies to both claim detail and claim learn-more routes through the shared `SourceDossier`.

## Verification

- `npx vitest run tests/item-detail.test.tsx tests/learn-more.test.tsx`
  - 2 files passed, 54 tests passed.
- `npx vitest run tests/item-detail.test.tsx tests/learn-more.test.tsx tests/overview-selectors.test.ts tests/home-overview.test.tsx tests/session-page.test.tsx tests/api/corpus-sample.test.ts`
  - 6 files passed, 163 tests passed.
- `npm run build:automation`
  - Passed; Next build generated 39 static pages.
- `npx tsc --noEmit`
  - Passed.
- `git diff --check`
  - Passed.

## Browser proof

- Desktop route: `http://localhost:3000/session/detail/claim/solo_005-claim-1?demo=validation&sample=solo_005`
  - Verified `Strongest` remains visible in the `Supports` lane.
  - Verified visible evidence text: `Evidence: high reputation + excerpt + no image`.
  - Verified hover/focus title: `Evidence score 38: high reputation + excerpt + no image`.
  - Verified comparison stayed within the 1280px viewport.
- Mobile viewport: `390x844`
  - Verified no horizontal overflow.
  - Verified comparison and supports lane stayed within viewport.
  - Verified `Strongest` remains visible.
  - Verified evidence-breakdown text remains visible.

## Current limitation

This explains the source-level ranking, but it still does not map each excerpt phrase back to the exact claim words it supports or contradicts. Quote-level claim-to-source alignment remains a later product slice.
