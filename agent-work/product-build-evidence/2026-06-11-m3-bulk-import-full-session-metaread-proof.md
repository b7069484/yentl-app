# M3 Bulk Import Full-Session Meta-Read Proof - 2026-06-11

## Scope

Closed a meta-view gap for long bulk imports. Uploaded files, direct media URLs,
text/PDF imports, and full YouTube caption imports already appended the whole
transcript before analysis, but their scheduled synthesis pass used the normal
trailing live window. That meant the first post-import Yentl Opinion could be
tail-biased until the user ended the session.

## Product Change

- `runSynthesisNow` now accepts an explicit `scope`.
- Bulk imports schedule `runSynthesisNow({ scope: "full_session" })`.
- Live/mic/default synthesis still uses the trailing live window.
- Added regression coverage proving:
  - default `runSynthesisNow()` sends the trailing 20 utterances as
    `live_window`
  - `runSynthesisNow({ scope: "full_session" })` sends every transcript segment
    and marks `analysis_scope.mode` as `full_session`
  - `bulkIngest` schedules the full-session scope

## Proof

- `npm run analysis:proof:metaread` passed.
- `npm run ingestion:proof:ui` passed with 8 rendered ingestion flows after the
  change.
- YouTube caption UI proof still reaches Watch and does not regress into
  `/api/extract-claims` 400s.

## Verification

- `npx vitest run tests/ingest-orchestrator.test.ts tests/end-session-synthesis.test.ts tests/orchestrator-synthesis-state.test.ts tests/synthesis-ownership-context.test.ts` passed: 4 files, 24 tests.
- `npm run analysis:proof:metaread` passed.
- `npx tsc --noEmit` passed.
- `npm run ingestion:proof:ui` passed.
- `npm run lint` passed.
- `npm run test:run` passed: 170 files, 1785 tests.
- `npm run build:automation` passed.
- `git diff --check` passed.

## Remaining M3 Work

- Add a larger long-transcript replay proof that checks final narrative quality,
  not only request shape and meta-read guardrails.
- Expand real multispeaker corpus coverage beyond the current hard-window
  launch gate before public claims about broad conversation mastery.
