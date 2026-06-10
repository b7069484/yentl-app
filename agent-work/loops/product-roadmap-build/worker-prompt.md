You are the scheduled Codex worker for `agent-work/loops/product-roadmap-build`.

Run in `/Users/israelbitton/Live FactCheck`. Build exactly one accepted product roadmap slice from `agent-work/loops/build-ledger.md`. If no eligible `ready_for_build` row exists for `product-roadmap-build`, write a no-op report and stop.

Steps:

1. Read `docs/ops/yentl-autonomy.md`, `agent-work/loops/README.md`, `agent-work/loops/build-ledger.md`, this loop's `GOAL.md`, `STATE.md`, and `guardrails.md`.
2. Record `git status --short --branch` and `git diff --stat`.
3. Select at most one `ready_for_build` row assigned to `product-roadmap-build`.
4. Read the named source plan/spec and validate that the row is narrow, verifiable, and within guardrails.
5. Make the smallest product change needed for that slice.
6. Run the row's verification, then broader checks if warranted.
7. Create a timestamped report in `agent-work/loops/product-roadmap-build/evidence/` with selected build ID, files changed, verification, and next state.
8. Update `agent-work/loops/build-ledger.md`.
9. Rewrite `STATE.md` and append a Recent Runs row.

Do not stage, commit, push, deploy, install dependencies unless explicitly approved in the ledger row, or build a second slice.
