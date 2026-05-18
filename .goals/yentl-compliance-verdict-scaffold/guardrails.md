# Guardrails: yentl-compliance-verdict-scaffold

## Allowed write targets

- `components/verdict/report-verdict-button.tsx` (NEW)
- `components/verdict/report-flow.tsx` (NEW)
- `components/verdict/verdict-card.tsx` (NEW)
- `components/verdict/index.ts` (barrel export, optional)
- `tests/report-flow.test.tsx` (NEW)
- `tests/verdict-card.test.tsx` (NEW)
- `.goals/yentl-compliance-verdict-scaffold/{STATE.md, decisions.log, alerts.md}`

## Allowed tools

- Read, Glob, Grep
- Edit, Write — only allowed targets
- Bash:
  - Tests: `npx vitest run`, `npx vitest run <file>`
  - Type/lint: `npx tsc --noEmit`, `npx eslint <file>`, `npx eslint <file> --fix`
  - Git read: `git status`, `git diff`, `git log`, `git show`, `git branch`, `git fetch origin`
  - Git write (this branch): `git add <files>` (NEVER -A), `git commit -m "compliance: ..."`, `git rebase origin/main`, `git push origin goals/yentl-compliance-verdict-scaffold`
  - File: `ls`, `cat`, `head`, `tail`, `wc`, `find -maxdepth 3`
- WebFetch/WebSearch — docs

## Denied (any = critical)

- Push to `origin/main`
- PR ops, Publish, Deploy
- Vendor portals
- Destructive ops
- Force pushes
- Hook bypasses
- Major version bumps
- New top-level deps (ulid, zod, lucide-react, @testing-library/react all pre-installed)
- `git add -A` / `git add .`
- Touching `app/api/deepgram/**`
- Touching `.project/` or brand assets
- Touching files outside the project root
- Wiring verdict-card to real data flows (fact-check pipeline scope)
- Modifying trust pages, consent components, a11y components, AI transparency components, docs (sibling sub-goal scope)

## Hard stops

- Cost > $15, Runs > 8, Days > 3
- Same Next planned actions 3+ runs
- Status: blocked 2+ runs
- Same clause unchecked 4+ runs
- Denied-tool invocation
- GOAL.md modified by worker

## Approval gates

- File outside allowed targets
- New top-level dep
- Per-run cost > $3
- Sibling scope conflict
