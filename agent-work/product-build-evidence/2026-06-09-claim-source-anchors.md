# Claim Source Anchors

## Product slice

Claims now keep and display the imported document/caption position that produced them.

What changed:

- `ClaimCard` can carry `document_anchor`.
- The orchestrator copies `segment.document_anchor` onto each extracted claim.
- Claim cards and claim rows show compact `Source: Paragraph 2`, `Source: Turn 3 (Mira)`, `Source: Cue 4`, or `Source: Article chunk 5` badges.
- Claim detail pages show `Source position` with line ranges when available.
- Markdown, HTML report, and JSON exports preserve claim source anchors.
- Transcript view uses the same shared anchor formatter as the rest of the app.

## Verification

- `npx vitest run tests/claim-card-ownership.test.tsx tests/item-detail.test.tsx tests/aria-live-regions.test.tsx tests/export/markdown.test.ts tests/export/report.test.ts tests/export/json.test.ts tests/verify-ownership-context.test.ts tests/transcript-segment-types.test.ts tests/synthesis-ownership-context.test.ts tests/text-ingest.test.ts`
- `npx tsc --noEmit`
- `npm run build:automation`
- `git diff --check`
