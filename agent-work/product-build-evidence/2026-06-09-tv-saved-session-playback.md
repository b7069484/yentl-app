# TV Saved-Session Playback

Date: 2026-06-09 03:39 EDT

## Product Change

- Added `components/session/saved-session-hydrator.tsx`.
  - Supports `/tv?restore=<saved-session-id>`.
  - Loads the browser-local saved session from IndexedDB through the existing `loadSession` contract.
  - Restores the saved session into the normal session store before rendering the TV dashboard.
  - Shows TV-scoped loading and not-found states.
  - Uses the saved-library snapshot name as the room-display title, so renamed saves open with the user-visible library name.
- Updated `/tv` to support saved-session restore and preserve validation sample mode when no restore id is present.
- Added a `Room` action to each `/sessions` saved-session row.
  - Links to `/tv?restore=<id>`.
  - Uses a mobile-sized touch target and accessible label.

## Verification

- Focused tests:
  - `npx vitest run tests/saved-session-hydrator.test.tsx tests/tv-dashboard.test.tsx tests/sessions-library-page.test.tsx tests/public-entry-pages.test.tsx`
  - Result: 4 files passed, 28 tests passed.
- Production build, standalone typecheck, and diff hygiene:
  - `npm run build:automation && npx tsc --noEmit && git diff --check`
  - Result: passed.

## Browser Proof

- Loaded a validation demo in `/session`, saved it through the real `Save local snapshot` dialog as `TV restore proof 2026-06-09 0334`, then opened `/sessions`.
- `/sessions` at 1280x720:
  - Saved row appeared.
  - `Room` link was present with href `/tv?restore=01KTNN1CFKV1CK7VE1BKFA81BB`.
  - No horizontal overflow.
- `/tv?restore=01KTNN1CFKV1CK7VE1BKFA81BB` at 1280x720:
  - TV dashboard restored the saved session.
  - Heading used the saved library name: `TV restore proof 2026-06-09 0334`.
  - Rendered `Yentl's Read`, `Latest Claims`, and `Transcript Now`.
  - 2 claim detail links were present.
  - No horizontal overflow and no console errors.
- Same restored TV route at 390x844:
  - Heading still used the saved library name.
  - No horizontal overflow.
  - Core headings remained visible: saved title, `Yentl's Read`, `Latest Claims`, `Transcript Now`, `Rhetoric Signals`.

## Remaining Product Gap

Saved-session room playback now works in the browser-local model. Cross-device TV receiver mode still needs a shareable session identifier or account-backed session sync; browser-local saves cannot open on a separate TV device by themselves.
