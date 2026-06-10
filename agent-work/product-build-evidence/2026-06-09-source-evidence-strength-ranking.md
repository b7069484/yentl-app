# 2026-06-09 - Source evidence strength ranking

## Product gap

Grouped source lanes made support, contradiction, and mixed evidence easier to compare, but sources inside each lane were still presented in input order. Reviewers needed the strongest citation in each lane surfaced first with a visible cue.

## Built

- Added evidence-strength sorting inside `SourceDossier`.
- Sort signal combines:
  - Reputation tier.
  - Presence of a source excerpt.
  - Validated source image evidence.
- Added a `Strongest` badge to the first source in each non-empty stance lane.
- Added a compact evidence score next to source domain, reputation, and image status.
- The behavior is inherited by both claim detail and claim learn-more routes because they share `SourceDossier`.

## Verification

- `npx vitest run tests/item-detail.test.tsx tests/learn-more.test.tsx`
  - 2 files passed, 54 tests passed.

## Browser proof

- Desktop route: `http://localhost:3000/session/detail/claim/solo_005-claim-1?demo=validation&sample=solo_005`
  - Verified `Strongest` visible in the `Supports` lane.
  - Verified World Bank WDI source shows `score 38`.
  - Verified comparison stayed within viewport.
- Mobile viewport: `390x844`
  - Verified no horizontal overflow.
  - Verified `Strongest` remains visible.
  - Verified comparison stayed within viewport.

## Current limitation

The score is an explainable local ranking cue, not a model judgment. A later pass should make the scoring tooltip explicit and add quote-level anchors from source excerpts back to claim text.
