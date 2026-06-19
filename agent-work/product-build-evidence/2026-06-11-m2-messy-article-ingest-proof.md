# M2 Messy Article Ingest Proof - 2026-06-11

## Scope

Hardened Web URL ingestion for real-world article pages that embed page chrome
inside the article body.

## Product Change

- Added readable-page chrome removal in `/api/article-ingest` for blocks that
  identify themselves as ads, cookies, sharing widgets, related-story modules,
  newsletter/signup panels, comments, paywalls, or similar page furniture.
- Fixed article whitespace normalization so line-wrapped HTML inside a paragraph
  stays one readable sentence instead of becoming separate paragraph fragments.
- Added `public/validation/yentl-messy-article.html` as a deterministic local
  messy article fixture.
- Added `messy-article-url-ingest` to `npm run ingestion:proof:local`.
- Added the messy article fixture to the validation catalog.
- Added regression coverage for cookie, ad, related-story, sharing, newsletter,
  and comment chrome exclusion.

## Proof

`npm run ingestion:proof:local` passed with the new gate:

- `messy-article-url-ingest`: ok
- fixture id: `yentl_messy_article_html`
- known article claims retained
- excluded page chrome: cookie, share, ad, related, comments

The same proof also passed consent gate, SSRF block, clean article ingest,
external WCAG article ingest, direct media URL ingest, external WAV ingest, PDF
document ingest, upload-token consent checks, unsupported document checks, and
YouTube caption ingest.

## Verification

- `npx vitest run tests/api/article-ingest.test.ts tests/ingestion-proof-script.test.ts tests/project-validation-page.test.tsx` passed: 3 files, 12 tests.
- `npm run ingestion:proof:local` passed.
- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `npm run test:run` passed: 170 files, 1779 tests.
- `npm run build:automation` passed.
- `git diff --check` passed.

## Remaining M2 Work

- Add more real external article families to the proof battery, especially
  paywalled, blocked, JS-heavy, and transcript-like pages.
- Add production proof after deploy parity is restored.
- Add physical mobile microphone/file-capture smoke when device access is
  available.
