# Saved Library Source Evidence

Timestamp: 2026-06-09 03:08 EDT

## Product change

- Saved-session metadata now carries source-evidence continuity:
  - `source_count`
  - `source_linked_count`
  - `high_source_count`
- `saveSession`, `listSessions`, and `loadSession` derive or refresh those counts from each saved session's claims and sources.
- `/sessions` rows now show linked-source coverage, such as `1/1 linked sources`, on desktop and mobile rows.
- Saved-session search now matches source-evidence terms like linked-source counts and high-reputation source counts.

## Verification

- `npx vitest run tests/session-storage.test.ts tests/sessions-library-page.test.tsx`
  - PASS: 2 files, 37 tests.
- `npx vitest run tests/source-evidence.test.ts tests/session-storage.test.ts tests/sessions-library-page.test.tsx tests/export/json.test.ts tests/export/markdown.test.ts tests/export/report.test.ts tests/export-dialog.test.tsx tests/item-detail.test.tsx tests/learn-more.test.tsx tests/session-page.test.tsx`
  - PASS: 10 files, 134 tests.
- `npm run build:automation`
  - PASS: Next production build and embedded TypeScript pass.
- `npx tsc --noEmit`
  - PASS.
- `git diff --check`
  - PASS.

## Browser proof

- Opened `http://127.0.0.1:3000/session/detail/claim/solo_005-claim-1?demo=validation&sample=solo_005`.
- Confirmed the hydrated validation claim showed:
  - Source dossier
  - Strongest source badge
  - `worldbank.org · HIGH · image missing · score 38`
  - `Evidence: high reputation + excerpt + no image`
  - `Claim link: world, population`
  - Highlighted excerpt overlap.
- Saved the session through the visible `Save local snapshot` dialog.
- Opened `http://127.0.0.1:3000/sessions`.
- Confirmed the saved row showed:
  - `Validation demo: Hans Rosling: Global population growth, box by box`
  - `2 claims`
  - `1 speakers`
  - `1/1 linked sources`
- Rechecked at `390x844` viewport and confirmed the mobile row still showed `1/1 linked sources`.

## Notes

- The browser fixture uses the real local IndexedDB save/read path, not a mocked session-library test double.
- The saved row came from the seeded `solo_005` validation fixture with the World Bank high-reputation source.
