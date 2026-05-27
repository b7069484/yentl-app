# Hadassah status row

Date: 2026-05-21
Lane: Mobile and accessibility pass
Status: done

Latest update:

Fixed the active session mobile shell without changing product architecture. Mobile tabs now wrap instead of disappearing off-screen; shell/header controls keep 44px touch targets; overview activity quotes remain readable; transcript uses a constrained reading measure while preserving polite live-region behavior; claim and marker rows wrap more safely on mobile; new shell pulse respects reduced motion.

Verification:

- `npx vitest run tests/session-shell.test.tsx tests/activity-feed.test.tsx tests/aria-live-regions.test.tsx tests/session-header.test.tsx tests/reduced-motion.test.tsx tests/filtered-list.test.tsx`
- `npx tsc --noEmit`
- `npx next build`
- Browser screenshots at 390 x 844 for Overview, Watch, Transcript, Claims, and Markers.

Deliverables:

- `/Users/israelbitton/Live FactCheck/agent-work/hadassah-mobile-a11y/mobile-a11y-report.md`
- `/Users/israelbitton/Live FactCheck/agent-work/hadassah-mobile-a11y/status-row.csv`
- `/Users/israelbitton/Live FactCheck/agent-work/hadassah-mobile-a11y/screenshots/`

Residual:

Production `next start` on port 3001 hit the existing missing Clerk publishable key runtime error, so clean production screenshots were blocked. The dev-rendered Browser screenshots are present and diagnostics were clean.
