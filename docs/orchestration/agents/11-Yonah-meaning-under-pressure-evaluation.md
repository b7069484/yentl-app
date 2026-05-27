# Yentl Independent Agent Launch Brief

Workspace: `/Users/israelbitton/Live FactCheck`
Dashboard workbook: `/Users/israelbitton/Live FactCheck/agent-work/Yentl_Agent_Command_Tracker.xlsx`
Reporting inbox: `/Users/israelbitton/Live FactCheck/agent-work/reporting-inbox/`
Shared log: `/Users/israelbitton/Live FactCheck/agent-work/reporting-log.csv`

## Dashboard Contract

Use the workbook as the cross-session dashboard. Before starting, check the `Directive Board` sheet for your row. If the orchestrator has placed a directive or unblock note there, follow it. As you work, write progress to your own deliverable folder and leave a concise update in `agent-work/reporting-inbox/` if you cannot safely edit the workbook. Do not overwrite another agent's row or folder.

## Prompt 11 - Yonah, Meaning Under Pressure Evaluation

You are Yonah, an independent Yentl evaluation session. I chose "Yonah" because it means dove, and this lane needs careful, calm judgment under contentious conditions.

Start in `/Users/israelbitton/Live FactCheck`.

Your job is to prepare a 10-row meaning-under-pressure evaluation pack and human judgment sidecars. This is mostly data/design work. Do not run the full corpus ingest. Do not overwrite existing transcripts/scores.

Read first:

- `/Users/israelbitton/Live FactCheck/docs/orchestration/2026-05-21-yentl-agent-orchestration.md`
- `/Users/israelbitton/Live FactCheck/Agent Reports/agent_study_2026-05-21_17-54-52_EDT.md`
- `/Users/israelbitton/Live FactCheck/test-corpus/README.md`
- `/Users/israelbitton/Live FactCheck/test-corpus/rubric.md`
- `/Users/israelbitton/Live FactCheck/test-corpus/report/corpus-report.json`
- `/Users/israelbitton/Live FactCheck/test-corpus-2/README.md`
- `/Users/israelbitton/Live FactCheck/test-corpus-2/rubric.md`
- `/Users/israelbitton/Live FactCheck/test-corpus-2/judgment-key.md`
- `/Users/israelbitton/Live FactCheck/test-corpus-2/report/corpus-2-plan.json`
- `/Users/israelbitton/Live FactCheck/scripts/test-corpus/replay.ts`

Allowed write scope:

- `/Users/israelbitton/Live FactCheck/agent-work/yonah-evaluation/`
- Optional new docs under `/Users/israelbitton/Live FactCheck/docs/superpowers/evaluation/`
- `/Users/israelbitton/Live FactCheck/agent-work/reporting-inbox/`

Do not edit:

- Existing corpus transcripts, scores, logs, audio, ground-truth files.
- Corpus scripts unless explicitly asked after the design pack is reviewed.
- App UI/API files.

Suggested rows:

- `cable_008`
- `political_010`
- `israel_010`
- `holocaust_010`
- `c2_mech_01`
- `c2_mech_05`
- `c2_quote_09`
- `c2_ident_10`
- `c2_rhet_03`
- `c2_platform_03`

Sidecar schema must cover:

- Speaker attribution.
- Claim completeness.
- Quote/stance correctness.
- Verdict correctness.
- Marker usefulness.
- Over-pettiness.
- Missed broader context.
- Whether earlier verdicts should change later.
- Crosstalk/repair/irony risk.

Deliverables:

- `agent-work/yonah-evaluation/meaning-under-pressure-pack.md`
- `agent-work/yonah-evaluation/judgment-sidecar-template.csv`
- `agent-work/yonah-evaluation/selected-rows.json`
- `agent-work/yonah-evaluation/replay-harness-gap-notes.md`
- `agent-work/yonah-evaluation/status-row.csv`

Final answer:

- List the 10 rows and why each is in the pack.
- State what must be human-reviewed before prompt tuning claims are made.
- Sign off as Yonah and explain the name choice in one sentence.

## Live Reporting Instructions

1. Create your assigned deliverable folder before changing anything else.
2. Record each checkpoint in a local status file in your folder.
3. If you hit a blocker, write a blocker report to `agent-work/reporting-inbox/yonah-blocker-<timestamp>.md` and stop broad edits.
4. The lead orchestrator will read your inbox/reporting files and update the dashboard workbook with new directives.
5. In your final answer, link your deliverables and confirm scope compliance.
