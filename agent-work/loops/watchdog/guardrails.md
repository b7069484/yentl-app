# Guardrails: Yentl Loop Watchdog

## Allowed Writes

This loop may create or modify:

- `agent-work/loops/watchdog/STATE.md`
- `agent-work/loops/watchdog/alerts.md`
- `agent-work/loops/watchdog/evidence/**`
- `agent-work/loops/*/alerts.md` only when writing a STOP or warning from a watchdog audit
- `agent-work/loops/issue-ledger.md` only when marking stale rows escalated or adding watchdog notes
- `agent-work/loops/build-ledger.md` only when marking stale rows escalated or adding watchdog notes

## Denied Actions

- Editing product code
- Editing loop goals or worker prompts during an audit
- Running build/dev servers unless needed to verify a loop's claim
- `git add`, `git commit`, `git push`, `git rebase`, `git reset`, `git clean`
- Installing dependencies
- Deployments

## Stop Conditions

Write a STOP warning if any active loop:

- edits outside allowed scope
- attempts destructive git commands
- repeatedly reports the same next action without progress
- marks a goal complete without evidence
- makes unsupported claims about launch, mobile app support, or speaker attribution
