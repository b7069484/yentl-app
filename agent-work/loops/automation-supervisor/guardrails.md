# Guardrails: Yentl Automation Supervisor

## Allowed Writes

This loop may create or modify:

- `agent-work/loops/automation-supervisor/STATE.md`
- `agent-work/loops/automation-supervisor/alerts.md`
- `agent-work/loops/automation-supervisor/evidence/**`

It may write `agent-work/loops/watchdog/alerts.md` only if it finds a STOP that watchdog should see on the next run.

## Allowed Reads

This loop may read:

- Yentl loop files under `agent-work/loops/**`
- Yentl automation configs under `/Users/israelbitton/.codex/automations/yentl-*/automation.toml`
- repository status and local evidence files

## Allowed Commands

- Read/search: `rg`, `find`, `sed`, `head`, `tail`, `ls`, `wc`, `stat`, `date`
- Git read-only: `git status`, `git diff --name-status`, `git diff --stat`

## Denied Actions

- Editing product code
- Editing loop contracts during a scheduled run
- Creating, updating, pausing, deleting, or otherwise mutating automations
- `git add`, `git commit`, `git push`, `git rebase`, `git reset`, `git clean`
- Deployments
- Dependency installs
- Running dev/build/test servers unless a later guardrail explicitly permits it

## Escalation

If a STOP is present, write `alerts.md` in this loop with the exact automation ID or loop path, the failed check, and the safest next action. Do not try to repair schedules from the scheduled supervisor.
