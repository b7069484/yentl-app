# M1 Saved-Session Library Controls Proof — 2026-06-11

## Scope

Expanded the local session UX proof so the saved-session library is tested as a
real multi-row workspace, not only as a single saved-session restore path.

## Product Path Proven

`npm run session:proof:local` now proves:

- 20 desktop/mobile/session/TV routes still render without overflow or runtime errors.
- A populated validation session saves into browser-local IndexedDB.
- Two additional local saved sessions are seeded for realistic library controls:
  - `Proof text research session`
  - `Proof long audio session`
- `/sessions` renders all 3 rows with source filters and counts.
- Search narrows to the text research session.
- Source filter narrows to the audio session.
- Most-claims sort orders audio, text, then saved validation session.
- Reset restores the full library view.
- Rename changes the saved validation session name.
- JSON export creates an `application/json` Blob.
- Room mode opens the renamed saved session through `/tv?restore=...`.
- The room-mode `Session` action returns to the same restored workspace through
  `/session?restore=...&view=overview`.
- Resume restores the saved session back into `/session`.
- Single delete removes only the renamed validation session and leaves seeded rows visible.
- Clear-all local saves removes remaining local rows and returns to the empty library state.

## Artifact

- `docs/superpowers/validation/session-ux-local-proof.json`

Latest proof summary:

```json
{
  "ok": true,
  "generated_at": "2026-06-11T20:27:18.278Z",
  "check_count": 21,
  "failures": [],
  "libraryControlsResult": {
    "ok": true,
    "searchedFor": "research",
    "filteredSource": "audio_file",
    "sortedBy": "claims",
    "restoredFullView": true
  },
  "clearResult": {
    "ok": true,
    "clearConfirmed": true,
    "emptyStateVisible": true
  },
  "tvReturnResult": {
    "ok": true,
    "path": "/session?restore=01KTW5W4B36PSYZBZ6NGWZT11X&view=overview"
  }
}
```

## Verification

```bash
node --check scripts/validation/prove-session-ux-local.mjs
npx vitest run tests/session-ux-proof-script.test.ts tests/sessions-library-page.test.tsx
npm run session:proof:local
npx vitest run tests/session-ux-proof-script.test.ts
npx tsc --noEmit
npm run lint
npx vitest run tests/session-ux-proof-script.test.ts tests/sessions-library-page.test.tsx tests/session-sync.test.ts tests/save-session-button.test.tsx tests/session-layout.test.tsx tests/saved-session-hydrator.test.tsx
npm run test:run
npm run build:automation
```

Results:

- Static proof/libraries tests: 2 files, 24 tests passed.
- Latest session proof-script guard: 1 file, 3 tests passed.
- Focused session regression set: 6 files, 58 tests passed.
- Session browser proof: passed, 21 checks, 0 failures, including TV return to
  `/session?restore=...&view=overview`.
- TypeScript: passed.
- Lint: passed.
- Full Vitest: 167 files, 1755 tests passed.
- Automation build: passed, 42/42 static pages.
