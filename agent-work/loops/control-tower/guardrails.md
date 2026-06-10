# Guardrails: Yentl Control Tower

## Allowed Writes

This loop may only create or modify:

- `agent-work/loops/control-tower/STATE.md`
- `agent-work/loops/control-tower/alerts.md`
- `agent-work/loops/control-tower/evidence/**`
- `agent-work/loops/build-ledger.md`
- `agent-work/loops/issue-ledger.md` only when adding control-tower notes or escalating stale rows

## Allowed Commands

- Read-only repo inspection: `git status`, `git diff --stat`, `git log --oneline`, `git branch`, `git fetch --dry-run`
- File reads/search: `rg`, `find`, `sed`, `head`, `tail`, `wc`, `ls`
- Verification commands that do not write product files, such as `npm run test:run`, `npx tsc --noEmit`, `npm run build`

If a verification command writes cache/build artifacts, record that fact in the report and do not stage or clean them.

## Denied Actions

- Editing product code or docs outside this loop folder and the two shared ledgers
- `git add`, `git commit`, `git push`, `git rebase`, `git reset`, `git clean`
- Running deployment commands
- Installing dependencies
- Changing automation schedules
- Marking launch readiness without evidence

## Stop Conditions

Write `alerts.md` and stop if:

- the checkout has unmerged conflicts
- a required source-of-truth plan is missing
- a verification command shows a launch-critical failure that cannot be summarized safely
- the same blocker appears in three consecutive runs
