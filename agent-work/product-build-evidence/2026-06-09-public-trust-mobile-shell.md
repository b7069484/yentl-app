# Public Trust Mobile Shell

Timestamp: 2026-06-09 03:15 EDT

## Product change

- Added a shared `PublicInfoPage` shell for older trust/info routes:
  - `/about`
  - `/methodology`
  - `/privacy`
  - `/terms`
  - `/subprocessors`
  - `/accessibility`
  - `/contact`
- The shared shell adds:
  - mobile-sized `Back to home` return control
  - `Start checking` product entry action
  - seven-link trust-page navigation with `aria-current="page"`
  - responsive two-column desktop layout and single-column mobile layout
  - `min-w-0` route content containment so wide content, such as the subprocessor table, does not widen the whole mobile page.
- Updated `/pricing`, `/faq`, and `/demo` top `Back to home` links to the same 44px minimum target standard.

## Boundary

- This pass did not change legal/privacy policy substance. It only normalized route shell, navigation, touch targets, and responsive containment.

## Verification

- `npx vitest run tests/public-entry-pages.test.tsx tests/trust-contact-pages.test.tsx`
  - PASS: 2 files, 13 tests.
- `npx tsc --noEmit`
  - PASS before and after production build.
- `npm run build:automation`
  - PASS: Next production build and embedded TypeScript pass.
- `git diff --check`
  - PASS.

## Browser proof

Rendered at `390x844`:

- `/pricing`, `/faq`, and `/demo`
  - `Back to home` found.
  - `Back to home` height: 44px.
  - no horizontal overflow.
- `/about`, `/methodology`, `/privacy`, `/terms`, `/subprocessors`, `/accessibility`, and `/contact`
  - correct `h1` rendered.
  - `Back to home` height: 44px.
  - `Start checking` height: 44px.
  - trust nav rendered with 7 links.
  - active trust nav link matched the current route.
  - no horizontal overflow after adding `min-w-0` containment.

## Files

- `components/public-info-page.tsx`
- `app/about/page.tsx`
- `app/methodology/page.tsx`
- `app/privacy/page.tsx`
- `app/terms/page.tsx`
- `app/subprocessors/page.tsx`
- `app/accessibility/page.tsx`
- `app/contact/page.tsx`
- `app/pricing/page.tsx`
- `app/faq/page.tsx`
- `app/demo/page.tsx`
- `tests/trust-contact-pages.test.tsx`
- `tests/public-entry-pages.test.tsx`
