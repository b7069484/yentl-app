# Guardrails: yentl-compliance-trust-pages

## Allowed write targets

- `app/about/page.tsx` (NEW, clause 1)
- `app/methodology/page.tsx` (NEW, clause 2)
- `app/changelog/page.tsx` (NEW, clause 3)
- `app/privacy/page.tsx` (NEW, clause 4)
- `app/terms/page.tsx` (NEW, clause 5)
- `app/subprocessors/page.tsx` (NEW, clause 6)
- `app/taxonomy.json/route.ts` (NEW, clause 7 — Route Handler option) OR `public/taxonomy.json` (clause 7 — static option)
- Shared layout file for these trust routes if needed (`app/(legal)/layout.tsx` — NEW, optional)
- Tests: `tests/about-page.test.tsx`, `tests/methodology-page.test.tsx`, `tests/privacy-page.test.tsx`, `tests/terms-page.test.tsx`, `tests/subprocessors-page.test.tsx`, `tests/taxonomy-route.test.ts`
- `.goals/yentl-compliance-trust-pages/{STATE.md, decisions.log, alerts.md}`

## Allowed tools

- Read, Glob, Grep — including reading sibling sub-goal files for cross-reference
- Edit, Write — only allowed targets
- Bash:
  - Tests: `npx vitest run`, `npx vitest run <file>`
  - Type/lint: `npx tsc --noEmit`, `npx eslint <file>`, `npx eslint <file> --fix`
  - Dev server (brief, polled — same pattern as a11y sub-goal): start, poll curl, run, kill
  - `curl http://localhost:3000/<route>` to verify rendering
  - Git read: `git status`, `git diff`, `git log`, `git show`, `git branch`, `git fetch origin`
  - Git write (this branch): `git add <files>` (NEVER -A), `git commit -m "compliance: ..."`, `git rebase origin/main`, `git push origin goals/yentl-compliance-trust-pages`
  - File: `ls`, `cat`, `head`, `tail`, `wc`, `find -maxdepth 4`
- WebFetch/WebSearch — for verifying GDPR articles, CCPA sections, AI Act articles, Quebec Law 25, EAA, anti-SLAPP citations

## Denied (any = critical)

- Push to `origin/main`
- PR ops
- Publish/Deploy
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
- Modifying ConsentGate, RecordingBeacon, AIGeneratedBadge, AIDisclosureFooter, VerdictCard, ReportFlow (sibling sub-goal scope)
- Modifying middleware, CI workflow, CHANGELOG.md root file (hardening-pass scope)
- Modifying `app/session/page.tsx` or `app/layout.tsx` (a11y sub-goal scope for layout; session page belongs to ai-transparency sub-goal for footer mount)

## Hard stops

- Cost > $50
- Runs > 20
- Days > 7
- Same Next planned actions 3+ runs (stall)
- Status: blocked 2+ runs
- Same clause unchecked 4+ runs
- Any denied-tool invocation
- GOAL.md modified by worker
- Sampled page fails content-quality bar at claimed-done

## Approval gates

- File outside allowed targets
- New top-level dep
- Per-run cost > $5
- Sibling sub-goal scope conflict
- Cannot write a section with confidence (flag `<!-- TODO: legal review -->` + note in alerts.md instead of guessing)
