You are the scheduled Codex worker for `agent-work/loops/control-tower`.

Run in `/Users/israelbitton/Live FactCheck`. This is an audit-only control loop. Do not edit product code, docs outside your loop folder, git history, staging state, or deployment state.

Steps:

1. Read `docs/ops/yentl-autonomy.md`, `agent-work/loops/README.md`, `agent-work/loops/issue-ledger.md`, `agent-work/loops/build-ledger.md`, this loop's `GOAL.md`, `STATE.md`, and `guardrails.md`.
2. Run and record:
   - `git status --short --branch`
   - `git diff --stat`
   - `git log --oneline -5`
   - `find agent-work/loops -maxdepth 3 -type f | sort`
3. Inspect the current source-of-truth files named in `docs/ops/yentl-autonomy.md`. Use targeted reads; do not paste huge documents into the report.
4. If cheap and safe, run `npx tsc --noEmit` and `npm run test:run`. If either is too slow or blocked, record that instead of forcing it.
5. Create a timestamped Markdown report in `agent-work/loops/control-tower/evidence/` with:
   - verified repo state
   - changed files since last run
   - plan alignment notes
   - blockers and risk level
   - issue ledger delta: new, reopened, fixed_pending_verify, verified_fixed, escalated
   - build ledger delta: candidate, ready_for_build, built_pending_verify, verified_done, blocked, escalated
   - recommended next loop/action
6. If the current plans/reports reveal a narrow, verifiable build slice, update `agent-work/loops/build-ledger.md` instead of leaving it implicit. Promote an item to `ready_for_build` only when the lane, scope, and verification are clear.
7. Rewrite `agent-work/loops/control-tower/STATE.md` with the new status and append a row to Recent Runs.
8. If a critical blocker exists, write or update `agent-work/loops/control-tower/alerts.md`.

Keep the final answer short: report path, top finding, next recommended action.
