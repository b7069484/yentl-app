# Yentl agent orchestration packet

Date: 2026-05-21
Workspace: `/Users/israelbitton/Live FactCheck`
Lead orchestrator: Codex in this thread

## Purpose

This packet converts the current Yentl repo state into independent agent/session lanes. Each lane has a narrow job, a strict write boundary, a named deliverable folder, and a reporting path back to the tracker.

Master tracker workbook:

- `/Users/israelbitton/Live FactCheck/agent-work/Yentl_Agent_Command_Tracker.xlsx`

Shared reporting files:

- `/Users/israelbitton/Live FactCheck/agent-work/reporting-log.csv`
- `/Users/israelbitton/Live FactCheck/agent-work/reporting-inbox/`

Starter prompts:

- Per-agent launch folder: `/Users/israelbitton/Live FactCheck/docs/orchestration/agents/`
- Master source packet: `/Users/israelbitton/Live FactCheck/docs/orchestration/agent-starter-prompts.md`

Directive dashboard:

- Workbook sheet: `Directive Board`
- CSV mirror: `/Users/israelbitton/Live FactCheck/agent-work/directives.csv`

## Common rules for all fresh sessions

1. Start in `/Users/israelbitton/Live FactCheck`.
2. Run `git status --porcelain=v1 -b` before doing anything.
3. Do not switch branches, rebase, reset, clean, stage, commit, or push.
4. Do not edit `.claude/`, `.claire/`, generated corpus outputs, existing agent reports, or another agent's folder.
5. Create or use only your assigned deliverable folder under `/Users/israelbitton/Live FactCheck/agent-work/<agent-slug>/`.
6. Touch only the files listed in your allowed write scope. If you need more, stop and write a blocker note.
7. If you make UI changes, verify with rendered screenshots or browser checks, not just code reading.
8. If you make code changes, run the narrow tests named in your prompt first, then broader checks only if the change warrants it.
9. Every final report must include: files changed, tests run, screenshots or previews checked, unresolved decisions, and whether the agent stayed within scope.
10. Sign off with your assigned Jewish agent name and explain the name choice in one sentence.
11. Each agent should start from its own launch file in `/Users/israelbitton/Live FactCheck/docs/orchestration/agents/`, not from a copied chat prompt.
12. Each agent should check the workbook `Directive Board` before starting and write progress to its assigned deliverable folder plus `agent-work/reporting-inbox/` if it cannot safely edit the workbook directly.

## Launch queue

| Order | Agent | Lane | Start now? | Why |
|---:|---|---|---|---|
| 0 | Moshe | Worktree safety map | Yes | Prevents sessions from trampling dirty local work. |
| 1 | Noam | Marker iconography image direction | Yes | The current SVGs are bare procedural placeholders; this needs a design pass before animation. |
| 2 | Miriam | Flow atlas truth and missing-state inventory | Yes | The `/project/flows` map is the user's review spine. |
| 3 | Ezra | Chrome extension proof matrix | Yes | Extension value depends on real same-page Chrome verification. |
| 4 | Talia | Product truth and copy lock | Yes | Auth, privacy, accounts, verdict language, and internal route leakage contradict each other. |
| 5 | Shira | Source intake UI repair | Yes | Audio and Media URL CTAs are visibly broken, and older panes lag behind YouTube/browser-tab quality. |
| 6 | Devorah | Security launch gates | Yes, carefully | Critical API/privacy/SSRF/extension-message risks block public preview. |
| 7 | Lev | Watch and extension signal system | After Talia/Shira basics | Needs stable verdict vocabulary and counts before designing glanceable signals. |
| 8 | Hadassah | Mobile and accessibility pass | After Shira/Lev | Session mobile nav and transcript reading need focused QA. |
| 9 | Eli | Source thumbnails and visual evidence integrity | After Talia | Visual evidence must use real validated source images, not generated art. |
| 10 | Aviva | Save, library, export outcomes | After Talia/Ezra | Snapshot vs live sync and account/local-save truth must be clear first. |
| 11 | Yonah | Corpus meaning-under-pressure evaluation | Yes as read-mostly | It can prepare the 10-row evaluation pack without blocking UI work. |
| 12 | Rivka | Claim semantics and meta-review architecture | After Yonah | Claim clusters and reconsideration should be grounded in evaluation evidence. |
| 13 | Ariel | Motion loop prototyping | Wait for Noam approval | Looping animations should start only after static icon art direction is accepted. |

