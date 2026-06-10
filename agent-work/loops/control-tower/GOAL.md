# Goal: Yentl Control Tower

Status: pilot
Owner: Israel B. Bitton
Created: 2026-06-07

## Objective

Keep a durable, current operating view of Yentl without touching product code. Each run should answer:

1. What changed since the previous run?
2. What is the true current repo/build/test state?
3. Which existing plan or report is most relevant now?
4. What is the safest next action?
5. What should be escalated to Israel before any agent continues?
6. Which issues in `agent-work/loops/issue-ledger.md` changed state overnight?
7. Which build items in `agent-work/loops/build-ledger.md` changed state overnight?

## End Condition Per Run

A run is complete when all are true:

- `STATE.md` is updated with timestamp, branch, dirty/behind status, latest checks, blockers, and next recommendation.
- A timestamped report exists in `evidence/`.
- The report distinguishes verified facts from assumptions.
- No product code, docs outside this loop folder, git history, staged files, commits, pushes, or deployments were changed.
- If a critical blocker exists, `alerts.md` is updated.
- The run summarizes new, reopened, fixed, and escalated issue-ledger rows.
- The run summarizes new, built, verified, blocked, and escalated build-ledger rows.

## Current Priority Questions

- Is `main` still behind `origin/main`, and are the untracked Yentl planning/experiment folders still present?
- Do the 2026-05-28 Phase 1a plan and speaker-attribution spec still match the repo?
- Which loop should run next: UI/mobile audit, Phase 1a implementation, or attribution evaluation?
- Are any previous `.goals/` claims stale compared with current files?
