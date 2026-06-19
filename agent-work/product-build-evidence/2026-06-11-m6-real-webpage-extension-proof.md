# 2026-06-11 M6 Real Webpage Extension Proof

## Scope

Upgraded the real-page extension validation path from an old hand-run script
into a repeatable package proof with current live evidence. This narrows the M6
gap around real article/video extension behavior without claiming a visible
manual tabCapture run.

## Product Change

- Reworked `scripts/validation/verify-real-webpage-targets.mjs` to emit a
  first-class JSON report with `ok`, pass counts, target counts, failures, and
  per-target evidence.
- Added `npm run extension:proof:real-pages`.
- Added configurable target/report inputs:
  - `YENTL_REAL_WEBPAGE_TARGETS_JSON`
  - `YENTL_REAL_WEBPAGE_TARGETS_FILE`
  - `YENTL_REAL_WEBPAGE_REPORT_PATH`
  - `YENTL_REAL_WEBPAGE_APP_ORIGIN`
- Added target-level expectations for minimum readable text, expected phrases,
  media presence, panel injection, iframe origin, and source-context keys.
- Added fixture-backed regression coverage in
  `tests/real-webpage-targets-script.test.ts`.

## Live Proof

Command:

```bash
npm run extension:proof:real-pages
```

Result:

```json
{
  "ok": true,
  "generated_at": "2026-06-11T21:35:49.520Z",
  "target_count": 3,
  "pass_count": 3,
  "failures": []
}
```

Targets passed:

- Wikimedia Commons WebM page:
  - panel injected
  - video elements found: 2
  - page text captured: 214 chars
  - expected phrases: `David Korten`, `The Green Interview`
- Wikinews article:
  - panel injected
  - page text captured: 731 chars
  - expected phrases: `gas leak`, `Los Angeles`
- W3C WCAG 2.2 page:
  - panel injected
  - page text captured: 12,000 chars across 10 chunks
  - expected phrases: `Web Content Accessibility Guidelines`, `WCAG 2.2`

Artifact:

- `docs/superpowers/validation/real-webpage-targets.json`

Focused regression:

```bash
npx vitest run tests/real-webpage-targets-script.test.ts tests/extension-same-page.test.ts tests/extension-package-check.test.ts
```

Result:

- 3 test files passed
- 14 tests passed

## Boundary

This proof injects the actual content script into fetched real-page DOMs and
verifies same-page panel/page-text behavior. It does not replace a visible/manual
installed-extension tabCapture proof with real audio transcription.
