# End-session save/export handoff

Date: 2026-06-09

## Product gap

The flow atlas marks the end-session confirmation as a required state for live
mic/browser capture. Ending a session should clearly stop capture without
implying deletion, and it should offer save/export exits before the user ends
the run.

## Changes

- Added `Save first` and `Export first` actions inside the end-session dialog
  when the session has captured transcript, claims, or markers.
- Wired those actions through the active-session shell so they close the end
  confirmation and open the existing Save local snapshot or Export session
  dialogs.
- Kept the no-content state explicit when there is nothing durable to save or
  export.
- Kept browser-tab ending behavior intact: confirming still stops extension tab
  capture, ends the session, and triggers the final synthesis path.

## Browser verification

Target: `http://localhost:3000/session?demo=validation&sample=cable_008&view=overview`

Viewport: 390 x 844

Observed:

- End opened one `End this session?` dialog.
- `Save first` and `Export first` each appeared once.
- Dialog copy included `Keep a copy before stopping`.
- Dialog action heights at mobile width:
  - `Save first`: 44px
  - `Export first`: 44px
  - `Keep going`: 44px
  - `End session`: 44px
- `Save first` opened the real `Save local snapshot` dialog.
- `Export first` opened the real `Export this session` dialog with the
  `Preview report` action present.

## Verification

- `npx vitest run tests/end-session-dialog.test.tsx tests/session-shell.test.tsx`
- `npm run build:automation`
- `npx tsc --noEmit` after `next build --webpack` regenerated `.next/types`
- `git diff --check`
