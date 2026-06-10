# Guardrails: Yentl Product Roadmap Build

## Allowed Writes

This loop may always write:

- `agent-work/loops/product-roadmap-build/STATE.md`
- `agent-work/loops/product-roadmap-build/alerts.md`
- `agent-work/loops/product-roadmap-build/evidence/**`
- `agent-work/loops/build-ledger.md`

This loop may edit product files only when all are true:

- one selected `build-ledger.md` row is marked `ready_for_build`
- the row's lane is `product-roadmap-build`
- the row names allowed scope and verification
- the change touches no more than four product files unless the row explicitly narrows otherwise

## Allowed Commands

- Read/search: `rg`, `find`, `sed`, `head`, `tail`, `ls`, `wc`
- Verification: targeted `npx vitest run ...`, `npx tsc --noEmit`, `npm run build`, `npm run test:run`
- Git read-only: `git status`, `git diff`, `git diff --stat`, `git log --oneline -5`

## Denied Actions

- `git add`, `git commit`, `git push`, `git rebase`, `git reset`, `git clean`
- Deployments
- Dependency installs without explicit ledger approval
- production diarization/capture/consent behavior changes
- auth, billing, persistence, or legal route claim changes
- more than one roadmap slice per run

## Stop Conditions

Write `alerts.md` and stop if:

- no eligible build-ledger row exists
- the selected row is too broad
- source plan and verification do not agree
- unrelated user edits make a safe patch impossible
