# M2 External Ingestion Proof - 2026-06-10

## Scope

- Expanded `scripts/validation/prove-ingestion-local.mjs` with real external
  article/media proof, SSRF blocking, and a documented external-host blocker probe.
- Kept the existing local fixture checks for article, media, PDF, and YouTube.

## Latest Result

Passing command:

```bash
npm run ingestion:proof:local
```

Fresh proof written to:

- `docs/superpowers/validation/ingestion-local-proof.json`

Key result:

```json
{
  "ok": true,
  "checks": [
    "consent-gate",
    "ssrf-block",
    "article-url-ingest",
    "external-article-url-ingest",
    "direct-media-url-ingest",
    "external-media-url-ingest",
    "pdf-document-ingest",
    "youtube-caption-ingest"
  ],
  "failures": []
}
```

External proof details:

- Article: `https://www.w3.org/TR/WCAG22/` imported with title
  `Web Content Accessibility Guidelines (WCAG) 2.2`, `source_word_count: 19965`,
  capped `word_count: 2200`, `truncated: true`.
- Media: Mozilla `LDC93S1.wav` transcribed with `mime: audio/wav`,
  `utterance_count: 1`, first utterance
  `She had your ducks suit and greasy wash water all year.`
- SSRF: `http://169.254.169.254/latest/meta-data` blocked with `SSRF_BLOCKED`.
- Documented blocker: Wikimedia `Example.ogg` returned `TRANSCRIBE_FAILED` with
  host `403` — recorded under `external_blockers`, not counted as a product failure.

## Verification

Commands:

- `npm run ingestion:proof:local` passed: 8 checks green, 1 external blocker recorded.
- `npx vitest run tests/ingestion-proof-script.test.ts` passed: 5 tests.

## Upload Edge Gates Added

`npm run ingestion:proof:local` now also proves:

- upload-audio consent gate (`428 SOURCE_CONSENT_REQUIRED`)
- missing document file (`400 MISSING_FILE`)
- unsupported document upload (`415 UNSUPPORTED_DOCUMENT`)

## Remaining M2 Work

- Oversized upload and transcription handoff failure proof on a deployed blob host.
- Full packaged-extension capture from a real external media page remains in M6.