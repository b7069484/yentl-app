# 2026-06-09 - Overview source health and recent activity

## Product gap

The overview command center target still needed current source status, source health, recent activity, and a mobile-safe overview stack. Recent activity existed as a list, but it sat alone and the overview did not tell the user whether the current source had transcript, pending checks, cited evidence, or source-backed claims.

## Built

- Added `sourceHealthSummary` to `lib/client/overview-selectors.ts`.
- Added a `Source health` panel to `components/session/home-overview.tsx`.
- The panel now shows:
  - Source type and title/subtitle.
  - Status: `Waiting for transcript`, `Checking sources`, `Source-backed`, `Needs source pass`, or `Transcript ready`.
  - Transcript utterance count.
  - Terminal claims count.
  - Still-checking claim count.
  - Source-backed claim count.
  - Unique cited source count and high-reputation source count.
- Reworked the overview lower section so `Source health` sits beside `Recent activity` on desktop and stacks above it on mobile.
- Fixed mobile min-width constraints after browser verification caught long-title horizontal overflow.

## Verification

- `npx vitest run tests/overview-selectors.test.ts tests/home-overview.test.tsx`
  - 2 files passed, 84 tests passed.
- `npx vitest run tests/overview-selectors.test.ts tests/home-overview.test.tsx tests/session-page.test.tsx tests/api/corpus-sample.test.ts`
  - 4 files passed, 109 tests passed.

## Browser proof

- Desktop route: `http://localhost:3000/session?demo=validation&sample=cable_008&view=overview`
  - Verified `Source health` visible.
  - Verified status text from real replay state: `Checking sources`.
  - Verified `Recent activity` visible.
  - Verified source health and recent activity are side-by-side on desktop.
- Mobile viewport: `390x844`
  - Initial check caught horizontal overflow from the long YouTube title.
  - Added `min-w-0` constraints to the source-health card and activity wrapper.
  - Rechecked mobile: no horizontal overflow, card stayed within viewport, recent activity stacked below source health.

## Current limitation

Source health is a compact overview signal, not a full source dossier. The next deeper product slice should make the claim/source gallery more comparative, especially for multiple sources and no-thumbnail evidence states.
