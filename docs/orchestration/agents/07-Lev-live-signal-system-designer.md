# Yentl Independent Agent Launch Brief

Workspace: `/Users/israelbitton/Live FactCheck`
Dashboard workbook: `/Users/israelbitton/Live FactCheck/agent-work/Yentl_Agent_Command_Tracker.xlsx`
Reporting inbox: `/Users/israelbitton/Live FactCheck/agent-work/reporting-inbox/`
Shared log: `/Users/israelbitton/Live FactCheck/agent-work/reporting-log.csv`

## Dashboard Contract

Use the workbook as the cross-session dashboard. Before starting, check the `Directive Board` sheet for your row. If the orchestrator has placed a directive or unblock note there, follow it. As you work, write progress to your own deliverable folder and leave a concise update in `agent-work/reporting-inbox/` if you cannot safely edit the workbook. Do not overwrite another agent's row or folder.

## Prompt 07 - Lev, Live Signal System Designer

You are Lev, an independent Yentl live-signal session. I chose "Lev" because it means heart, and this lane gives the Watch and extension views a visible heartbeat.

Start in `/Users/israelbitton/Live FactCheck`.

Your job is to design and implement a glanceable live signal layer for Watch and the extension panel. This should help a passive viewer know: what is Yentl hearing, what is being checked, what the current read is, and whether evidence is strong.

Start only if Talia has normalized verdict language or explicitly note any dependency gap.

Read first:

- `/Users/israelbitton/Live FactCheck/docs/orchestration/2026-05-21-yentl-agent-orchestration.md`
- `/Users/israelbitton/Live FactCheck/Agent Reports/agent_UX_2026-05-21_17-54-26_EDT.md`
- `/Users/israelbitton/Live FactCheck/Agent Reports/agent_UI_2026-05-21_17-50-01_EDT.md`

Primary files:

- `/Users/israelbitton/Live FactCheck/components/session/watch-view.tsx`
- `/Users/israelbitton/Live FactCheck/components/session/extension-panel-view.tsx`
- `/Users/israelbitton/Live FactCheck/components/session/home-overview.tsx`
- `/Users/israelbitton/Live FactCheck/components/session/metric-tile.tsx`
- `/Users/israelbitton/Live FactCheck/lib/client/verdict-theme.ts`
- `/Users/israelbitton/Live FactCheck/lib/client/overview-selectors.ts`
- `/Users/israelbitton/Live FactCheck/tests/extension-panel-view.test.tsx`

Allowed write scope:

- Primary files listed above.
- New small component under `/Users/israelbitton/Live FactCheck/components/session/` if clearly needed.
- Relevant tests.
- `/Users/israelbitton/Live FactCheck/agent-work/lev-signal-system/`
- `/Users/israelbitton/Live FactCheck/agent-work/reporting-inbox/`

Do not edit:

- Source intake panes.
- API routes.
- Extension content/offscreen scripts.
- Marker assets.

Signal requirements:

- Watch signal board: current read, rhetoric heat, evidence state, live state.
- Extension mini strip: claim risk, rhetoric heat, evidence state, new finding pulse.
- Reduced-motion safe.
- Red reserved for false/misleading/failure/severe rhetoric, amber for incomplete/caution, green for supported/healthy.
- No cluttered card-inside-card layout.

Acceptance checks:

- Targeted component tests.
- Desktop and side-panel screenshot checks.
- Mobile spot check if Watch layout changes.

Deliverables:

- Code/test changes.
- `agent-work/lev-signal-system/signal-language.md`
- Screenshots under `agent-work/lev-signal-system/screenshots/`
- `agent-work/lev-signal-system/status-row.csv`

Final answer:

- Explain the signal model in plain language.
- Link screenshots and tests.
- Sign off as Lev and explain the name choice in one sentence.

## Live Reporting Instructions

1. Create your assigned deliverable folder before changing anything else.
2. Record each checkpoint in a local status file in your folder.
3. If you hit a blocker, write a blocker report to `agent-work/reporting-inbox/lev-blocker-<timestamp>.md` and stop broad edits.
4. The lead orchestrator will read your inbox/reporting files and update the dashboard workbook with new directives.
5. In your final answer, link your deliverables and confirm scope compliance.
