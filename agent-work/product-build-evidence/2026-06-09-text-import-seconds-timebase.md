# Text Import Seconds Timebase

## Product slice

Imported text and article chunks now use the same seconds-based timeline as audio, video, captions, markers, claims, reports, and the extract-claims API.

Before this fix, text imports advanced synthetic timestamps by `400` per word, while the rest of the app interpreted timestamps as seconds. That could make pasted text appear hours long, distort claim/report timestamps, and push long documents past the API's 24-hour timestamp guard.

Now:

- pasted/plain text uses `0.4` seconds per word
- article chunks use `0.4` seconds per word
- minimum synthetic segment duration is `0.1` seconds
- long text-import parser tests assert the final timestamp stays below the 24-hour API cap

## Verification

- `npx vitest run tests/text-ingest.test.ts tests/text-ingest-pane.test.tsx tests/utterance-merge.test.ts tests/verify-ownership-context.test.ts tests/synthesis-ownership-context.test.ts tests/export/markdown.test.ts tests/export/report.test.ts tests/export/json.test.ts`
- `npx tsc --noEmit`
- `npm run build:automation`
- `git diff --check`
