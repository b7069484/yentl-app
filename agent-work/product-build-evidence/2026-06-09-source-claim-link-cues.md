# 2026-06-09 - Source claim-link cues

## Product gap

The source dossier ranked and explained evidence strength, but it still did not show how a cited source excerpt connected back to the claim text. Users could see the strongest source, the excerpt, and the evidence score without a quick cue for which claim words the source was actually touching.

## Built

- Passed `claim.claim_text` into the shared `SourceDossier` from both claim detail and claim learn-more routes.
- Added a conservative `Claim link` line under each source comparison item.
- The cue uses exact shared terms between claim text and source excerpt, capped to five terms.
- Added honest fallback states:
  - `no source excerpt to compare`
  - `no direct claim-word overlap`
  - `claim text unavailable`
- Kept this as deterministic UI support, not a model judgment or source-fetching change.

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
  - Verified strongest source still visible.
  - Verified evidence text still visible.
  - Verified claim-link text: `Claim link: world, population`.
  - Verified no horizontal overflow.
- Mobile viewport: `390x844`
  - Verified no horizontal overflow.
  - Verified source comparison and supports lane stayed within viewport.
  - Verified `Strongest`, evidence breakdown, and claim-link text remain visible.

## Current limitation

This is a lexical overlap cue, not semantic entailment. It helps users inspect why an excerpt is relevant, but it does not yet highlight exact quote spans, handle stemming such as `safe` versus `safety`, or prove that the source supports or contradicts the full proposition.
