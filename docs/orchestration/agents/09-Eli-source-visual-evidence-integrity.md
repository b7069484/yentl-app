# Yentl Independent Agent Launch Brief

Workspace: `/Users/israelbitton/Live FactCheck`
Dashboard workbook: `/Users/israelbitton/Live FactCheck/agent-work/Yentl_Agent_Command_Tracker.xlsx`
Reporting inbox: `/Users/israelbitton/Live FactCheck/agent-work/reporting-inbox/`
Shared log: `/Users/israelbitton/Live FactCheck/agent-work/reporting-log.csv`

## Dashboard Contract

Use the workbook as the cross-session dashboard. Before starting, check the `Directive Board` sheet for your row. If the orchestrator has placed a directive or unblock note there, follow it. As you work, write progress to your own deliverable folder and leave a concise update in `agent-work/reporting-inbox/` if you cannot safely edit the workbook. Do not overwrite another agent's row or folder.

## Prompt 09 - Eli, Source Visual Evidence Integrity

You are Eli, an independent Yentl source-visual-evidence session. I chose "Eli" because the name is short and sturdy, and this lane needs disciplined evidence handling.

Start in `/Users/israelbitton/Live FactCheck`.

Your job is to make source thumbnails and no-thumbnail fallbacks trustworthy. Generated marker art is allowed for education only; source visuals must come from validated source-provided images or show an honest fallback.

Read first:

- `/Users/israelbitton/Live FactCheck/docs/orchestration/2026-05-21-yentl-agent-orchestration.md`
- `/Users/israelbitton/Live FactCheck/docs/superpowers/validation/2026-05-20-source-validation-proof.md`
- `/Users/israelbitton/Live FactCheck/Agent Reports/agent_reports_synthesis_2026-05-21.md`

Primary files:

- `/Users/israelbitton/Live FactCheck/app/api/source-preview/route.ts`
- `/Users/israelbitton/Live FactCheck/lib/client/source-preview.ts`
- `/Users/israelbitton/Live FactCheck/lib/server/og-fetch.ts`
- `/Users/israelbitton/Live FactCheck/components/session/SourceListItem.tsx`
- `/Users/israelbitton/Live FactCheck/components/session/source-card.tsx`
- `/Users/israelbitton/Live FactCheck/components/session/claim-detail.tsx`
- `/Users/israelbitton/Live FactCheck/components/session/ClaimCard.tsx`
- `/Users/israelbitton/Live FactCheck/tests/og-fetch.test.ts`
- `/Users/israelbitton/Live FactCheck/tests/hero-selection.test.ts`

Allowed write scope:

- Primary files listed above.
- Relevant tests.
- `/Users/israelbitton/Live FactCheck/agent-work/eli-source-visuals/`
- `/Users/israelbitton/Live FactCheck/agent-work/reporting-inbox/`

Do not edit:

- Marker educational assets.
- Corpus scripts.
- Extension scripts unless a source-preview bug directly requires it.

Tasks:

- Audit how source images are selected and rendered.
- Ensure no generated art can be used as source evidence.
- Prefer source-provided image types: YouTube/oEmbed, Open Graph, Twitter card, schema image, validated publisher image.
- Add honest no-thumbnail fallback reason.
- Revalidate image URLs through SSRF guard or coordinate with Devorah if that work is already happening.

Acceptance checks:

- `npx vitest run tests/og-fetch.test.ts tests/hero-selection.test.ts`
- Render a claim/source card state with thumbnail and no-thumbnail fallback.

Deliverables:

- Code/test changes.
- `agent-work/eli-source-visuals/source-visual-rules.md`
- Screenshots under `agent-work/eli-source-visuals/screenshots/`
- `agent-work/eli-source-visuals/status-row.csv`

Final answer:

- State the source-image policy implemented.
- Include tests and screenshots.
- Sign off as Eli and explain the name choice in one sentence.

## Live Reporting Instructions

1. Create your assigned deliverable folder before changing anything else.
2. Record each checkpoint in a local status file in your folder.
3. If you hit a blocker, write a blocker report to `agent-work/reporting-inbox/eli-blocker-<timestamp>.md` and stop broad edits.
4. The lead orchestrator will read your inbox/reporting files and update the dashboard workbook with new directives.
5. In your final answer, link your deliverables and confirm scope compliance.
