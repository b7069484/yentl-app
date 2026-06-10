# Speaker Correction Undo Evidence

Timestamp: 2026-06-09T08:16:06-0400

## Product Slice

Yentl now keeps one reversible speaker-correction snapshot for transcript speaker edits:

- Reassigning a transcript line records the prior transcript, claim, marker, and speaker state.
- Splitting and reassigning the later phrase records the same undo snapshot.
- The correction menu shows a visible correction note and an `Undo last correction` action.
- New-speaker corrections compute the next speaker id without pre-registering it, so undo removes the temporary speaker cleanly.
- Mobile correction controls have 44px tap targets and constrained menu width.

## Files Touched

- `lib/client/session-store.ts`
- `components/session/reassign-speaker-menu.tsx`
- `components/session/TranscriptView.tsx`
- `tests/reassign-speaker-menu.test.tsx`
- `tests/session-store.test.ts`
- `tests/reassign-split.test.ts`

## Automated Verification

- `npx tsc --noEmit` passed.
- `npm test -- tests/reassign-speaker-menu.test.tsx tests/session-store.test.ts tests/reassign-split.test.ts` passed: 3 files, 65 tests.
- `npm run test:run` passed: 146 files, 1609 tests.
- `npm run lint` passed with 18 existing warnings and 0 errors.
- `npm run build` passed.

## Browser Verification

Route: `http://127.0.0.1:3000/session?demo=validation&sample=media_playback_sync&view=watch`

Desktop:

- Opened the transcript speaker menu for `Moderator`.
- Reassigned the first transcript line to `Analyst`.
- Verified the visible badge changed to `Analyst`.
- Verified the correction note: `Reassigned one transcript line from Moderator to Analyst.`
- Clicked undo and verified the visible badge restored to `Moderator`.

Mobile viewport: 390x844

- Reopened the same validation Watch route.
- Verified correction menu target heights:
  - trigger: 44px
  - `Moderator` option: 44px
  - `Analyst` option: 44px
  - `Add new speaker`: 44px
  - `Split & reassign`: 44px
- Verified horizontal overflow: `0`.
- Reassigned to `Analyst`, verified the correction note, clicked undo, and verified the badge restored to `Moderator`.
- Browser console errors: 0.

## Residual Notes

This slice makes existing speaker correction reversible and mobile-safe. The broader target still has open product work around a dedicated mobile sheet variant, correction audit history beyond one undo step, transcript search, and playhead-follow controls.
