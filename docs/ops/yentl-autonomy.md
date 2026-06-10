# Yentl Autonomy Operating Plan

Date: 2026-06-07
Workspace: `/Users/israelbitton/Live FactCheck`
Status: night-shift pilot

## Purpose

Yentl has enough parallel surface area that manual "review, fix, audit, repeat" is now the bottleneck. This packet turns that work into bounded Codex loops: scheduled agents that inspect the repo, choose the next safe action, verify their work, and leave concise evidence for review.

The operating principle is simple: loops may move the project forward, but every run must leave a readable trail and every risky action must be gated.

## Loop Portfolio

| Loop | Night slot | Initial mode | Purpose |
|---|---:|---|---|
| `control-tower` | 12:47 AM | read-mostly | Reconcile repo state, plans, reports, tests, blockers, and next best action. |
| `ui-system-build` | 1:47 AM Mon/Wed/Fri | bounded build | Improve desktop/product UI consistency from the build ledger. |
| `mobile-ui-build` | 1:47 AM Tue/Thu/Sat | bounded build | Improve mobile web UX, source ordering, touch ergonomics, and responsive state. |
| `product-roadmap-build` | 1:47 AM Sun | bounded build | Build one missing roadmap item from accepted Yentl plans. |
| `ui-mobile-audit` | 2:57 AM | audit-first | Check desktop/mobile/web surfaces for layout, truth, platform, and launch regressions. |
| `ui-mobile-fix` | 4:07 AM | bounded repair | Fix one ledger-approved UI/mobile issue, then verify it and update the ledger. |
| `watchdog` | 5:27 AM | read-only | Audit the other loops for drift, repeated stalls, guardrail breaks, and stale state. |
| `automation-supervisor` | 6:17 AM | read-only | Verify cron configs, supported model, schedule health, evidence freshness, and whether the ladder is safe for the next night. |
| `phase-1a-worker` | paused | implementation | Execute `2026-05-28-yentl-launch-foundation-phase-1a.md` task-by-task after the first two loops prove clean. |
| `speaker-attribution-eval` | paused | evaluation | Build and score the hard-window attribution pack without overclaiming readiness. |

The slots intentionally avoid exact overlap with other observed Codex automations, including Hamodia at 12:15, 1:00, 2:15, 3:30, 4:45, 6:00, and 6:35 AM. Keep future Yentl jobs on odd minutes inside 12:00 AM-7:00 AM unless there is a specific reason to do otherwise.

Runtime note as of 2026-06-08: local automation session evidence showed Codex cron hour fields executing as UTC while the user-facing target remains America/New_York. The persisted automation configs were therefore offset to land at the Eastern slots above during EDT. Supervisors should verify effective local execution time and evidence freshness, not just the raw stored hour. Revisit the offset when DST changes or if the app adds explicit timezone-aware cron storage.

## Source Of Truth

Each loop must start from these files before making claims about current state:

- `git status --short --branch`
- `agent-work/README.md`
- `agent-work/loops/README.md`
- `agent-work/loops/change-control.md`
- `docs/orchestration/2026-05-21-yentl-agent-orchestration.md`
- `docs/superpowers/plans/2026-05-28-yentl-launch-foundation-phase-1a.md`
- `docs/superpowers/plans/2026-05-28-speaker-attribution-conversation-intelligence-plan.md`
- `docs/superpowers/specs/2026-05-28-speaker-attribution-conversation-intelligence-spec.md`
- `docs/superpowers/validation/2026-05-26-external-launch-proof-checklist.md`
- Its own `agent-work/loops/<loop>/STATE.md`, `GOAL.md`, and `guardrails.md`
- `agent-work/loops/issue-ledger.md`
- `agent-work/loops/build-ledger.md`

`manual-*last-message*` files are useful handoff notes, but they are not authoritative when a later `STATE.md`, `issue-ledger.md`, `build-ledger.md`, or `change-control.md` entry supersedes them.

## Safety Rules

1. Start every run by recording the branch, dirty files, and whether the checkout is behind origin.
2. Preserve unrelated user or agent work. Do not reset, clean, rebase, stage, commit, or push unless a loop-specific guardrail explicitly allows it.
3. Write only to the loop's own folder unless the loop-specific guardrail allows more.
4. Prefer audit reports and small, reversible changes over broad implementation.
5. Use concrete verification: tests, typecheck, build, smoke scripts, screenshots, or explicit file evidence.
   - Default product build proof remains `npm run build`.
   - If a Codex automation sandbox hits the known Next/Turbopack panic with `creating new process`, `binding to a port`, and `Operation not permitted`, run `npm run build:automation` as the sandbox-safe build proof and record both commands. Do not use this fallback for ordinary TypeScript, route, CSS syntax, app runtime, or deployment failures.
6. Audit findings must be deduped against `agent-work/loops/issue-ledger.md`. A repeated issue is a recurrence or failed fix, not a new finding.
7. Build work must be selected from `agent-work/loops/build-ledger.md` or added there before implementation. A build loop may not invent a new feature mid-run.
8. If the same blocker repeats for three runs, stop trying to work around it and write an escalation note.
9. Never claim mobile/iOS/Android readiness from desktop web evidence alone.
10. Never claim robust speaker attribution before hard-window labels and scoring support it.
11. Never turn on production diarization unless the consent/legal gate explicitly permits it.
12. Keep public copy aligned with actual runtime behavior: guest/local-first unless account-backed sync exists and is documented.
13. Contract maintenance belongs to an explicit steward path: scheduled loops may not edit their own `GOAL.md`, `worker-prompt.md`, or `guardrails.md`; interactive maintenance must be recorded in `agent-work/loops/change-control.md`.

