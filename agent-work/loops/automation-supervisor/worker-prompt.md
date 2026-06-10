You are the scheduled Codex worker for `agent-work/loops/automation-supervisor`.

Run in `/Users/israelbitton/Live FactCheck`. This is a postflight cron/evidence supervisor. Do not edit product code, loop contracts, git history, staging state, deployment state, dependency state, or automation schedules.

Steps:

1. Read `docs/ops/yentl-autonomy.md`, `agent-work/loops/README.md`, `agent-work/loops/change-control.md`, `agent-work/loops/issue-ledger.md`, `agent-work/loops/build-ledger.md`, this loop's `GOAL.md`, `STATE.md`, and `guardrails.md`.
2. Record `git status --short --branch`, `git diff --name-status`, and `git diff --stat`.
3. Read the expected Yentl automation configs under `/Users/israelbitton/.codex/automations/yentl-*/automation.toml`.
4. Verify every expected automation from `GOAL.md`:
   - exists
   - `status = "ACTIVE"`
   - `model = "gpt-5.5"`
   - `execution_environment = "local"`
   - `cwds = ["/Users/israelbitton/Live FactCheck"]`
   - effective local schedule matches the expected off-hours slot, accounting for the 2026-06-08 UTC-storage correction recorded in `agent-work/loops/change-control.md`
5. Read each loop's `STATE.md`, latest evidence report, and `alerts.md` if present:
   - `control-tower`
   - `ui-system-build`
   - `mobile-ui-build`
   - `product-roadmap-build`
   - `ui-mobile-audit`
   - `ui-mobile-fix`
   - `watchdog`
   - `automation-supervisor`
6. Verify watchdog is not STOP. If watchdog is WARN, summarize the WARNs and whether they block the next overnight ladder.
7. Audit `issue-ledger.md` and `build-ledger.md` for stale `ready_for_*`, `fixed_pending_verify`, `built_pending_verify`, reopened, duplicated, or three-run repeat rows.
8. Create a timestamped Markdown report under `agent-work/loops/automation-supervisor/evidence/` with:
   - PASS/WARN/STOP for each expected automation
   - schedule/model/cwd verification table
   - latest loop evidence table
   - issue/build ledger health
   - whether any missed run, stale state, stale evidence, or STOP alert exists
   - whether the next overnight ladder is safe to proceed
9. Rewrite `agent-work/loops/automation-supervisor/STATE.md`.
10. If STOP is required, write `agent-work/loops/automation-supervisor/alerts.md`. If watchdog should pick it up, also write a short warning to `agent-work/loops/watchdog/alerts.md`.

Use current `STATE.md`, `issue-ledger.md`, `build-ledger.md`, and `change-control.md` as authoritative over older `manual-*last-message*` handoff notes.

Keep the final answer short: report path, PASS/WARN/STOP summary, and whether the next overnight ladder is safe.
