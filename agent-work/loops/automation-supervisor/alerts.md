# Alerts: Yentl Automation Supervisor

Last updated: 2026-06-09T06:17:53-04:00

## 2026-06-09T06:17:53-04:00

- Severity: WARN/no STOP.
- Affected automations: permanent Yentl overnight ladder.
- Reason: corrected overnight due-run evidence now exists through control-tower, Tuesday mobile build no-op, UI/mobile audit, UI/mobile fix no-op, watchdog, and automation-supervisor. All eight permanent configs pass static checks for active status, `gpt-5.5`, local execution, cwd, and UTC-offset overnight schedules.
- Evidence: `agent-work/loops/automation-supervisor/evidence/2026-06-09T06-17-53-0400-automation-supervisor.md`; `agent-work/loops/watchdog/evidence/2026-06-09T05-30-31-0400-watchdog.md`.
- Required action: next ladder may proceed in guarded mode. Refresh `ui-mobile-audit/STATE.md` and `ui-mobile-audit/alerts.md` from current ledger truth; keep `YENTL-TRUTH-0001` legal/privacy-gated and hard-window rows `YENTL-PRODUCT-BUILD-0021`, `0023`, and `0026` context-gated.
- Safety note: do not treat the large dirty worktree or temporary count-limited one-run configs as approval to widen unattended build/fix work. Build/fix lanes should no-op unless exact ready rows exist.

## 2026-06-08T22:36:24-04:00

- Severity: WARN/no STOP.
- Affected automations: permanent Yentl overnight ladder plus temporary 2026-06-08 immediate wave.
- Reason: immediate-wave evidence is now fresh through watchdog and supervisor, and all eight permanent Yentl automation configs pass static checks for active status, `gpt-5.5`, local execution, cwd, and UTC-offset overnight schedules. The remaining risk is proving one real corrected overnight cycle at the intended America/New_York slots.
- Evidence: `agent-work/loops/automation-supervisor/evidence/2026-06-08T22-36-24-0400-automation-supervisor.md`; `agent-work/loops/watchdog/evidence/2026-06-08T21-51-10-0400-watchdog.md`.
- Required action: let the corrected overnight ladder run in guarded mode, then verify fresh evidence appears from 12:47 AM through 6:17 AM America/New_York.
- Safety note: if the corrected overnight cycle misses evidence again, pause unattended product-editing loops and inspect automation runner/session history before more build or fix work.

## 2026-06-08T14:46:30-04:00

- Severity: WARN
- Affected automations: all Yentl automations.
- Reason: manual product-flow proof completed through product-roadmap build, watchdog, and supervisor. All eight Yentl automation configs pass static checks and map to the intended America/New_York off-hours ladder after the UTC-storage correction. The remaining risk is proving one real corrected overnight cycle.
- Evidence: `agent-work/loops/product-roadmap-build/evidence/2026-06-08T14-42-36-0400-yentl-product-build-0009.md`; `agent-work/loops/watchdog/evidence/2026-06-08T14-44-49-0400-watchdog.md`; `agent-work/loops/automation-supervisor/evidence/2026-06-08T14-46-30-0400-automation-supervisor.md`.
- Required action: let the corrected overnight ladder run, then verify evidence appears at the intended local slots from 12:47 AM through 6:17 AM America/New_York.
- Safety note: if the next corrected run misses evidence again, pause product-editing loops and inspect the app runner/session history before continuing unattended work.

## 2026-06-08T12:04:10-04:00

- Severity: WARN
- Affected automations: all Yentl automations.
- Reason: the manual whole-flow proof completed through supervisor, all eight Yentl automation configs pass static checks, and watchdog is WARN/no STOP. The remaining risk is not workflow logic; it is proving the corrected UTC-offset schedules during one real overnight cycle.
- Evidence: `agent-work/loops/automation-supervisor/evidence/2026-06-08T12-04-10-0400-automation-supervisor.md`; `agent-work/loops/watchdog/evidence/2026-06-08T12-02-16-0400-watchdog.md`; `agent-work/loops/change-control.md`.
- Required action: allow the next corrected overnight ladder to run in guarded mode, then verify evidence appears at the intended local slots from 12:47 AM through 6:17 AM America/New_York.
- Safety note: if the next corrected run misses evidence again, pause product-editing loops and inspect the app runner/session history before continuing unattended work.

## 2026-06-08T10:52:13-04:00

- Severity: WARN
- Affected automations: all Yentl automations.
- Reason: the earlier missing-evidence STOP was resolved by catch-up reports, and the underlying schedule-hour drift was corrected through the Codex app automation API. Session evidence showed stored hours executing as UTC, so persisted schedules were offset to land at the intended America/New_York overnight slots during EDT.
- Evidence: `agent-work/loops/automation-supervisor/evidence/2026-06-08T10-52-13-0400-automation-supervisor.md`; `agent-work/loops/change-control.md`.
- Required action: allow the next corrected overnight ladder to run in guarded mode, then check that the 12:47 AM control-tower report and downstream evidence appear at the intended local times.
- Safety note: if the next corrected run misses evidence again, pause product-editing loops and inspect the app runner/session history before continuing unattended work.

## 2026-06-08T02:21:01-04:00

- Severity: STOP
- Affected automations: `yentl-control-tower`, `yentl-ui-system-build`
- Reason: both automation configs pass, but no fresh evidence exists for the due 2026-06-08 00:47 `control-tower` run or the due Monday 2026-06-08 01:47 `ui-system-build` run.
- Evidence: `agent-work/loops/automation-supervisor/evidence/2026-06-08T02-21-01-0400-automation-supervisor.md`
- Required action: inspect the automation runner/execution history for missed runs, then create a fresh proving pass before trusting the next unattended ladder.
- Safety note: do not mutate schedules from the scheduled supervisor path.
