# 2026-06-09 - Source alignment summary

## Product gap

The source dossier showed per-source claim-link cues, but it did not summarize whether the source set as a whole was visibly connected to the claim text. Users had to scan every source row to know whether the evidence pool had direct claim/excerpt term alignment.

## Built

- Added an `Alignment` metric to the source dossier summary.
- The metric counts:
  - `linked`: sources with at least one exact shared term between claim text and source excerpt.
  - `not direct`: sources without claim text, without an excerpt, or without direct lexical overlap.
- Reused the same conservative alignment helper as the per-source `Claim link` row, so the summary and row-level cues stay consistent.
- Updated the summary grid from three columns to four columns on larger screens while remaining stacked on mobile.

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
  - Verified summary shows `Alignment 1 linked / 0 not direct`.
  - Verified row-level `Claim link: world, population` still appears.
  - Verified no horizontal overflow.
- Mobile viewport: `390x844`
  - Verified no horizontal overflow.
  - Verified the source dossier stays within viewport.
  - Verified alignment, strongest, evidence-breakdown, and claim-link cues remain visible.

## Current limitation

The alignment metric is lexical and conservative. It does not prove source entailment, contradiction strength, stemming, quote boundaries, or exact claim-span coverage. It is a fast inspection cue for whether cited excerpts visibly touch the claim text.