## Agent name rationale

The names are Jewish names chosen for task fit, not caricature.

- Moshe: leadership and order, suited to mapping the worktree before others act.
- Noam: means pleasantness, suited to visual taste and icon polish.
- Miriam: associated with guidance through movement, suited to flow mapping.
- Ezra: associated with help and restoration, suited to proving the extension path works.
- Talia: means dew from God, suited to refreshing the product language and making it honest.
- Shira: means song, suited to making the intake screens feel coherent and composed.
- Devorah: associated with judgment and leadership, suited to security and trust gates.
- Lev: means heart, suited to the live signal layer that tells users what Yentl currently thinks.
- Hadassah: Esther's Hebrew name, suited to care, presentation, and accessibility.
- Eli: means my God, short and sturdy; assigned to evidence integrity because that lane needs discipline.
- Aviva: means springlike or renewal, suited to making saved/exported outcomes useful.
- Yonah: means dove, suited to careful evaluation and meaning under pressure.
- Rivka: associated with discernment and continuity, suited to claim clusters and reconsideration.
- Ariel: means lion of God, suited to motion craft after the static style is approved.

## Dependency notes

- Noam must not integrate generated images into the app until Israel approves the static art direction.
- Ariel must not start animation until Noam has approved static icon masters.
- Lev should wait until Talia has normalized verdict labels and Shira has fixed broken source CTA states.
- Rivka should wait until Yonah defines the evaluation pack and judgment sidecars.
- Devorah can start with read-only security triage and narrow protective tests before editing risky shared routes.

## Source documents reviewed for this packet

- `/Users/israelbitton/Live FactCheck/Agent Reports/agent_reports_synthesis_2026-05-21.md`
- `/Users/israelbitton/Live FactCheck/Agent Reports/agent_security_2026-05-21_17-49-38_EDT.md`
- `/Users/israelbitton/Live FactCheck/Agent Reports/agent_UI_2026-05-21_17-50-01_EDT.md`
- `/Users/israelbitton/Live FactCheck/Agent Reports/agent_UX_2026-05-21_17-54-26_EDT.md`
- `/Users/israelbitton/Live FactCheck/Agent Reports/agent_flow_2026-05-21_18-02-36_EDT.md`
- `/Users/israelbitton/Live FactCheck/Agent Reports/agent_study_2026-05-21_17-54-52_EDT.md`
- `/Users/israelbitton/Live FactCheck/docs/superpowers/visual-evidence/marker-asset-production.md`
- `/Users/israelbitton/Live FactCheck/docs/superpowers/plans/2026-05-21-yentl-complete-flow-screen-state-plan.md`
- `/Users/israelbitton/Live FactCheck/docs/superpowers/specs/2026-05-21-yentl-complete-flow-spec.md`
- `/Users/israelbitton/Live FactCheck/docs/superpowers/handoff/2026-05-21-yentl-next-session-flow-implementation-handoff.md`
- `/Users/israelbitton/Live FactCheck/docs/superpowers/handoff/2026-05-21-yentl-extension-panel-workspace-export-handoff.md`
- `/Users/israelbitton/Live FactCheck/docs/superpowers/handoff/2026-05-21-yentl-extension-corpus-functional-samples.md`
- `/Users/israelbitton/Live FactCheck/docs/superpowers/handoff/2026-05-21-yentl-extension-grok-latency-pickup.md`
