# Goal: Yentl Automation Supervisor

Status: pilot
Owner: Israel B. Bitton
Created: 2026-06-07

## Objective

Verify that the Yentl automation ladder itself is configured, scheduled, and leaving durable evidence. This is a postflight supervisor for cron health, not a product build, audit, or fix loop.

## Schedule

Target slot: daily 6:17 AM America/New_York, after the 5:27 AM watchdog and away from the known Hamodia 6:00, 6:35, and 6:55 AM jobs.

Runtime note: 2026-06-08 session evidence showed the app's stored cron hour executing as UTC, so the persisted automation configs are offset to produce the Eastern target slots during EDT. Treat the table below as the human-facing America/New_York schedule; raw stored hour values may differ when they are documented in `agent-work/loops/change-control.md`.

## Checks

- Every expected Yentl automation exists and is `ACTIVE`.
- Every Yentl automation uses the supported model currently proven by canary runs: `gpt-5.5`.
- Every Yentl automation points at `/Users/israelbitton/Live FactCheck`.
- Every Yentl automation has the expected off-hours effective schedule, accounting for the 2026-06-08 UTC-storage correction recorded in `change-control.md`.
- The previous ladder stages left current `STATE.md` and `evidence/` artifacts, or clearly recorded why they no-oped.
- Watchdog status is not STOP.
- The current `issue-ledger.md`, `build-ledger.md`, and `change-control.md` are authoritative over stale handoff notes.
- No product-code, git, deploy, dependency, or schedule mutation occurred during this supervisor run.

## Expected Automations

| Automation ID | Expected Schedule | Role |
|---|---|---|
| `yentl-control-tower` | daily 12:47 AM | preflight/control |
| `yentl-ui-system-build` | Mon/Wed/Fri 1:47 AM | UI build lane |
| `yentl-mobile-ui-build` | Tue/Thu/Sat 1:47 AM | mobile build lane |
| `yentl-product-roadmap-build` | Sun 1:47 AM | product build lane |
| `yentl-ui-mobile-audit` | daily 2:57 AM | audit |
| `yentl-ui-mobile-fix-round` | daily 4:07 AM | bounded fix |
| `yentl-loop-watchdog` | daily 5:27 AM | loop watchdog |
| `yentl-automation-supervisor` | daily 6:17 AM | cron/evidence supervisor |

## End Condition Per Run

- `STATE.md` is updated.
- A timestamped supervisor report exists in `evidence/`.
- Each expected automation is marked PASS, WARN, or STOP.
- Any STOP is written to `alerts.md`.
- The report names the exact missing/stale schedule, model, state, or evidence issue.

## Stop Conditions

Write STOP if:

- An expected Yentl automation is missing, paused, or on an unsupported model.
- A schedule's effective local run time moved outside the 12:00 AM-7:00 AM window or conflicts with the known ladder without a change-control entry.
- Watchdog is STOP or stale after a run window.
- Evidence for an expected run is missing with no no-op/blocker report.
- The supervisor detects product-code edits, git staging/commit/push/reset/clean, deploy, dependency install, or automation mutation during its own run.
