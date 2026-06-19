# M2 Ingestion UI Proof - 2026-06-11

## Scope

Closed the user-facing ingestion proof gap between route/API validation and the
actual source-picker UI. The new proof starts from the rendered `/session`
source entry points, clicks the validation loaders a user would click, waits for
the workspace handoff, and records the backing ingest requests.

## Product Change

- Added `scripts/validation/prove-ingestion-ui-local.mjs`.
- Added `npm run ingestion:proof:ui`.
- Added `tests/ingestion-ui-proof-script.test.ts` as a static guard for flow
  coverage, expected requests, console/runtime failure checks, overflow checks,
  and proof artifact output.
- Added a deterministic quick-check validation loader to
  `ClaimQuickCheckPane`, covering the one-claim path from rendered source pane
  through provisional verification, confirmed verification, and claim detail.
- Added the quick-check validation fixture to the `/project/validation`
  catalog/runbook.
- Added a deterministic synthesis fixture for the synthetic validation panel so
  local media/audio proof does not fall through to live model synthesis.
- Fixed a real synthesis request bug in `lib/client/orchestrator.ts`: absent
  document anchors are now omitted from utterance payloads instead of being sent
  as `anchor: null`. The synthesize API schema accepts an optional string, so
  sending `null` caused 400 responses during media/audio/YouTube handoffs.
- Added a regression in `tests/orchestrator-synthesis-state.test.ts` for the
  missing-anchor payload behavior.

## Proof Artifact

- `docs/superpowers/validation/ingestion-ui-local-proof.json`

Latest proof summary:

```json
{
  "ok": true,
  "generated_at": "2026-06-11T19:45:58.785Z",
  "app_origin": "http://127.0.0.1:3000",
  "flow_count": 7,
  "failures": []
}
```

Flows passed:

- `web-article-validation-ui-handoff`: `/session?source=web-url` -> `Load validation article` -> `/api/article-ingest` -> `/session?view=overview`.
- `direct-media-validation-ui-handoff`: `/session?source=media-url` -> `Load validation media URL` -> `/api/media-ingest` -> `/session?view=watch`.
- `audio-upload-validation-ui-handoff`: `/session?source=audio-file` -> `Load validation WAV` -> `Process audio` -> `/validation/yentl-synthetic-panel.wav` + `/api/transcribe-batch` -> `/session?view=watch`.
- `text-txt-validation-ui-handoff`: `/session?source=text-doc` -> `Load validation TXT` -> `Process transcript` -> `/validation/yentl-synthetic-transcript.txt` -> `/session?view=overview`.
- `text-pdf-validation-ui-handoff`: `/session?source=text-doc` -> `Load validation PDF` -> `Process transcript` -> `/validation/yentl-small-text-layer.pdf` + `/api/document-ingest` -> `/session?view=overview`.
- `youtube-validation-ui-handoff`: `/session?source=youtube` -> `Load validation YouTube` -> `Analyze caption track` -> `/api/youtube-ingest` -> `/session?view=watch`.
- `claim-quick-check-validation-ui-handoff`: `/session?source=claim` -> `Load validation claim` -> `Check claim` -> `/api/verify-provisional` + `/api/verify-confirmed` -> `/session/detail/claim/:id`.

The browser proof reported zero failures, zero route console/runtime issues, and
zero horizontal overflow across all seven flows.

## Verification

Commands:

- `node --check scripts/validation/prove-ingestion-ui-local.mjs` passed.
- `npx vitest run tests/claim-quick-check-pane.test.tsx tests/ingestion-ui-proof-script.test.ts tests/synthesize-route.test.ts tests/validation-media-fixtures.test.ts` passed: 4 files, 44 tests.
- `npx vitest run tests/project-validation-page.test.tsx tests/claim-quick-check-pane.test.tsx tests/ingestion-ui-proof-script.test.ts tests/synthesize-route.test.ts tests/validation-media-fixtures.test.ts` passed: 5 files, 47 tests.
- `npx vitest run tests/orchestrator-synthesis-state.test.ts tests/ingestion-ui-proof-script.test.ts` passed: 2 files, 7 tests.
- `npm run ingestion:proof:ui` passed: 7 UI flows, 0 failures.
- `npm run ingestion:proof:local` passed: consent, SSRF, article/media URL, external article/media, PDF/document, upload, and YouTube caption checks.
- `npm run ingestion:proof:text-docs` passed: TXT, Markdown, DOCX, SRT, and VTT checks.
- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `npm run test:run` passed: 166 files, 1749 tests.
- `npm run build:automation` passed: 42/42 static pages.
- `git diff --check` passed.
- In-app browser check passed for `/session?source=claim`: validation claim and
  context filled visibly, `overflowX: 0`.

## Remaining M2 Work

- Broader real-world user-facing fixtures for messy article pages, videos, and
  authenticated/blocked external sources.
- Production proof after redeploy for the known validation fixture and document
  parity blockers.
- Real microphone/mobile capture smoke on physical devices.
