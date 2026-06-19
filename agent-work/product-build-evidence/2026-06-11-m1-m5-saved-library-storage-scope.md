# M1/M5 Saved Library Storage-Scope Proof - 2026-06-11

## Scope

Improved the saved-session library for the local-to-cloud handoff path. The
library already merged local and cloud metadata; this pass makes the storage
scope visible and actionable so a user can distinguish local-only, cloud-only,
and local-plus-cloud rows.

## Product Change

- Added a `Storage` filter to `/sessions` with:
  - `All storage`
  - `Any cloud copy`
  - `Local + cloud`
  - `Cloud only`
  - `Local only`
- Search now matches storage scope labels, so queries like `cloud` can find
  cloud-backed saves.
- `/sessions?filter=cloud` now initializes the storage filter to
  `Any cloud copy`, matching the safe auth-return link preserved by the
  sign-in/sign-up fallbacks.
- Resetting the library view now clears the storage filter along with search,
  source filter, and sort.
- The clear-local flow is covered for mixed libraries: local saves are removed,
  while cloud-only and merged cloud rows remain visible.

## Verification

Focused commands:

```bash
npx vitest run tests/sessions-library-page.test.tsx tests/session-sync.test.ts
npx vitest run tests/sessions-library-page.test.tsx tests/auth-fallback.test.tsx tests/session-sync.test.ts
npx tsc --noEmit
npm run lint
npm run test:run
npm run build:automation
```

Results:

- Saved-session focused regression: 2 files, 29 tests passed.
- Auth-return + saved-session focused regression: 3 files, 35 tests passed.
- TypeScript: passed.
- Lint: passed with 0 errors.
- Full Vitest: 166 files, 1747 tests passed.
- Automation build: passed, 42/42 static pages.

New/expanded assertions:

- Storage-scope search finds cloud-backed rows.
- `/sessions?filter=cloud` selects the account-backed `Any cloud copy` view,
  showing both cloud-only and local-plus-cloud rows while excluding local-only
  rows.
- Storage filter narrows merged data to `Local + cloud`, `Cloud only`, and
  `Local only` views.
- Clearing local saves preserves cloud-only and merged cloud rows instead of
  collapsing the library into an empty state.

## Browser Proof

Checked the rendered local app with the in-app browser against
`http://127.0.0.1:3000/sessions?filter=cloud` after saving a validation demo
session through the visible Save dialog.

Observed:

```json
{
  "storageFilterValue": "cloud_backed",
  "storageFilterText": "Any cloud copy",
  "hasNoMatch": true,
  "overflowX": 0
}
```

Then clicked `Reset library view` and observed:

```json
{
  "storageFilterValue": "all",
  "storageFilterText": "All storage",
  "showingAll": true,
  "hasNoMatch": false,
  "overflowX": 0
}
```

## Remaining Work

- Real authenticated cloud proof still needs `YENTL_CLOUD_SYNC_PROOF_AUTH_HEADER`.
- Browser-level proof for merged local/cloud rows should be added once the proof
  harness can safely seed a cloud fixture or run against authenticated cloud.
