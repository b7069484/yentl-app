# 2026-06-09 - Source excerpt match highlights

## Product gap

The source dossier showed source/claim overlap terms in a `Claim link` line and summarized linked source counts, but users still had to visually find those terms inside the excerpt text. The evidence was inspectable, but not yet scannable.

## Built

- Added exact overlap-term highlighting inside source excerpts.
- Highlighting reuses the same conservative overlap helper as:
  - Per-source `Claim link` cues.
  - Dossier-level `Alignment` counts.
- Rendered highlights as React text/`mark` nodes, not HTML injection.
- Kept unmatched excerpt text and punctuation intact.

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
  - Verified highlighted excerpt terms render: `World`, `population`, `world`, `population`.
  - Verified dossier alignment remains visible.
  - Verified no horizontal overflow.
- Mobile viewport: `390x844`
  - Verified no horizontal overflow.
  - Verified source dossier and supports lane stay within viewport.
  - Verified highlighted terms render.
  - Verified `Strongest`, `Alignment`, and `Claim link` cues remain visible.

## Current limitation

Highlights are exact lexical matches only. They do not yet handle stemming, synonyms, semantic paraphrase, quote-span boundaries, or proposition-level support/contradiction proof.
