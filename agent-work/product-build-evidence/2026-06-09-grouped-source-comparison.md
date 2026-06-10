# 2026-06-09 - Grouped source comparison

## Product gap

The claim source dossier summarized source counts, but citations were still flat. Reviewers needed to see support, contradiction, and mixed evidence side by side with excerpts, instead of scanning the full source list and mentally grouping sources.

## Built

- Expanded `SourceDossier` in `components/session/claim-detail.tsx`.
- Added stance-grouped source comparison lanes:
  - `Supports`
  - `Contradicts`
  - `Mixed`
- Each lane now shows source title, domain, reputation tier, image-evidence status, and excerpt preview.
- Empty lanes explicitly say no cited source exists in that lane.
- `ClaimLearnMore` inherits the same grouped comparison because it reuses `SourceDossier`.

## Verification

- `npx vitest run tests/item-detail.test.tsx tests/learn-more.test.tsx`
  - 2 files passed, 54 tests passed.

## Browser proof

- Desktop route: `http://localhost:3000/session/detail/claim/solo_005-claim-1?demo=validation&sample=solo_005`
  - Verified `Source dossier` visible.
  - Verified grouped comparison visible.
  - Verified `Supports` lane includes World Bank WDI citation and excerpt.
  - Verified `Contradicts` and `Mixed` lanes show empty-state copy.
- Mobile viewport: `390x844`
  - Verified no horizontal overflow.
  - Verified comparison stayed inside viewport.

## Current limitation

The comparison lanes currently appear inside the compact dossier. A future richer source dossier route should support source-by-source expansion, quote-level citation anchors, and sorting by evidence strength.
