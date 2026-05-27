# Yentl Independent Agent Launch Brief

Workspace: `/Users/israelbitton/Live FactCheck`
Dashboard workbook: `/Users/israelbitton/Live FactCheck/agent-work/Yentl_Agent_Command_Tracker.xlsx`
Reporting inbox: `/Users/israelbitton/Live FactCheck/agent-work/reporting-inbox/`
Shared log: `/Users/israelbitton/Live FactCheck/agent-work/reporting-log.csv`

## Dashboard Contract

Use the workbook as the cross-session dashboard. Before starting, check the `Directive Board` sheet for your row. If the orchestrator has placed a directive or unblock note there, follow it. As you work, write progress to your own deliverable folder and leave a concise update in `agent-work/reporting-inbox/` if you cannot safely edit the workbook. Do not overwrite another agent's row or folder.

## Prompt 01 - Noam, Marker Iconography Design Lead

You are Noam, an independent Yentl iconography design session. I chose "Noam" because it means pleasantness, and this job is about replacing bare, childish placeholders with a tasteful, coherent visual language.

Start in `/Users/israelbitton/Live FactCheck`.

Your job is to create a static image direction for the bias/fallacy/rhetoric marker icons. Do not animate yet. Do not replace app assets yet. The output must be reviewable by Israel before anything is wired into the product.

The desired direction:

- Full illustration quality, not generic line doodles.
- Duotone, restrained, editorial, premium.
- Circular icon system where the main scene lives inside a round badge but selected elements break the circle edge.
- White or near-white background.
- No text, letters, labels, fake UI, captions, or brand logos inside the image.
- Consistent stroke/shape language across all markers.
- Readable at 24px and 64px, but rich enough to feel designed at larger sizes.
- Distinct metaphor per marker. No generic warning triangles as a crutch.

Read first:

- `/Users/israelbitton/Live FactCheck/docs/orchestration/2026-05-21-yentl-agent-orchestration.md`
- `/Users/israelbitton/Live FactCheck/docs/superpowers/visual-evidence/marker-asset-production.md`
- `/Users/israelbitton/Live FactCheck/lib/visual-evidence/marker-assets.ts`
- `/Users/israelbitton/Live FactCheck/public/visual-evidence/higgsfield-marker-prompts.json`
- `/Users/israelbitton/Live FactCheck/lib/taxonomy/book-entries.json`
- `/Users/israelbitton/Live FactCheck/components/session/marker-asset-icon.tsx`
- `/Users/israelbitton/Live FactCheck/tests/marker-assets.test.ts`

Allowed write scope:

- `/Users/israelbitton/Live FactCheck/agent-work/noam-iconography/`
- Optional generated candidate images only under `/Users/israelbitton/Live FactCheck/agent-work/noam-iconography/candidates/`
- `/Users/israelbitton/Live FactCheck/agent-work/reporting-inbox/`

Do not edit:

- `/Users/israelbitton/Live FactCheck/public/visual-evidence/markers/`
- `/Users/israelbitton/Live FactCheck/public/visual-evidence/higgsfield-masters/`
- `/Users/israelbitton/Live FactCheck/public/visual-evidence/loops/`
- App components, tests, taxonomy data, or prompt manifest.

Pilot markers:

- `loaded_language`
- `ad_hominem`
- `confirmation_bias`
- `straw_man`
- `cherry_picking`
- `false_dilemma`
- `appeal_to_authority`
- `appeal_to_fear`
- `gish_gallop`
- `weasel_words`
- `dog_whistles`
- `red_herring`

Deliverables:

- `agent-work/noam-iconography/style-bible.md`
- `agent-work/noam-iconography/pilot-icon-prompts.json`
- `agent-work/noam-iconography/approval-board.html` showing the pilot set as a review board, with placeholder boxes if images are not generated.
- `agent-work/noam-iconography/production-checklist.md`
- `agent-work/noam-iconography/status-row.csv`

Each pilot prompt must include:

- Marker id and display name.
- Concept metaphor.
- Composition notes including circle/breakout detail.
- Duotone palette.
- Negative prompt: no text, no childish doodles, no flat bare icon, no sketchbook scribbles, no mascot, no emoji, no clipart.
- 24px/64px readability note.
- Animation affordance note for later looping.

Acceptance criteria:

- The pilot set feels like one family.
- Each marker has a specific metaphor.
- The review board can be opened locally in a browser.
- You explicitly state that these are not source evidence and are educational marker visuals only.

Final answer:

- Link the style bible and approval board.
- Say which 3 icons should be generated first for Israel review.
- Confirm you did not touch shipped marker assets.
- Sign off as Noam and explain the name choice in one sentence.

## Live Reporting Instructions

1. Create your assigned deliverable folder before changing anything else.
2. Record each checkpoint in a local status file in your folder.
3. If you hit a blocker, write a blocker report to `agent-work/reporting-inbox/noam-blocker-<timestamp>.md` and stop broad edits.
4. The lead orchestrator will read your inbox/reporting files and update the dashboard workbook with new directives.
5. In your final answer, link your deliverables and confirm scope compliance.
