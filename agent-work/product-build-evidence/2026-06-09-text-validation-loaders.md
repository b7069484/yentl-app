# Text Validation Loaders

Date: 2026-06-09

## Product slice

Text/document ingest now has deterministic browser-operable validation paths. Opening `/session?source=text-doc` jumps directly to the text/document pane, and local validation builds expose loaders for TXT, Markdown, VTT, and SRT fixtures. Each loader fetches the fixture text, wraps it as a real `File`, and sends it through the same parser, source metadata, outline, timed-caption, and processing path as user-imported text.

This closes the proof gap where the text/document path could be unit-tested but still required manual paste or native file selection for browser validation.

## Files touched

- `components/session/ingest-panes/text-ingest-pane.tsx`
- `app/session/page.tsx`
- `lib/validation/fixtures.ts`
- `tests/text-ingest-pane.test.tsx`
- `tests/session-page.test.tsx`
- `tests/project-validation-page.test.tsx`

## Verification

- `npx vitest run tests/text-ingest-pane.test.tsx tests/session-page.test.tsx tests/project-validation-page.test.tsx tests/text-ingest.test.ts tests/source-review-view.test.tsx`
  - Passed: 5 files, 85 tests.
- Focused ESLint on changed source/test files.
  - Passed.
- `npm run build:automation`
  - Passed with webpack production build.
- `npx tsc --noEmit`
  - Passed.
- `git diff --check -- components/session/ingest-panes/text-ingest-pane.tsx app/session/page.tsx lib/validation/fixtures.ts tests/text-ingest-pane.test.tsx tests/session-page.test.tsx tests/project-validation-page.test.tsx`
  - Passed.

## Runtime proof

- Browser, mobile viewport `390x844`, local dev server on `http://localhost:3000`:
  - Opened `/session?source=text-doc`.
  - Confirmed hydration moved directly into the text/document pane with `Load validation TXT`, `Load validation MD`, `Load validation VTT`, and `Load validation SRT`.
  - Clicked `Load validation TXT`.
  - Confirmed `yentl-synthetic-transcript.txt` was staged, the textarea contained `Moderator` and `Analyst` turns, `Process transcript` was available, and no horizontal overflow occurred (`scrollWidth=390`, `clientWidth=390`).
  - Clicked `Process transcript`.
  - Confirmed overview opened at `/session?view=overview` with document source `yentl-synthetic-transcript.txt`, 9 utterances, 2 speakers, 4 extracted claims after analysis completed, source text visible, and no horizontal overflow.
  - Used the in-app Sources flow to choose a new source, selected Text/document again, and clicked `Load validation VTT`.
  - Confirmed `yentl-synthetic-captions.vtt` was staged as timestamped cues, with timed-cue metadata visible and no horizontal overflow.
  - Clicked `Process transcript`.
  - Confirmed overview opened at `/session?view=overview` with document source `yentl-synthetic-captions.vtt`, caption-file source text, 5 utterances, transcript-ready status, and no horizontal overflow.
  - Browser console error log was empty during these route checks.

## Next gap

The next highest-impact product gap is to give web/article URL ingest the same deterministic validation route and mobile browser proof, including extracted article text, source preview, claim extraction, source-review handoff, and export carryover.
