# 2026-06-09 - Source evidence JSON export

## Product gap

Markdown and HTML reports preserved source-evidence inspection cues, but JSON export still only carried raw session data. Future mobile, native, TV, import, or analytics surfaces would have to recompute source evidence or scrape presentation formats to get source score, alignment, and claim-link details.

## Built

- Added a top-level `source_evidence` block to JSON exports.
- Each exported claim now has:
  - `claim_id`.
  - `summary` from the shared source dossier stats.
  - Sorted per-source evidence records.
- Each source evidence record includes:
  - Source identity fields.
  - `evidence_score`.
  - `evidence_breakdown`.
  - `claim_link`.
  - `claim_link_terms`.
- Raw `claims` remain unchanged, so the export preserves the original session while adding machine-readable derived evidence.
- Added direct tests for `lib/source-evidence.ts`.

## Verification

- `npx vitest run tests/source-evidence.test.ts tests/export/json.test.ts tests/export/markdown.test.ts tests/export/report.test.ts tests/item-detail.test.tsx tests/learn-more.test.tsx`
  - 6 files passed, 73 tests passed.
- `npx vitest run tests/source-evidence.test.ts tests/item-detail.test.tsx tests/learn-more.test.tsx tests/overview-selectors.test.ts tests/home-overview.test.tsx tests/session-page.test.tsx tests/api/corpus-sample.test.ts tests/export/markdown.test.ts tests/export/report.test.ts tests/export/json.test.ts tests/export/transcript.test.ts tests/export-dialog.test.tsx`
  - 12 files passed, 188 tests passed.
- `npm run build:automation`
  - Passed; Next build generated 39 static pages.
- `npx tsc --noEmit`
  - Passed.
- `git diff --check`
  - Passed.

## Current limitation

The JSON export now carries deterministic source-inspection features, but they remain lexical and derived from current source metadata. It does not add semantic entailment, source quote-span IDs, or native app-specific rendering metadata.
