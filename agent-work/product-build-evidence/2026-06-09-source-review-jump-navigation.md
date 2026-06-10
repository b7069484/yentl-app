# Source Review Jump Navigation

Date: 2026-06-09

## Product Change

- Added a `Jump to block` action inside the focused source-block rail.
- Source blocks now have stable DOM ids, focusable article containers, and retained refs for reviewer navigation.
- Clicking `Jump to block` now:
  - keeps the selected source block focused.
  - scrolls the selected block into view.
  - moves keyboard focus onto the selected article.
  - marks the selected article with `data-source-block-jumped="true"` for visual/testable highlight state.
- Tightened the Source review header action links from 40px to 44px minimum height for mobile touch safety.

## Verification

- Focused lint:
  - `npx eslint components/session/source-review-view.tsx tests/source-review-view.test.tsx`
  - Result: passed.
- Focused tests:
  - `npx vitest run tests/source-review-view.test.tsx tests/session-page.test.tsx tests/session-shell.test.tsx tests/home-overview.test.tsx`
  - Result: 4 files passed, 101 tests passed.
- Production build:
  - `npm run build:automation`
  - Result: passed; `/session`, `/mobile`, `/tv`, and detail routes remain in the build output.
- Standalone typecheck:
  - `npx tsc --noEmit`
  - Result: passed.
- Diff hygiene:
  - `git diff --check`
  - Result: passed.

## Browser Proof

- Rendered a fresh text/document intake flow at 390px mobile viewport on `http://localhost:3000/session`.
- Used visible app flow:
  - staged shared text.
  - clicked `Process transcript`.
  - routed to overview.
  - opened `/session?view=source`.
  - clicked `Focus Paragraph 2`.
  - clicked `Jump to block`.
- Confirmed in the rendered DOM:
  - `Jump to block` button existed exactly once.
  - selected source article had `data-source-block-focused="true"`.
  - selected source article had `data-source-block-jumped="true"`.
  - `document.activeElement` was the selected source article.
  - jump button measured `316x44`.
  - visible undersized focus/jump control count: `0`.
  - viewport width: `390`; scroll width: `390`; horizontal overflow: `false`.

## Remaining Product Gap

Reviewer navigation now jumps between rail context and the source text, but Source review still needs quote-level anchors inside long paragraphs, reviewer notes, and a way to preserve source-review return context when opening a claim detail page.
