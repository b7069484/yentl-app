# 2026-06-11 M2 Document/PDF Recovery Proof

## Scope

Closed a user-facing document-ingest gap: the text/PDF intake path now tells
users before import that PDFs need selectable text, scanned PDFs need OCR
outside the current v1 import path, and failed PDF imports have recovery actions.

## Product Change

- Added visible document-type chips to the text/document pane:
  - `TXT, MD, DOCX, PDF, SRT, VTT`
  - `PDFs need selectable text`
  - `Scanned PDFs need OCR elsewhere`
- Added a `PDF import boundary` panel explaining that selectable PDF text keeps
  page-count and outline context, while scanned image-only PDFs need OCR before
  import or should be handled through pasted text/browser-tab capture.
- Replaced the plain document error paragraph with a recovery alert that can:
  - choose another file
  - focus pasted-text recovery
  - switch to browser-tab capture
- Updated the flow atlas so the PDF upload node no longer treats the scanned
  PDF warning as missing. OCR progress, OCR failed states, page thumbnails, and
  mobile PDF import screenshots remain future work.
- Changed local browser-proof defaults for ingestion UI and mobile/PWA from
  `127.0.0.1` to `localhost` to avoid Next dev-server HMR origin false failures.

## Proof

Focused unit/static proof:

```bash
npx vitest run tests/text-ingest-pane.test.tsx tests/ingestion-ui-proof-script.test.ts tests/mobile-pwa-proof-script.test.ts tests/ux-flow-dashboard.test.tsx
```

Result: 4 files passed, 42 tests passed.

Rendered browser proof:

```bash
npm run ingestion:proof:ui
npm run mobile:proof:local
```

Results:

- `ingestion:proof:ui`: 7 user-facing source flows passed, 0 failures,
  generated `2026-06-11T20:57:00.575Z`, default origin `http://localhost:3000`.
- `mobile:proof:local`: 19 route surfaces at 390, 430, and 768px passed, 0
  failures, generated `2026-06-11T20:57:55.733Z`, default origin
  `http://localhost:3000`.

Additional checks:

```bash
npx tsc --noEmit
npm run lint
git diff --check
```

All passed.

## Remaining M2 Work

- Real-world scanned/OCR PDF support is still not built; v1 now states that
  honestly and routes users to paste/browser-tab recovery.
- Broader real external article/media/user-file validation still remains.
