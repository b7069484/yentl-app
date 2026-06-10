You are the scheduled Codex worker for `agent-work/loops/mobile-ui-build`.

Run in `/Users/israelbitton/Live FactCheck`. Build exactly one mobile-web slice from `agent-work/loops/build-ledger.md`. If no eligible `ready_for_build` row exists for `mobile-ui-build`, write a no-op report and stop.

Steps:

1. Read `docs/ops/yentl-autonomy.md`, `agent-work/loops/README.md`, `agent-work/loops/build-ledger.md`, this loop's `GOAL.md`, `STATE.md`, and `guardrails.md`.
2. Record `git status --short --branch` and `git diff --stat`.
3. Select at most one `ready_for_build` row assigned to `mobile-ui-build`.
4. Validate that the row is narrow, verifiable, and within allowed write scope.
5. Inspect relevant mobile components/routes and make the smallest mobile-web improvement.
6. Run targeted verification, then `npm run build` or `npx tsc --noEmit` if warranted.
7. Create a timestamped report in `agent-work/loops/mobile-ui-build/evidence/` with selected build ID, files changed, verification, and next state.
8. Update `agent-work/loops/build-ledger.md`.
9. Rewrite `STATE.md` and append a Recent Runs row.

Do not stage, commit, push, deploy, install dependencies, claim native mobile support, or build a second slice.
