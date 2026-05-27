# Hadassah Mobile and Accessibility Report

Date: 2026-05-21
Workspace: `/Users/israelbitton/Live FactCheck`
Route verified: `http://localhost:3000/session?sample=cable_008`

## Scope

Hadassah stayed inside the assigned mobile/accessibility lane: active session shell, session header, speaker rail, transcript, activity feed, claims/markers list rows, relevant tests, and this deliverable folder.

The repo was already dirty. Existing in-progress changes in shared files were preserved and not reverted.

## Changes Made

- Mobile session tabs now wrap into a 2/3-column segmented grid before returning to a desktop row, so Overview/Watch/Transcript/Claims/Markers stay visible at 390px.
- Header and active-session command buttons now keep 44px touch targets on mobile.
- Overview activity rows now put the quote on its own readable mobile line with multi-line clamping, while keeping the compact desktop row.
- Transcript view now uses a centered readable measure with safer mobile padding, while keeping `role="log"`, `aria-live="polite"`, and interim text outside the live region.
- Claims and marker rows now have mobile-friendly vertical spacing, safer wrapping, and 44px minimum target height.
- New shell status pulse uses `motion-safe:animate-pulse` so reduced-motion settings are respected.

## Mobile States Checked

All screenshots were captured at 390 x 844:

- Overview: `screenshots/overview-390x844.jpg`
- Watch: `screenshots/watch-390x844.jpg`
- Transcript: `screenshots/transcript-390x844.jpg`
- Claims: `screenshots/claims-390x844.jpg`
- Markers: `screenshots/markers-390x844.jpg`

Rendered diagnostics from the Browser pass:

- `documentElement.scrollWidth` stayed at `390` for every checked state.
- Session nav measured `366px` client width and `366px` scroll width, so tabs were not hidden off-screen.
- Header controls measured 44px tall: Sources, Save, Export, End.
- Overview quote text remained visible on mobile: `"something structural, not emotional"`.
- Transcript live region remained polite and constrained by the new reading measure.

## Verification

Passed:

```bash
npx vitest run tests/session-shell.test.tsx tests/activity-feed.test.tsx tests/aria-live-regions.test.tsx tests/session-header.test.tsx tests/reduced-motion.test.tsx tests/filtered-list.test.tsx
npx tsc --noEmit
npx next build
```

Browser/render checks:

- In-app Browser verified the mobile route on port 3000 and captured the five required states.
- A clean production screenshot attempt on port 3001 was blocked by the existing missing Clerk publishable key runtime error in `next start`; the production build itself passed.

## Files Touched

- `components/session/session-shell.tsx`
- `components/session/SessionHeader.tsx`
- `components/session/speaker-rail.tsx`
- `components/session/TranscriptView.tsx`
- `components/session/activity-feed.tsx`
- `components/session/filtered-list.tsx`
- `components/session/claim-row.tsx`
- `components/session/marker-row.tsx`
- `tests/session-shell.test.tsx`
- `tests/activity-feed.test.tsx`
- `tests/aria-live-regions.test.tsx`
- `tests/session-header.test.tsx`
- `agent-work/hadassah-mobile-a11y/*`
- `agent-work/reporting-inbox/hadassah-status-row-2026-05-21.md`

## Residual Notes

- The dev screenshots include the local Next dev badge in the lower-left corner. The actual layout diagnostics are clean; the badge is not app UI.
- The Claims sample state shows `Claims · 0` for `cable_008`, matching the current sample data visible in the app during this pass.

## Sign-Off

Hadassah signs off: the name is Esther's Hebrew name, chosen here for care, presentation, and making Yentl usable under pressure.
