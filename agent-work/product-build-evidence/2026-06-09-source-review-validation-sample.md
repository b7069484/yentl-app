# Source Review Validation Sample

Date: 2026-06-09

## Product Change

- Added a deterministic validation sample at `/session?demo=validation&sample=source_quote_anchors&view=source`.
- The sample loads a real `text_doc` source with three blocks, three transcript segments, and three claim cards.
- Each segment/claim includes persisted `char_start`, `char_end`, and `quote_text` anchors.
- The validation catalog now exposes the sample from `/project/validation`.
- This gives Source Review a browser-openable fixture for exact quote highlighting, focused block context, mobile layout proof, and future regression checks.

## Verification

- Focused tests:
  - `npx vitest run tests/api/corpus-sample.test.ts tests/project-validation-page.test.tsx tests/session-page.test.tsx tests/source-review-view.test.tsx tests/source-evidence.test.ts tests/text-ingest.test.ts`
  - Result: 6 files passed, 70 tests passed.
- Focused lint:
  - `npx eslint app/api/corpus-sample/route.ts lib/validation/fixtures.ts tests/api/corpus-sample.test.ts`
  - Result: passed.
- Typecheck:
  - `npx tsc --noEmit`
  - Result: passed.
- Production build:
  - `npm run build:automation`
  - Result: passed; `/session`, `/project/validation`, `/mobile`, and `/tv` remain in the build output.
- Diff hygiene:
  - `git diff --check`
  - Result: passed.

## Browser Proof

- Opened `http://localhost:3000/session?demo=validation&sample=source_quote_anchors&view=source` in the in-app browser at `390x844`.
- Initial rendered metrics:
  - Source Review present: `true`.
  - heading: `Source Review quote-anchor proof`.
  - source block count: `3`.
  - quote highlight button count: `5`.
  - source quote preview count: `5`.
  - initial highlighted sentence: `The city published the release log on Friday and said the update was available to the public.`
  - undersized quote-button target count: `0`.
  - viewport width: `390`; scroll width: `390`; horizontal overflow: `false`.
- Interaction proof:
  - clicked the uniquely scoped audit quote button in source block `1`.
  - highlighted sentence updated to `The audit timeline showed the report was added to the public archive before the meeting started.`
  - active quote buttons: `2`, because the active claim appears in both the source block and focused rail.
  - viewport width: `390`; scroll width: `390`; horizontal overflow: `false`.

## Remaining Product Gap

The Source Review validation sample now proves imported-text quote anchors end-to-end. Next high-value validation fixtures should cover audio/media playback synchronization and extension/article highlight states with the same deterministic browser-openable pattern.
