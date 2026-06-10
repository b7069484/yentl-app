# Document Ingest Anchors

## Product slice

Imported text now preserves review provenance on transcript segments:

- pasted/plain document paragraphs get `document_anchor.kind = "paragraph"`
- speaker-labelled transcript turns get `document_anchor.kind = "speaker_turn"`
- article chunks get `document_anchor.kind = "article_chunk"`
- SRT/VTT cues get `document_anchor.kind = "caption_cue"`

The text ingest preview also reports review anchor count, and transcript display renders compact anchor labels such as `Turn 1`, `Paragraph 2`, `Chunk 3`, or `Cue 4`.

## Verification

- `npx vitest run tests/text-ingest.test.ts tests/text-ingest-pane.test.tsx tests/aria-live-regions.test.tsx tests/transcript-segment-types.test.ts`
- `npx tsc --noEmit`
- `npm run build:automation`
- `git diff --check`
