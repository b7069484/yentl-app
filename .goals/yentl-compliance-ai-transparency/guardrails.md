# Guardrails: yentl-compliance-ai-transparency

## Allowed write targets

The worker may create/modify ONLY:

- `components/ui/ai-generated-badge.tsx` (NEW, clause 1)
- `components/ui/index.ts` (only if barrel exports exist there)
- `components/session/ai-disclosure-footer.tsx` (NEW, clause 2)
- `app/session/page.tsx` (mount AIDisclosureFooter, clause 2)
- `tests/ai-generated-badge.test.tsx` (NEW)
- `tests/ai-disclosure-footer.test.tsx` (NEW)
- `.goals/yentl-compliance-ai-transparency/{STATE.md, decisions.log, alerts.md}`

**Anything outside this list = approval gate**: write a note in alerts.md and exit.

## Allowed tools (unsupervised)

- Read, Glob, Grep — project-wide
- Edit, Write — only on allowed write targets
- Bash for:
  - Tests: `npx vitest run`, `npx vitest run <file>`
  - Type/lint: `npx tsc --noEmit`, `npx eslint <file>`, `npx eslint <file> --fix`
  - Git read: `git status`, `git diff`, `git log`, `git show`, `git branch`, `git fetch origin`, `git merge-base`
  - Git write (this branch only): `git add <files>` (NEVER -A), `git commit -m "compliance: ..."`, `git rebase origin/main`, `git push origin goals/yentl-compliance-ai-transparency`
  - File inspection: `ls`, `cat`, `head`, `tail`, `wc`, `find -maxdepth 3`
- WebFetch/WebSearch — docs only

## Denied tools (any = critical)

- Push to `origin/main`
- PR ops (`gh pr ...`)
- Publish/Deploy commands
- Vendor portal interactions
- Destructive ops (`rm -rf`, `git reset --hard`, `git clean -fd`)
- Force pushes
- Hook bypasses (`--no-verify`)
- Major version bumps
- New top-level dependencies (lucide-react + testing-library are pre-installed; use them)
- `git add -A` / `git add .`
- Touching `app/api/deepgram/**`
- Touching `.project/` or brand assets
- Modifying files outside `/Users/israelbitton/Live FactCheck/`

## Hard-stop conditions

- Total cost > $15
- Runs > 8
- Days > 3
- Same Next planned actions 3+ runs (stall)
- Status: blocked 2+ runs
- Same clause unchecked 4+ runs
- Any denied-tool invocation
- GOAL.md modified after Locked date by worker

## Approval gates

If worker needs any of these: write to alerts.md, exit.
- File outside allowed write targets
- New top-level dep
- Per-run cost > $3
- Anything that touches sibling sub-goal scope
