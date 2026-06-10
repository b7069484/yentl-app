# Guardrails: Yentl UI And Mobile Fix Round

## Allowed Writes

This loop may always write:

- `agent-work/loops/ui-mobile-fix/STATE.md`
- `agent-work/loops/ui-mobile-fix/alerts.md`
- `agent-work/loops/ui-mobile-fix/evidence/**`
- `agent-work/loops/issue-ledger.md`

This loop may edit product files only when all are true:

- A single selected issue in `issue-ledger.md` is marked `ready_for_fix`.
- The selected issue's area is UI, mobile layout, platform-truth copy, route chrome, source-picker UX, or session presentation.
- The files are under `app/`, `components/`, or `lib/client/`.
- No more than three product files are changed.

## Allowed Commands

- Read/search: `rg`, `find`, `sed`, `head`, `tail`, `ls`, `wc`
- Verification: `npm run build`, `npx tsc --noEmit`, `npm run test:run`, targeted `npx vitest run ...`
- Git read-only: `git status`, `git diff`, `git diff --stat`, `git log --oneline -5`

## Denied Actions

- `git add`, `git commit`, `git push`, `git rebase`, `git reset`, `git clean`
- Deployments
- Dependency installs
- API/security/auth/billing/consent/diarization changes
- Legal document or legal route edits
- More than one issue per run
- Product edits when the worktree has merge conflicts
- Fixing an issue not listed as `ready_for_fix`

## Stop Conditions

Write `alerts.md` and stop if:

- no issue is `ready_for_fix`
- the issue is too broad for a single run
- verification cannot be made meaningful
- the same issue has reopened twice
- required files appear to have unrelated user edits that make a safe patch impossible
