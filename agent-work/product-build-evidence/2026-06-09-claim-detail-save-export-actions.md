# Product build evidence: claim detail save and export actions

Date: 2026-06-09

## Slice

Claim detail now connects its result actions to the existing save and export workflows.

## Changes

- Replaced the disabled `Save` action in `components/session/claim-detail.tsx` with a working button that opens `SaveSessionDialog`.
- Added an `Export` action beside `Save`, opening the existing `ExportDialog`.
- Kept both dialogs lazily rendered only when opened so regular claim detail rendering remains lightweight.
- Added item-detail tests proving:
  - Save opens the local snapshot dialog from claim detail.
  - Export opens the session export dialog from claim detail.

## Why

The complete flow spec requires save/export from quick-result and claim-detail workflows. Before this slice, claim detail showed a disabled `Save` button and no direct export action, leaving a visible product promise unimplemented.

## Verification

- `npx vitest run tests/item-detail.test.tsx tests/save-session-button.test.tsx tests/export-dialog.test.tsx`
- `npm run build:automation`
- `git diff --check`
- `npx tsc --noEmit`

Note: the first standalone `npx tsc --noEmit` attempt ran before `.next/types` had been regenerated and failed on missing generated Next type files. `npm run build:automation` regenerated those types successfully, and the subsequent `npx tsc --noEmit` passed.
