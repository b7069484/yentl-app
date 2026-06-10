# 2026-06-09 - Source evidence export carryover

## Product gap

The live claim detail and learn-more views showed source scoring, evidence breakdowns, claim-link cues, alignment counts, and excerpt highlights, but exported Markdown and HTML reports still reduced sources to basic title/domain/reputation/stance metadata. A saved or shared session could lose the evidence-inspection context that made the live UI trustworthy.

## Built

- Added `lib/source-evidence.ts` as the shared deterministic source-evidence helper.
- Moved live UI scoring/alignment logic onto the shared helper.
- Added source evidence carryover to Markdown exports:
  - Source alignment summary.
  - Evidence score.
  - Evidence breakdown.
  - Claim-link cue.
  - Source excerpt.
- Added source evidence carryover to HTML reports:
  - Source alignment summary.
  - Evidence score in source metadata.
  - Evidence breakdown and claim-link cue.
  - Highlighted exact excerpt matches using escaped text pieces.

## Verification

- `npx vitest run tests/item-detail.test.tsx tests/learn-more.test.tsx tests/export/markdown.test.ts tests/export/report.test.ts`
  - 4 files passed, 66 tests passed.
- `npx vitest run tests/item-detail.test.tsx tests/learn-more.test.tsx tests/overview-selectors.test.ts tests/home-overview.test.tsx tests/session-page.test.tsx tests/api/corpus-sample.test.ts tests/export/markdown.test.ts tests/export/report.test.ts tests/export/json.test.ts tests/export/transcript.test.ts tests/export-dialog.test.tsx`
  - 11 files passed, 185 tests passed.
- `npm run build:automation`
  - Passed; Next build generated 39 static pages.
- `npx tsc --noEmit`
  - Passed.
- `git diff --check`
  - Passed.

## Current limitation

Exports now preserve the same deterministic source-evidence inspection cues as the live UI, but the cues remain lexical. They do not prove semantic entailment, quote-span coverage, or source contradiction strength.
