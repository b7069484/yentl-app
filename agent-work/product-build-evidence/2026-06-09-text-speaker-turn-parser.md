# Product Build Evidence: Text Speaker Turn Parser

Timestamp: 2026-06-09T00:13:00-04:00
Area: source ingestion / document transcript parsing

## Product Gap

Pasted transcripts often arrive as consecutive speaker-labeled lines:

```text
David: Opening claim.
Mira: Response without a blank line.
```

The existing parser only detected a speaker label at the start of a paragraph. Without blank lines between turns, later speaker labels could be treated as continuation text under the first speaker, which damages claim ownership and meta-view quality.

## Change

- Updated `lib/client/text-ingest.ts` so line-by-line speaker labels create separate speaker turns even without blank lines.
- Added support for common labels like `Speaker 1:` and timestamp-prefixed labels like `[00:12] Speaker 2:`.
- Updated `components/session/ingest-panes/text-ingest-pane.tsx` so the detected-structure preview counts those labels before processing.
- Added focused regression coverage in `tests/text-ingest.test.ts` and `tests/text-ingest-pane.test.tsx`.

## Verification

Passed:

```bash
npx vitest run tests/text-ingest.test.ts tests/text-ingest-pane.test.tsx
npx tsc --noEmit
npm run build:automation
git diff --check
```

Focused test result: 2 files, 39 tests passed.

## Remaining Scope

This improves the web/PWA document/text ingestion path. It does not claim native iOS/Android wrappers, TV app support, OCR, or full document-anchored claim highlighting.
