# Source Review Return Context

Date: 2026-06-09

## Product Change

- Source review claim links now preserve their source-block context with `from=source:block:N`.
- Claim detail breadcrumbs now recognize that context as `Source block N`.
- The claim detail Back control now returns directly to `/session?view=source&block=N` instead of relying on generic browser history.
- Claim detail sibling navigation now stays scoped to claims from the same source block when opened from Source review.
- Source review now reads the `block` route param and restores the matching source block as focused, jumped, scrolled, and keyboard-focused.

## Verification

- Focused lint:
  - `npx eslint components/session/source-review-view.tsx components/session/item-detail.tsx lib/client/sibling-nav.ts tests/source-review-view.test.tsx tests/item-detail.test.tsx`
  - Result: passed.
- Focused tests:
  - `npx vitest run tests/source-review-view.test.tsx tests/item-detail.test.tsx tests/filter-selectors.test.ts tests/filtered-list.test.tsx`
  - Result: 4 files passed, 107 tests passed.
- Production build:
  - `npm run build:automation`
  - Result: passed; `/session`, `/session/detail/[type]/[id]`, `/mobile`, and `/tv` remain in the build output.
- Standalone typecheck:
  - `npx tsc --noEmit`
  - Result: passed.
- Diff hygiene:
  - `git diff --check`
  - Result: passed.

## Browser Proof

- Rendered a fresh text/document intake flow at 390px mobile viewport on `http://localhost:3000/session`.
- Used visible app flow:
  - staged dummy text.
  - clicked `Process transcript`.
  - opened Source review.
  - clicked a claim link carrying `from=source%3Ablock%3A1`.
  - confirmed the detail page URL included `from=source%3Ablock%3A1`.
  - confirmed the detail breadcrumb showed `Source block 2`.
  - clicked the detail Back control.
- Confirmed after returning:
  - URL was `http://localhost:3000/session?view=source&block=1`.
  - source block `1` had `data-source-block-focused="true"`.
  - source block `1` had `data-source-block-jumped="true"`.
  - `document.activeElement` was source block `1`.
  - source-context claim links remained present.
  - viewport width: `390`; scroll width: `390`; horizontal overflow: `false`.
  - checked source/detail return targets under the proof had undersized target count: `0`.

## Remaining Product Gap

Source review now preserves block-level return context through claim detail, but it still needs quote-level anchors inside long source paragraphs and a dedicated reviewer notes/status layer for human review workflows.
