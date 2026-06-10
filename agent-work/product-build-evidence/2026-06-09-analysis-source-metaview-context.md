# Analysis Source Metaview Context

## Product slice

Yentl now carries imported document/source context into analysis instead of treating each utterance as an isolated line:

- `mergeIntoUtterances()` preserves imported-text provenance during analysis merging.
- Claim extraction requests include `document_anchor` and a `CURRENT_DOCUMENT_POSITION` section.
- Transcript context lines include document anchors such as `Turn 1 (David)` or `Paragraph 2`.
- Text document source context includes a compact document overview with stats and excerpts.
- Synthesis receives `source_context`, `source_audio_kind`, and per-utterance anchor labels so the metaview can summarize the whole source with orientation.

## Verification

- `npx vitest run tests/utterance-merge.test.ts tests/extract-claims-ownership.test.ts tests/synthesis-ownership-context.test.ts tests/verify-ownership-context.test.ts tests/api/model-route-security.test.ts tests/synthesize-route.test.ts tests/end-session-synthesis.test.ts`
- `npx tsc --noEmit`
- `npm run build:automation`
- `git diff --check`
