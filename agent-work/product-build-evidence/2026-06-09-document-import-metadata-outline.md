# Document import metadata and outline

Date: 2026-06-09

## Product gap

The complete-flow plan requires PDF/document import to feel like a real document
branch, not just a generic transcript paste. PDF extraction already existed, but
the client collapsed extracted documents into anonymous text and did not preserve
page count, extraction mode, or a section outline for later analysis context.

## Changes

- Added optional `document_meta` to text document sources with extraction kind,
  PDF page count, and outline entries.
- Added `parsePdfWithMetadata()` and `buildDocumentOutline()` while keeping
  `parsePdf()` backwards-compatible for text-only callers.
- Updated text/document ingest UI to show file extraction progress, loaded file
  metadata, PDF page count, review-anchor count, and a document outline panel.
- Persisted document metadata into the session source before bulk ingest.
- Included document extraction, page count, and outline in source context passed
  to analysis/verification prompts.

## Verification

- `npx vitest run tests/text-ingest.test.ts`
- `npx vitest run tests/text-ingest-pane.test.tsx`
- `npx vitest run tests/verify-ownership-context.test.ts`
- `npm run build:automation`
- `npx tsc --noEmit` after `next build --webpack` regenerated `.next/types`
- `git diff --check`
