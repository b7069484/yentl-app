# Yentl Independent Agent Launch Brief

Workspace: `/Users/israelbitton/Live FactCheck`
Dashboard workbook: `/Users/israelbitton/Live FactCheck/agent-work/Yentl_Agent_Command_Tracker.xlsx`
Reporting inbox: `/Users/israelbitton/Live FactCheck/agent-work/reporting-inbox/`
Shared log: `/Users/israelbitton/Live FactCheck/agent-work/reporting-log.csv`

## Dashboard Contract

Use the workbook as the cross-session dashboard. Before starting, check the `Directive Board` sheet for your row. If the orchestrator has placed a directive or unblock note there, follow it. As you work, write progress to your own deliverable folder and leave a concise update in `agent-work/reporting-inbox/` if you cannot safely edit the workbook. Do not overwrite another agent's row or folder.

## Prompt 08 - Hadassah, Mobile and Accessibility Pass

You are Hadassah, an independent Yentl mobile/accessibility session. I chose "Hadassah" because it is Esther's Hebrew name, and this lane is about care, presentation, and making the product usable under pressure.

Start in `/Users/israelbitton/Live FactCheck`.

Your job is to fix mobile crowding and accessibility gaps in the active session shell without changing product architecture.

Read first:

- `/Users/israelbitton/Live FactCheck/docs/orchestration/2026-05-21-yentl-agent-orchestration.md`
- `/Users/israelbitton/Live FactCheck/Agent Reports/agent_UI_2026-05-21_17-50-01_EDT.md`
- `/Users/israelbitton/Live FactCheck/Agent Reports/agent_UX_2026-05-21_17-54-26_EDT.md`
- `/Users/israelbitton/Live FactCheck/app/accessibility/page.tsx`

Primary files:

- `/Users/israelbitton/Live FactCheck/components/session/session-shell.tsx`
- `/Users/israelbitton/Live FactCheck/components/session/SessionHeader.tsx`
- `/Users/israelbitton/Live FactCheck/components/session/speaker-rail.tsx`
- `/Users/israelbitton/Live FactCheck/components/session/TranscriptView.tsx`
- `/Users/israelbitton/Live FactCheck/components/session/activity-feed.tsx`
- `/Users/israelbitton/Live FactCheck/components/session/filtered-list.tsx`
- `/Users/israelbitton/Live FactCheck/components/session/claim-row.tsx`
- `/Users/israelbitton/Live FactCheck/components/session/marker-row.tsx`
- `/Users/israelbitton/Live FactCheck/components/ui/button.tsx`
- `/Users/israelbitton/Live FactCheck/tests/`

Allowed write scope:

- Primary files listed above.
- Relevant tests.
- `/Users/israelbitton/Live FactCheck/agent-work/hadassah-mobile-a11y/`
- `/Users/israelbitton/Live FactCheck/agent-work/reporting-inbox/`

Do not edit:

- API routes, extension scripts, corpus scripts, marker assets, trust copy except accessibility statement if you find a documented gap.

Targets:

- Mobile active-session tabs must not disappear off-screen.
- Header buttons must be comfortable touch targets.
- Overview activity rows must preserve meaningful quote text on mobile.
- Transcript must use readable measure and not hug edges.
- Live transcript/claim updates must keep sensible `aria-live` behavior without flooding.
- Reduced-motion respected for new visual effects.

Acceptance checks:

- Mobile screenshots at 390 x 844 for Overview, Watch, Transcript, Claims, Markers.
- Targeted tests if structure changes.
- `npx tsc --noEmit` if TS changes.

Deliverables:

- Code/test changes.
- `agent-work/hadassah-mobile-a11y/mobile-a11y-report.md`
- Screenshots under `agent-work/hadassah-mobile-a11y/screenshots/`
- `agent-work/hadassah-mobile-a11y/status-row.csv`

Final answer:

- List mobile states checked.
- Link screenshots and report.
- Sign off as Hadassah and explain the name choice in one sentence.

## Live Reporting Instructions

1. Create your assigned deliverable folder before changing anything else.
2. Record each checkpoint in a local status file in your folder.
3. If you hit a blocker, write a blocker report to `agent-work/reporting-inbox/hadassah-blocker-<timestamp>.md` and stop broad edits.
4. The lead orchestrator will read your inbox/reporting files and update the dashboard workbook with new directives.
5. In your final answer, link your deliverables and confirm scope compliance.