## Nightly Workflow

1. **Control Tower, 12:47 AM:** records current repo truth, checks whether any active loop should stand down, and identifies the safest lane for the night.
2. **Rotating Build Lane, 1:47 AM:** exactly one build lane runs based on the weekday. It selects one `ready_for_build` item from the build ledger and either builds it or blocks it with evidence.
3. **UI/Mobile Audit, 2:57 AM:** inspects routes and prior evidence after the build lane, writes findings, dedupes them into the issue ledger, and marks candidates as `ready_for_fix` only when they are narrow and verifiable.
4. **UI/Mobile Fix, 4:07 AM:** selects exactly one `ready_for_fix` issue, makes the smallest safe code change, runs the issue's verification, and marks it `fixed_pending_verify` or `blocked`.
5. **Watchdog, 5:27 AM:** audits scope, repeated issues, stale state, and unsupported claims. If a loop violates guardrails, it writes STOP.
6. **Automation Supervisor, 6:17 AM:** audits the app automation configs, model/runtime, active schedules, and whether the expected evidence was created. It does not mutate schedules during its scheduled run.

## Issue Ledger Rules

The ledger is the persistence layer that stops loops from rediscovering the same issue forever.

- Every issue gets a stable ID: `YENTL-UI-0001`, `YENTL-MOBILE-0001`, `YENTL-TRUTH-0001`, etc.
- A finding may not be reported as new until the audit loop searches the ledger for same route/component/symptom.
- If the same symptom remains after a fix, set status to `reopened` and increment `recurrence_count`.
- If an issue appears in three reports with no fix attempt, set status to `escalated`.
- If a fix is made, the fixing loop must write exact files changed, commands run, and verification evidence.
- If verification cannot be run, the issue cannot be marked fixed; use `blocked_needs_verification`.
- The morning report should include only new issues, reopened issues, and completed fixes, not the whole backlog.

## Build Ledger Rules

The build ledger is the persistence layer for missing functionality and planned improvements.

- Every build item gets a stable ID: `YENTL-BUILD-0001`, `YENTL-UI-ROADMAP-0001`, `YENTL-MOBILE-BUILD-0001`, etc.
- Build loops may only work on rows marked `ready_for_build`.
- If a build loop discovers prerequisite work, it adds or updates ledger rows instead of starting a broad rewrite.
- A row becomes `built_pending_verify` after code changes and local checks.
- A later audit/watchdog pass marks it `verified_done`, `reopened`, or `blocked_needs_verification`.
- `npm run build:automation` may satisfy the build leg only when the normal build is blocked by the documented Codex/Turbopack sandbox process-bind panic and the same code has passed typecheck, focused tests, full tests, and either a non-sandbox `npm run build` or the sandbox-safe webpack build.
- Build loops should prefer one narrow product slice per run over broad visual/product rewrites.

## Human Approval Gates

Loops must stop and ask for review before:

- pushing to `main` or creating a production deployment
- enabling production diarization or changing capture/consent semantics
- adding paid services, subscriptions, or new vendor integrations
- editing legal claims in `/privacy`, `/terms`, DPIA, DPA, or subprocessors pages beyond audit notes
- changing branch history or deleting user/agent artifacts
- making broad visual redesigns that affect more than one product area
- launching native iOS/Android claims
- changing loop contracts without a recorded change-control entry

## Initial Seven-Day Pilot

Days 1-2:

- Run `control-tower`, the rotating build lane, `ui-mobile-audit`, `ui-mobile-fix`, and `watchdog` overnight.
- The fix loop may only act on a ledger row marked `ready_for_fix`.
- The build loop may only act on a build-ledger row marked `ready_for_build`.
- If no issue is ready, the fix loop writes a no-op report and does not improvise.
- If no build item is ready, the build loop writes a no-op report and does not improvise.

Days 3-4:

- If reports are useful and clean, broaden `ui-mobile-fix` to cover one additional UI surface class per night.
- If reports are noisy, pause fix and sharpen audit criteria.

Days 5-7:

- Enable `phase-1a-worker` only after the control tower confirms the dirty worktree and branch strategy are safe.
- Keep `speaker-attribution-eval` read-mostly until the hard-window manifest and sidecar schema are agreed.

## Review Surface

The main review entrypoints are:

- `agent-work/loops/control-tower/STATE.md`
- `agent-work/loops/control-tower/evidence/`
- `agent-work/loops/ui-mobile-audit/STATE.md`
- `agent-work/loops/ui-mobile-audit/evidence/`
- `agent-work/loops/ui-system-build/STATE.md`
- `agent-work/loops/ui-system-build/evidence/`
- `agent-work/loops/mobile-ui-build/STATE.md`
- `agent-work/loops/mobile-ui-build/evidence/`
- `agent-work/loops/product-roadmap-build/STATE.md`
- `agent-work/loops/product-roadmap-build/evidence/`
- `agent-work/loops/ui-mobile-fix/STATE.md`
- `agent-work/loops/ui-mobile-fix/evidence/`
- `agent-work/loops/watchdog/STATE.md`
- `agent-work/loops/watchdog/evidence/`
- `agent-work/loops/automation-supervisor/STATE.md`
- `agent-work/loops/automation-supervisor/evidence/`
- `agent-work/loops/issue-ledger.md`
- `agent-work/loops/build-ledger.md`

The fastest daily human review should be: read the latest control-tower report, then only open UI/watchdog evidence if it flags an issue.
