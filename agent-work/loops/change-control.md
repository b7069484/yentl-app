# Yentl Loop Change Control

This file records interactive maintenance to loop contracts. It exists so watchdog can distinguish approved setup/steward edits from unattended loop scope drift.

## Rules

- Scheduled loops may not edit their own `GOAL.md`, `worker-prompt.md`, or `guardrails.md` unless that loop's guardrails explicitly allow it.
- Interactive steward edits to loop contracts are allowed only when recorded here with timestamp, files, reason, and safety notes.
- Watchdog should treat recorded steward maintenance as resolved or WARN, not STOP, when no product files changed and the current ledgers route work safely.
- The authoritative run state is the current `STATE.md`, `issue-ledger.md`, and `build-ledger.md`. `manual-*last-message*` evidence files are handoff notes and may be superseded by later ledger/state corrections.

## Entries

### 2026-06-07T18:24:20-04:00

- Type: interactive steward maintenance.
- Approval context: Israel asked Codex to proceed with testing and hardening the full Yentl loop pipeline after the canary run.
- Files:
  - `agent-work/loops/ui-mobile-audit/GOAL.md`
  - `agent-work/loops/ui-mobile-audit/worker-prompt.md`
  - `agent-work/loops/ui-mobile-audit/STATE.md`
  - `agent-work/loops/ui-mobile-audit/alerts.md`
  - `agent-work/loops/issue-ledger.md`
  - `agent-work/loops/pipeline-canary-2026-06-07.md`
- Reason: the `ui-mobile-fix` canary exposed a contract mismatch. Audit had routed `YENTL-TRUTH-0001`, a privacy/legal public-copy claim, toward the normal fix loop; the fix loop correctly excludes privacy/legal edits.
- Safety outcome: `YENTL-TRUTH-0001` is now `blocked_needs_context`; `YENTL-TRUTH-0002` remains the normal `ready_for_fix` candidate. No product files were edited, staged, committed, pushed, deployed, or dependency-installed.
- Watchdog resolution: the prior STOP should be downgraded after confirming these edits match this entry and the current ledger remains safe.

### 2026-06-07T18:30:00-04:00

- Type: automation runtime maintenance.
- Files outside repo: `/Users/israelbitton/.codex/automations/yentl-*/automation.toml`.
- Reason: manual `codex exec` canary runs completed successfully on `gpt-5.5`; the permanent Yentl automations were still configured as `gpt-5-codex`, which is not the runtime used by the successful canaries.
- Change: updated all seven active Yentl cron automations to `model = "gpt-5.5"` through the Codex app automation API while preserving prompts, schedules, status, cwd, execution environment, and reasoning effort.
- Safety outcome: schedules remain off-hours and active; no repo product files were edited, staged, committed, pushed, deployed, or dependency-installed.

### 2026-06-07T18:40:00-04:00

- Type: interactive steward maintenance.
- Approval context: Israel asked whether Codex should set its own loop/cron to check that the full loop series runs as needed.
- Files:
  - `agent-work/loops/automation-supervisor/GOAL.md`
  - `agent-work/loops/automation-supervisor/STATE.md`
  - `agent-work/loops/automation-supervisor/guardrails.md`
  - `agent-work/loops/automation-supervisor/worker-prompt.md`
  - `agent-work/loops/README.md`
  - `docs/ops/yentl-autonomy.md`
- Reason: add a postflight supervisor layer that checks active automation configs, schedules, supported model, evidence freshness, watchdog status, and next-ladder safety without duplicating product audit/fix work.
- Safety outcome: new supervisor is read-only for product and schedule state during scheduled runs; no product files were edited, staged, committed, pushed, deployed, or dependency-installed.

### 2026-06-08T10:50:00-04:00

- Type: automation runtime maintenance.
- Approval context: Israel asked Codex to make sure the Yentl loop series and cron jobs run as needed and to fill the missed actions.
- Files outside repo: `/Users/israelbitton/.codex/automations/yentl-*/automation.toml`.
- Files in repo:
  - `docs/ops/yentl-autonomy.md`
  - `agent-work/loops/automation-supervisor/GOAL.md`
  - `agent-work/loops/automation-supervisor/worker-prompt.md`
  - `agent-work/loops/change-control.md`
- Reason: local session evidence from 2026-06-08 showed Yentl automation hour fields executing as UTC. The `ui-mobile-fix`, `watchdog`, and `automation-supervisor` jobs fired at about 00:08, 01:28, and 02:19 America/New_York even though their human-facing target slots were 04:07, 05:27, and 06:17. Several Hamodia sessions also occupied nearby overnight windows. This made the static configs look correct while the effective local ladder was early.
- Change: updated all eight active Yentl cron automations through the Codex app automation API so their effective run times land on the intended America/New_York ladder during EDT: 12:47 control tower, 1:47 rotating build lane, 2:57 audit, 4:07 fix, 5:27 watchdog, and 6:17 supervisor. Updated supervisor docs to account for the observed UTC-storage correction.
- Safety outcome: prompts, model `gpt-5.5`, status, local execution environment, cwd, and off-hours spacing were preserved. No product files were edited by this schedule-maintenance step, and no git staging, commits, pushes, deploys, dependency installs, or destructive git actions were performed.

