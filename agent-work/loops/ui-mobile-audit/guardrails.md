# Guardrails: Yentl UI And Mobile Audit

## Allowed Writes

During the pilot, this loop may only create or modify:

- `agent-work/loops/ui-mobile-audit/STATE.md`
- `agent-work/loops/ui-mobile-audit/alerts.md`
- `agent-work/loops/ui-mobile-audit/evidence/**`
- `agent-work/loops/issue-ledger.md`

## Allowed Reads

This loop may read any file in the repo.

## Allowed Commands

- Read-only repo inspection: `git status`, `git diff --stat`
- File reads/search: `rg`, `find`, `sed`, `head`, `tail`, `wc`, `ls`
- Verification commands: `npm run build`, `npx tsc --noEmit`, `npm run test:run`
- Local preview only if the run can start and stop it within the same turn

## Denied Actions

- Editing product code during the pilot
- Overwriting shared screenshot evidence under `public/` or `docs/superpowers/validation/screenshots`
- Running `scripts/visual-evidence/capture-launch-screenshots.ts` unless the command is configured to avoid overwriting shared screenshot evidence, or a human-reviewed task first changes it to write into this loop's `evidence/` folder
- `git add`, `git commit`, `git push`, `git rebase`, `git reset`, `git clean`
- Installing dependencies
- Deployment commands
- Claiming mobile app/iOS/Android support from mobile-web checks alone

## Stop Conditions

Write `alerts.md` and stop if:

- routes cannot build or render at all
- public copy appears to make a risky unsupported claim
- the same issue appears in three consecutive audits without a decision
- a route requires secrets/auth that the loop cannot access
