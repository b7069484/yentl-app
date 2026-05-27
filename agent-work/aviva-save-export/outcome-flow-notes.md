# Aviva outcome-flow notes

Date: 2026-05-21 19:13 EDT

## Status

Complete and ready for review.

The workbook/CSV still listed Aviva as `waiting`, but this session was launched directly by the user. Dependency evidence reviewed before coding:

- Talia status: v1 save story is guest-first and browser-local, not account sync.
- Ezra status: extension proof lane has passing extension tests and webpage verifier checks.

## Outcome flow

Save is now treated as a durable outcome, not a decorative header button. The main session header shows `Save` only after the session has transcript, claims, markers, summary, or Devil's Advocate content worth preserving. When visible, it is visually stronger and opens a dialog labeled as a local snapshot.

The save dialog explains that saves stay in this browser, do not sync to another device, and may disappear if browser data is cleared. It also previews what the snapshot includes: transcript line count, claim count, marker count, summary, and Devil's Advocate when present.

The `/sessions` empty state now directs a first-time user back to analysis instead of implying they already have a current session. It explains that saved sessions are browser-local snapshots and points to the privacy note for local-save behavior.

The restore route now has a real failure state. `/session?restore=<bad-id>` no longer sits on an "Opening workspace" screen with only an error box; it explains that the snapshot was not found on this device and offers `Open local saves` and `Start a new analysis`.

The extension panel now labels the workspace handoff as `Open snapshot` and states that it saves the current panel state as a local snapshot. It explicitly says this is not live sync, so users do not expect the full workspace to keep updating while the panel continues capturing.

Export copy now says report/Markdown/JSON include transcript, claims, markers, summary, and Devil's Advocate when present. JSON is described as an archive/scripting export, not as a re-import promise.

## Devil's Advocate export check

Existing export serializers already carry `devil_advocate` through:

- `lib/export/report.ts` renders a Devil's Advocate section.
- `lib/export/markdown.ts` renders a Devil's Advocate section.
- `lib/export/json.ts` serializes `devil_advocate`.

The targeted export tests still pass and include Devil's Advocate assertions.

## Files touched

- `app/session/page.tsx`
- `app/sessions/page.tsx`
- `components/session/SaveSessionDialog.tsx`
- `components/session/ExportDialog.tsx`
- `components/session/EndSessionDialog.tsx`
- `components/session/extension-panel-view.tsx`
- `components/session/session-shell.tsx`
- `tests/save-session-button.test.tsx`
- `tests/sessions-library-page.test.tsx`
- `tests/session-page.test.tsx`
- `tests/extension-panel-view.test.tsx`
- `agent-work/aviva-save-export/checkpoints.md`

Scope note: `components/session/session-shell.tsx` was outside the launch file's primary list, but it owns the visible header `Save` button. The edit there was limited to content gating and button emphasis.

## Verification

- `npm test -- tests/save-session-button.test.tsx tests/sessions-library-page.test.tsx tests/session-page.test.tsx tests/extension-panel-view.test.tsx tests/export/report.test.ts tests/export/markdown.test.ts tests/export/json.test.ts`  
  Result: 7 files, 41 tests passed.
- `npm test -- tests/end-session-synthesis.test.ts tests/export/json.test.ts tests/export/markdown.test.ts tests/export/report.test.ts tests/extension-panel-view.test.tsx tests/save-session-button.test.tsx tests/session-header.test.tsx tests/session-layout.test.tsx tests/session-page.test.tsx tests/session-shell.test.tsx tests/session-storage.test.ts tests/session-store-restore.test.ts tests/session-store.test.ts tests/session-timer.test.tsx tests/sessions-library-page.test.tsx`  
  Result: 15 files, 151 tests passed.
- `npx tsc --noEmit`  
  Result: passed.
- `npm run lint -- app/session/page.tsx app/sessions/page.tsx components/session/session-shell.tsx components/session/SaveSessionDialog.tsx components/session/ExportDialog.tsx components/session/EndSessionDialog.tsx components/session/extension-panel-view.tsx tests/save-session-button.test.tsx tests/sessions-library-page.test.tsx tests/session-page.test.tsx tests/extension-panel-view.test.tsx`  
  Result: passed.

## Browser route checks

- `/sessions`: empty local-save state renders with start/privacy actions.  
  Screenshot: `agent-work/aviva-save-export/screenshots/sessions-empty.jpg`
- `/session?restore=missing-aviva-snapshot`: explanatory missing-snapshot state renders.  
  Screenshot: `agent-work/aviva-save-export/screenshots/restore-missing.jpg`
- `/session?surface=extension-panel&source=browser-tab&bridge=preview&title=Fixture%20video&demo=validation`: `Open snapshot`, `Report`, `Export files`, `Markdown`, and `JSON` render enabled, with not-live-sync copy visible.  
  Screenshot: `agent-work/aviva-save-export/screenshots/extension-panel-export-actions.jpg`
- `/session?sample=solo_005&view=overview`: `Save` is absent on the pre-session source picker and visible/enabled once sample content loads.  
  Screenshots: `agent-work/aviva-save-export/screenshots/sample-save-visible.jpg`, `agent-work/aviva-save-export/screenshots/save-dialog-snapshot.jpg`

## Remaining decisions

- The full workspace handoff remains a snapshot. True live multi-window sync still needs a later implementation.
- The shared workbook row was not edited. A reporting-inbox update was written instead.

## Scope compliance

No API routes, corpus scripts, marker assets, security middleware, `.claude/`, `.claire/`, generated corpus outputs, or another agent's deliverable folder were edited.

Signoff: Aviva means springlike or renewal; this lane turns a live analysis into a durable outcome the user can return to.
