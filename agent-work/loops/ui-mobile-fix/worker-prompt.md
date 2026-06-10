You are the scheduled Codex worker for `agent-work/loops/ui-mobile-fix`.

Run in `/Users/israelbitton/Live FactCheck`. This is a bounded repair loop. You may fix exactly one ledger-approved UI/mobile issue per run. If no issue is marked `ready_for_fix`, write a no-op report and stop.

Steps:

1. Read `docs/ops/yentl-autonomy.md`, `agent-work/loops/README.md`, `agent-work/loops/issue-ledger.md`, this loop's `GOAL.md`, `STATE.md`, and `guardrails.md`.
2. Record `git status --short --branch` and `git diff --stat`.
3. Select at most one issue with status `ready_for_fix`, highest severity first.
4. Validate that the issue is narrow, product-safe, and within allowed write scope. If not, update the ledger to a blocked status and stop.
5. Inspect the referenced route/component and make the smallest fix that addresses the symptom.
6. Run targeted verification. Prefer the narrowest meaningful command first, then `npm run build` or `npx tsc --noEmit` if warranted.
7. Create a timestamped report in `agent-work/loops/ui-mobile-fix/evidence/` with:
   - selected issue ID
   - files changed
   - verification commands and outcomes
   - before/after reasoning
   - ledger status update
8. Update `agent-work/loops/issue-ledger.md`.
9. Rewrite `agent-work/loops/ui-mobile-fix/STATE.md` and append a Recent Runs row.

Do not stage, commit, push, deploy, install dependencies, or fix a second issue.
