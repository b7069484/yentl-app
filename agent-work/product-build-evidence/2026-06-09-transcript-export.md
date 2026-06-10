# Transcript export

Date: 2026-06-09

## Product gap

The export flow calls out transcript export as a missing state. Report,
Markdown, and JSON exports were available, but users could not save a clean
timed transcript by itself from the main export modal, saved-session library, or
extension panel.

## Changes

- Added a dedicated plain-text transcript renderer.
- Transcript export includes session title, start/end timestamps, source label,
  speaker registry, timed transcript rows, draft-state labels, and document
  source anchors when present.
- Added `transcript` as a shared `SessionExportKind`.
- Added `Transcript file` to the main session export dialog.
- Added `Transcript` to saved-session row export choices.
- Added `Transcript` to the extension panel file export choices.
- Added visible success feedback in the main export dialog before it closes,
  matching the local-save confirmation pattern.

## Browser verification

Target:
`http://localhost:3000/session?demo=validation&sample=cable_008&view=overview`

Viewport: 390 x 844

Observed:

- The rendered export dialog title was `Export this session`.
- The dialog showed `Transcript file`.
- The transcript hint `Timed plain-text transcript...` was visible.
- Mobile target heights:
  - `Preview report`: 80px
  - `Open as report`: 80px
  - `Markdown file`: 80px
  - `Transcript file`: 80px
  - `JSON file`: 80px
  - `Cancel`: 44px
- The dialog fit inside the 390px viewport at 358px wide.
- The export modal showed no horizontal overflow at 390px.

Note: Codex in-app Browser does not support download capture, so browser
verification stopped before clicking the file choices. The transcript renderer
export-routing calls, and visible success status are covered by focused tests.

## Verification

- `npx vitest run tests/export/transcript.test.ts tests/export-dialog.test.tsx tests/sessions-library-page.test.tsx tests/extension-panel-view.test.tsx`
- Browser check at 390 x 844 for export modal visibility, target sizing, and
  overflow
- `npm run build:automation`
- `npx tsc --noEmit`
- `git diff --check`
