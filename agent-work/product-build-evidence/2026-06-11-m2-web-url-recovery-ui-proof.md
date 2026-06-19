# M2 Web URL Recovery UI Proof - 2026-06-11

## Scope

Improved the web/article URL ingestion pane so failed article extraction leaves the user with clear next actions instead of a dead end.

## Product Change

- Updated `components/session/ingest-panes/web-url-ingest-pane.tsx`.
  - Added contextual recovery guidance for blocked/private URLs, unsupported/player pages, no-readable-text pages, and oversized pages.
  - Kept existing `Use Chrome tab` and `Try media URL` routes.
  - Added a `Paste text` recovery route that switches directly into the text/document intake path for pages where extraction cannot safely or cleanly pull readable text.
- Updated `tests/web-url-ingest-pane.test.tsx`.
  - Covers `NO_READABLE_TEXT` recovery choices.
  - Covers unsupported/player-page routing into the direct media URL path.

## Browser Proof

Command:

```bash
YENTL_INGESTION_UI_PROOF_ORIGIN=http://localhost:3000 npm run ingestion:proof:ui
```

Result:

- Passed.
- 11 rendered ingestion UI flows passed.
- 0 failures.
- Proof refreshed at `docs/superpowers/validation/ingestion-ui-local-proof.json`.

## Verification

```bash
npx vitest run tests/web-url-ingest-pane.test.tsx tests/source-router.test.tsx tests/session-page.test.tsx
npx tsc --noEmit --pretty false
npm run lint
git diff --check
npm run test:run
npm run build:automation
```

Results:

- Focused Vitest: 3 files passed, 56 tests passed.
- Typecheck: passed.
- Lint: passed.
- Diff check: passed.
- Full Vitest: 175 files passed, 1833 tests passed.
- Automation build: passed, 42/42 static pages.

## Boundary

This closes the local UX dead-end for article URL extraction failures. It does not prove real production article extraction for every publisher, authenticated cloud sync, physical iOS/Android behavior, large real media canaries, or human review of sensitive attribution windows.