### 2026-06-08T15:57:00-04:00

- Type: temporary one-run automation wave.
- Approval context: Israel asked Codex to start the whole Yentl loop flow immediately rather than waiting for the overnight ladder, with each loop following in order.
- Files outside repo:
  - `/Users/israelbitton/.codex/automations/yentl-test-2026-06-08-*/automation.toml`
  - `/Users/israelbitton/.codex/automations/yentl-immediate-wave-monitor/automation.toml`
- Files in repo:
  - `agent-work/loops/test-wave-2026-06-08.md`
  - `agent-work/loops/change-control.md`
- Reason: create a waking-hours ordered proof run across control tower, product build, UI-system build, mobile build, UI/mobile audit, UI/mobile fix, watchdog, and automation supervisor while preserving the permanent 12 AM-7 AM Yentl schedules.
- Change: created eight temporary `COUNT=1` local cron automations on `gpt-5.5`, then corrected their raw hour fields to account for the documented UTC-storage behavior so the effective America/New_York order starts at 4:08 PM and ends at 9:38 PM on 2026-06-08. Added a temporary thread heartbeat monitor to check the wave evidence and correct only temporary one-shot jobs if a run misses its effective slot.
- Safety outcome: permanent Yentl cron automations were not changed; temporary jobs are one-run only; no product files were edited by this schedule-maintenance step, and no git staging, commits, pushes, deploys, dependency installs, or destructive git actions were performed.

### 2026-06-08T16:13:00-04:00

- Type: interactive verification contract maintenance.
- Approval context: the immediate-wave control-tower run proved `npx tsc --noEmit` and `npm run test:run` but hit a Next/Turbopack sandbox panic during `npm run build` (`creating new process`, `binding to a port`, `Operation not permitted`) while processing `components/BorderGlow.css`.
- Files:
  - `package.json`
  - `docs/ops/yentl-autonomy.md`
  - `agent-work/loops/build-ledger.md`
  - `agent-work/loops/test-wave-2026-06-08.md`
  - `agent-work/loops/control-tower/STATE.md`
  - `agent-work/loops/control-tower/alerts.md`
  - `agent-work/loops/control-tower/evidence/control-tower-2026-06-08T16-19-32-0400-verification-unblock.md`
  - `agent-work/loops/product-roadmap-build/STATE.md`
  - `agent-work/loops/product-roadmap-build/alerts.md`
  - `agent-work/loops/product-roadmap-build/evidence/2026-06-08T16-19-32-0400-yentl-product-build-0012-verification-unblock.md`
  - `agent-work/loops/change-control.md`
- Reason: keep normal product/deploy build proof as `npm run build`, but give Codex automation workers a documented sandbox-safe webpack build command for the known Turbopack process-bind failure so they do not repeatedly block completed slices on infrastructure behavior.
- Change: added `npm run build:automation` as `next build --webpack` and documented that it may be used only for the known Codex/Turbopack sandbox panic after typecheck and tests pass. It must not mask ordinary TypeScript, route, CSS syntax, runtime, or deployment failures. Reran focused tests, typecheck, full tests, normal build, and automation-safe build; moved `YENTL-PRODUCT-BUILD-0012` to `verified_done`; refreshed product-roadmap and control-tower state to remove the stale build-verification blocker.
- Safety outcome: no automation schedules changed; no product runtime code changed; no staging, commits, pushes, deploys, dependency installs, or destructive git actions were performed.

### 2026-06-08T16:37:18-04:00

- Type: interactive wave-prep steward maintenance.
- Approval context: the immediate wave was active, the scheduled product-roadmap worker was close, and the downstream UI-system/mobile build lanes still had stale blockers because their rows were too broad or missing.
- Files:
  - `agent-work/loops/build-ledger.md`
  - `agent-work/loops/ui-system-build/STATE.md`
  - `agent-work/loops/ui-system-build/alerts.md`
  - `agent-work/loops/mobile-ui-build/STATE.md`
  - `agent-work/loops/mobile-ui-build/alerts.md`
  - `agent-work/loops/test-wave-2026-06-08.md`
  - `agent-work/loops/control-tower/STATE.md`
  - `agent-work/loops/control-tower/alerts.md`
  - `agent-work/loops/control-tower/evidence/control-tower-2026-06-08T16-37-18-0400-wave-prep-ready-rows.md`
  - `agent-work/loops/change-control.md`
- Reason: prevent the scheduled `ui-system-build` and `mobile-ui-build` passes from no-oping for stale "no eligible row" reasons by splitting the broad blocked rows into exact, verifiable `ready_for_build` rows.
- Change: added `YENTL-UI-ROADMAP-0002` for compact claim ownership/stance UI and `YENTL-MOBILE-BUILD-0002` for mobile source-picker platform/tap-target guard work; refreshed UI/mobile STATE and alerts to point scheduled workers at the new rows.
- Safety outcome: no product files were edited in this prep step; no automation schedules changed; no staging, commits, pushes, deploys, dependency installs, or destructive git actions were performed.
