# Source Review Focus Sync

Date: 2026-06-09

## Product Change

- Added source-block focus controls to the imported text Source review view.
- Default focus now lands on the first block with mapped claims, then the first block with transcript context, then the first source block.
- Each block now exposes a 44px `Focus` button with `aria-pressed` state and a stronger active border.
- Added a focused source-block rail that shows:
  - selected block label and preview.
  - block number, transcript-line count, and claim count.
  - up to three transcript lines with source-relative timestamps.
  - up to three claims with verdict, score, and detail links.
- Kept the existing claim map and anchored finding summaries intact.

## Verification

- Focused lint:
  - `npx eslint components/session/source-review-view.tsx tests/source-review-view.test.tsx`
  - Result: passed.
- Focused tests:
  - `npx vitest run tests/source-review-view.test.tsx tests/session-page.test.tsx tests/session-shell.test.tsx tests/home-overview.test.tsx`
  - Result: 4 files passed, 101 tests passed.
- Production build:
  - `npm run build:automation`
  - Result: passed; `/session`, `/mobile`, `/tv`, and source API routes remain in the build output.
- Standalone typecheck:
  - `npx tsc --noEmit`
  - Result: passed.
- Route proof:
  - `curl -I http://localhost:3000/session`
  - Result: HTTP 200 from the existing Yentl dev server.

## Browser Proof

- Rendered a real text/document intake flow at 390px mobile viewport on `http://localhost:3000/session`.
- Used visible app flow:
  - staged shared text through the text/document source path.
  - granted the four required local consent boxes for dummy test text; optional analytics remained off.
  - clicked `Process transcript`.
  - app routed to `/session?view=overview` without processing error.
  - opened the Source tab in the same live session.
- Confirmed in the rendered DOM:
  - source review rendered at `/session?view=source`.
  - `Focused source block` rail was present.
  - three source focus buttons were present.
  - clicking `Focus Paragraph 2` set `aria-pressed=true` on that button.
  - focused rail showed Paragraph 2's transcript context and matching claim.
  - visible undersized focus-button count: `0`.
  - `documentElement.scrollWidth` matched the 390px viewport; horizontal overflow: `false`.

## Remaining Product Gap

Source review now lets a reviewer inspect one imported text block with its transcript and claim context, but it still needs richer review workflow features: reviewer notes, click-to-scroll/highlight between the rail and block list, quote-level anchors inside long paragraphs, and source-reader behavior for remote article text when `initial_text` is unavailable.
