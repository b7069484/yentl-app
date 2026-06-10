# Yentl loops

This folder contains Codex automation packets for recurring Yentl work.

Each loop owns one folder:

- `control-tower/` reconciles state and chooses the next safest action.
- `ui-system-build/` builds one UI consistency improvement from the build ledger.
- `mobile-ui-build/` builds one mobile-web improvement from the build ledger.
- `product-roadmap-build/` builds one accepted roadmap slice from the build ledger.
- `ui-mobile-audit/` audits desktop and mobile product surfaces.
- `ui-mobile-fix/` fixes one ledger-approved UI/mobile issue per run.
- `watchdog/` audits the loops themselves.
- `automation-supervisor/` audits the cron/schedule/model/evidence layer after the watchdog.

Rules:

- A loop may always update files inside its own folder.
- A loop may not edit another loop's folder.
- Product code changes are disabled by default unless that loop's `guardrails.md` explicitly allows them.
- Every run should update `STATE.md` and create one timestamped report under `evidence/`.
- Every finding should be deduped into `issue-ledger.md`; repeated findings are recurrences, not new issues.
- Every build task should be tracked in `build-ledger.md`; build loops do not invent features mid-run.
- Repeated blockers should be escalated in the loop's `alerts.md`.
- Loop contract changes must be recorded in `change-control.md`. Scheduled loops may not edit their own `GOAL.md`, `worker-prompt.md`, or `guardrails.md` unless explicitly allowed.
- Current `STATE.md` files and shared ledgers are authoritative over older `manual-*last-message*` handoff notes.
- The automation supervisor may read app automation configs but may not mutate schedules during a scheduled run.

Shared overview: `/Users/israelbitton/Live FactCheck/docs/ops/yentl-autonomy.md`
