# Guardrails: yentl-compliance-a11y

## Allowed write targets

- `components/ui/skip-to-content.tsx` (NEW, clause 1)
- `app/layout.tsx` (clauses 1, 5)
- `app/globals.css` (clause 2 — focus ring tokens only)
- `components/ui/button.tsx` (clause 3 — only if default size needs override)
- `components/session/TranscriptView.tsx` (clause 5 — aria-live attribute)
- `components/session/claims-live-region.tsx` (NEW, clause 5)
- `components/session/recording-beacon.tsx` (clause 4 — ONLY to add motion-reduce variants; do NOT change other behavior)
- Any other animated component (only `motion-reduce:` additions; if existing logic, leave intact)
- `scripts/run-a11y-audit.sh` (NEW, clause 6)
- `package.json` (clause 6 — add `@axe-core/cli` only)
- `.github/workflows/ci.yml` (clause 6 — extend with a11y step OR create minimal stub)
- Tests: `tests/skip-to-content.test.tsx`, `tests/focus-ring.test.ts`, `tests/touch-targets.test.tsx`, `tests/reduced-motion.test.tsx`, `tests/aria-live.test.tsx`
- `.goals/yentl-compliance-a11y/{STATE.md, decisions.log, alerts.md}`

## Allowed tools

- Read, Glob, Grep
- Edit, Write — only allowed targets
- Bash:
  - Tests: `npx vitest run`, `npx vitest run <file>`
  - Type/lint: `npx tsc --noEmit`, `npx eslint <file>`, `npx eslint <file> --fix`
  - **Pre-approved installs**: `npm install --save-dev @axe-core/cli`
  - a11y audits: `npx @axe-core/cli http://localhost:3000`, `npx @axe-core/cli http://localhost:3000/<route>`, `npx lighthouse <url> --only-categories=accessibility --quiet --chrome-flags="--headless"`
  - Dev server (brief, polled): `(npm run dev > /tmp/dev.log 2>&1 &)` then poll with curl, then `kill $(lsof -ti:3000) 2>/dev/null || true`
  - Git read: `git status`, `git diff`, `git log`, `git show`, `git branch`, `git fetch origin`
  - Git write (this branch): `git add <files>` (NEVER -A), `git commit -m "compliance: ..."`, `git rebase origin/main`, `git push origin goals/yentl-compliance-a11y`
  - File: `ls`, `cat`, `head`, `tail`, `wc`, `find -maxdepth 4`
- WebFetch/WebSearch — WCAG docs, axe-core docs, Tailwind theme docs

## Denied (any = critical)

- Push to `origin/main`
- PR ops
- Publish/Deploy
- Vendor portals
- Destructive ops (`rm -rf`, `git reset --hard`, etc.)
- Force pushes
- Hook bypasses
- Major version bumps
- New deps other than `@axe-core/cli` and `lighthouse` (lighthouse can be `npx`)
- `git add -A` / `git add .`
- Touching `app/api/deepgram/**`
- Touching `.project/` or brand assets
- Touching files outside the project root
- Modifying VerdictCard, ReportFlow, AIGeneratedBadge, AIDisclosureFooter (sibling sub-goal scope)
- Modifying trust pages (sibling sub-goal)

## Hard stops

- Cost > $40
- Runs > 20
- Days > 7
- Same Next planned actions 3+ runs (stall)
- Status: blocked 2+ runs
- Same clause unchecked 4+ runs
- Any denied-tool invocation
- GOAL.md modified by worker

## Approval gates

- File outside allowed targets
- New top-level dep beyond pre-approved
- Per-run cost > $5
- Sibling sub-goal scope conflict
- Lighthouse a11y can't reach 95 after 4+ iteration runs (escalate — may need design decision)
