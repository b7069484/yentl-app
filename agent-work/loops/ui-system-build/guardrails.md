# Guardrails: Yentl UI System Build

## Allowed Writes

This loop may always write:

- `agent-work/loops/ui-system-build/STATE.md`
- `agent-work/loops/ui-system-build/alerts.md`
- `agent-work/loops/ui-system-build/evidence/**`
- `agent-work/loops/build-ledger.md`

This loop may edit product files only when all are true:

- one selected `build-ledger.md` row is marked `ready_for_build`
- the row's lane is `ui-system-build`
- the change touches no more than three product files
- the files are in `components/ui/**`, `components/session/**`, `app/**/page.tsx`, or `lib/client/**`

## Allowed Commands

- Read/search: `rg`, `find`, `sed`, `head`, `tail`, `ls`, `wc`
- Verification: targeted `npx vitest run ...`, `npx tsc --noEmit`, `npm run build`
- Git read-only: `git status`, `git diff`, `git diff --stat`, `git log --oneline -5`

## Denied Actions

- `git add`, `git commit`, `git push`, `git rebase`, `git reset`, `git clean`
- Deployments
- Dependency installs
- API/security/auth/billing/consent/diarization changes
- Legal document or legal route claim edits
- More than one build slice per run

## Stop Conditions

Write `alerts.md` and stop if:

- no eligible build-ledger row exists
- the selected row is too broad
- verification is unclear
- unrelated user edits make a safe patch impossible
