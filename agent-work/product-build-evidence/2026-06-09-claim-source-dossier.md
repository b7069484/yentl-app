# 2026-06-09 - Claim source dossier

## Product gap

Source cards showed individual citations, but claim detail and claim learn-more did not summarize the source mix. Reviewers had to scan every source card to understand whether the claim was supported, contradicted, mixed, high-reputation, or missing source thumbnails.

## Built

- Added reusable `SourceDossier` to `components/session/claim-detail.tsx`.
- Added the dossier to claim detail source sections.
- Added the same dossier to claim learn-more source sections.
- The dossier summarizes:
  - Number of cited sources.
  - Stance mix: support / contradict / mixed.
  - Reputation mix: high / mid / low.
  - Source-image evidence: validated / missing.

## Verification

- `npx vitest run tests/item-detail.test.tsx tests/learn-more.test.tsx`
  - 2 files passed, 53 tests passed.

## Browser proof

- Desktop route: `http://localhost:3000/session/detail/claim/solo_005-claim-1?demo=validation&sample=solo_005`
  - Verified `Source dossier` visible.
  - Verified World Bank source still visible.
  - Verified dossier text: `1 support / 0 contradict / 0 mixed`, `1 high / 0 mid / 0 low`, `0 validated / 1 missing`.
- Mobile viewport: `390x844`
  - Verified no horizontal overflow.
  - Verified dossier stayed inside viewport.

## Current limitation

The dossier is a compact summary. A richer source comparison view should later group sources by stance, expose citation excerpts side by side, and separate missing-thumbnail state from unavailable source metadata.
