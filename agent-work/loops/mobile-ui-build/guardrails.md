# Guardrails: Yentl Mobile UI Build

## Allowed Writes

This loop may always write:

- `agent-work/loops/mobile-ui-build/STATE.md`
- `agent-work/loops/mobile-ui-build/alerts.md`
- `agent-work/loops/mobile-ui-build/evidence/**`
- `agent-work/loops/build-ledger.md`

This loop may edit product files only when all are true:

- one selected `build-ledger.md` row is marked `ready_for_build`
- the row's lane is `mobile-ui-build`
- the change touches no more than three product files
- the files are in `components/session/**`, `components/ui/**`, `app/**/page.tsx`, or `lib/client/**`

## Allowed Commands

- Read/search: `rg`, `find`, `sed`, `head`, `tail`, `ls`, `wc`
- Verification: targeted `npx vitest run ...`, `npx tsc --noEmit`, `npm run build`
- Git read-only: `git status`, `git diff`, `git diff --stat`, `git log --oneline -5`

## Denied Actions

- `git add`, `git commit`, `git push`, `git rebase`, `git reset`, `git clean`
- Deployments
- Dependency installs
- API/security/auth/billing/consent/diarization changes
- Native mobile app implementation or claims
- Legal document or legal route claim edits
- More than one mobile slice per run

## Stop Conditions

Write `alerts.md` and stop if:

- no eligible build-ledger row exists
- the selected row is too broad
- mobile verification is unclear
- unrelated user edits make a safe patch impossible
