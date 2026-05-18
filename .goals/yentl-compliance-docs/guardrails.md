# Guardrails: yentl-compliance-docs

## Allowed write targets

- `docs/dpia.md` (NEW, clause 2)
- `docs/engagement-gate.md` (NEW, clause 3)
- `app/accessibility/page.tsx` (NEW, clause 1 — if not adding section to /about)
- `app/about/page.tsx` (clause 1 — ONLY if it exists and adding `## Accessibility` section; do not modify other content)
- `.goals/yentl-compliance-docs/{STATE.md, decisions.log, alerts.md}`

## Allowed tools

- Read, Glob, Grep
- Edit, Write — only allowed targets
- Bash:
  - Type/lint (only if creating /accessibility page): `npx tsc --noEmit`, `npx eslint <file>`
  - Git read: `git status`, `git diff`, `git log`, `git show`, `git branch`, `git fetch origin`
  - Git write (this branch): `git add <files>` (NEVER -A), `git commit -m "compliance: ..."`, `git rebase origin/main`, `git push origin goals/yentl-compliance-docs`
  - File: `ls`, `cat`, `head`, `tail`, `wc`, `find -maxdepth 3`
- WebFetch — for verifying GDPR Art 35, EDPB DPIA template, EAA citations, Walters v. OpenAI reference

## Denied (any = critical)

- Push to `origin/main`
- PR ops, Publish, Deploy
- Vendor portals
- Destructive ops
- Force pushes
- Hook bypasses
- Major version bumps
- New top-level dependencies
- `git add -A` / `git add .`
- Touching `app/api/deepgram/**`
- Touching `.project/` or brand assets
- Touching files outside the project root
- Modifying any /about content other than adding `## Accessibility` section (rest belongs to trust-pages sub-goal)
- Implementing engagement-gate runtime (Haiku classifier) — clause 3 is policy spec only; runtime is fact-check pipeline goal
- Modifying any other compliance sub-goal files

## Hard stops

- Cost > $20
- Runs > 10
- Days > 5
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
- Regulatory citation cannot be verified (escalate vs guess)
