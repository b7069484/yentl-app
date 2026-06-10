# M2 Text/Document Fixture Proof - 2026-06-10

## Scope

- Finished the interrupted `scripts/validation/prove-text-document-fixtures.ts` proof
  for TXT, Markdown, DOCX, SRT, and VTT validation fixtures.
- Wired `npm run ingestion:proof:text-docs` into `package.json`.
- Added `tests/text-document-fixtures-proof-script.test.ts` as a static guard for
  the proof script shape and fixture coverage.
- Fixed `parseDocx` so Node-side Mammoth extraction uses a `Buffer` fallback when
  the browser `arrayBuffer` option is unavailable.

## Latest Result

Passing command:

```bash
npm run ingestion:proof:text-docs
```

Fresh proof written to:

- `docs/superpowers/validation/text-document-fixtures-proof.json`

Key result:

```json
{
  "ok": true,
  "checks": [
    "txt-transcript",
    "markdown-document",
    "docx-document",
    "srt-captions",
    "vtt-captions"
  ],
  "failures": []
}
```

Fixture details:

- TXT: 9 segments, speaker ids `[0, 1]`, speaker-turn anchors preserved.
- Markdown: 10 segments, outline label `Yentl Validation Transcript`.
- DOCX: 384 extracted chars, 5 segments, 4 outline items.
- SRT/VTT: 5 timed cues each, monotonic timing, `source_audio_kind = srt_vtt`.

## Product Fix Found By The Proof

- `parseDocx` only passed `{ arrayBuffer }` to Mammoth, which works in browser
  builds but fails in Node with `Could not find file in options`.
- The function now retries with `{ buffer: Buffer.from(...) }` so the same DOCX
  path works in local proof scripts and browser uploads.

## Verification

Commands:

- `npm run ingestion:proof:text-docs` passed: all 5 fixture checks green.
- `npx vitest run tests/ingestion-proof-script.test.ts tests/text-document-fixtures-proof-script.test.ts tests/text-ingest.test.ts` passed: 3 files, 35 tests.
- `npx tsc --noEmit` passed.
- `npm run test:run` passed: 157 files, 1699 tests.
- `npm run build:automation` passed: 42/42 static pages.

## Remaining M2 Work

- External article/media proof beyond the existing W3C and public WAV cases.
- Upload/audio edge proof for oversized, unsupported, and handoff failures.
- Full packaged-extension capture from a real external media page remains in M6.