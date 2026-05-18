# Guardrails: yentl-compliance-foundation

> This goal has a broad component-and-pages footprint. Path scope is correspondingly broader than the other goals, but specific denies still apply.

## Allowed write targets (broad — component-and-pages footprint)

The worker may create or modify:

- **Components**: anything new under `components/session/`, `components/ui/`, `components/verdict/` (new dir), `components/legal/` (new dir, optional)
- **Existing components** (only when clause names them): `components/session/SessionHeader.tsx` (clause 1), `components/session/TranscriptView.tsx` (clause 11), `components/ui/button.tsx` (clause 9 — only if default size needs override)
- **Routes**: anything new under `app/about/`, `app/methodology/`, `app/changelog/`, `app/privacy/`, `app/terms/`, `app/subprocessors/`, `app/accessibility/` (clauses 13-18, 22), `app/taxonomy.json/` (clause 19 — alternative is `public/taxonomy.json`)
- **Layout**: `app/layout.tsx` (clauses 7, 12)
- **CSS**: `app/globals.css` (clause 8 — only the `--ring` token area and related a11y tokens)
- **Static**: `public/taxonomy.json` (clause 19 alternative)
- **Docs**: `docs/dpia.md` (clause 23), `docs/engagement-gate.md` (clause 24), `docs/` subdirs as needed
- **Tests**: anything new under `tests/` matching component/page names
- **Scripts**: `scripts/run-a11y-audit.sh` (clause 12)
- **Config (limited)**:
  - `package.json` — ONLY to add devDependencies pre-approved below
  - `vitest.config.ts` — ONLY if new test helpers require it
  - `.github/workflows/ci.yml` — extend with a11y step (clause 12)
- **CHANGELOG.md** (clause 26) — append entry; do NOT delete existing entries
- **README.md** (clause 27) — append "Compliance & Trust" section; do NOT delete existing content
- **Goal artifacts**: `.goals/yentl-compliance-foundation/{STATE.md, decisions.log, alerts.md}`

## Allowed tools (unsupervised)

- `Read`, `Glob`, `Grep` — read anything project-wide
- `Edit`, `Write` — only on allowed write targets above
- `Bash` for:
  - **Tests**: `npx vitest run`, `npx vitest run <file>`, `npx vitest run --coverage`
  - **Type/lint**: `npx tsc --noEmit`, `npx eslint .`, `npx eslint <file> --fix`
  - **Audit**: `npm audit --omit=dev --audit-level=high`
  - **a11y (clause 12)**:
    - `npx @axe-core/cli http://localhost:3000`, `npx @axe-core/cli http://localhost:3000/<route>`
    - `npx lighthouse http://localhost:3000 --only-categories=accessibility --quiet --chrome-flags="--headless"`
  - **Dev server (brief verification only — kill within same command)**:
    - `(npm run dev & sleep 8 && curl -sS http://localhost:3000/<route> && kill %1) 2>&1`
    - Do NOT leave `npm run dev` running in background
  - **Dependency installs (pre-approved devDependencies for this goal)**:
    - `npm install --save-dev @axe-core/cli`
    - `npm install --save-dev lighthouse` (optional, can use `npx` instead)
    - `npm install --save sonner` (for SessionTimer toast; choose this or another lightweight toast lib and stay consistent)
    - Any other install requires an approval gate.
  - **Git (read-only)**: `git status`, `git diff`, `git log`, `git show`, `git branch`, `git fetch origin`, `git merge-base`
  - **Git (write — this goal only)**: `git add <specific-files>` (NEVER `git add -A`/`git add .`), `git commit -m "compliance: <message>"`, `git rebase origin/main`, `git push origin <current-branch>` (NEVER main)
  - **File inspection**: `ls`, `cat <small file>`, `head`, `tail`, `wc`, `find -maxdepth 4`
  - **Search**: `grep`, `grep -rE`
- `WebFetch`, `WebSearch` — for: GDPR text, AI Act articles, WCAG references, Apple/Play guidelines, EDPB DPIA template, research file lookups. Not for code execution.

## Denied tools (any invocation = critical issue)

- **Push to `origin/main`** in any form
- **PR ops**: `gh pr create`, `gh pr merge`, `gh pr close`, `gh pr ready`
- **Publish**: `npm publish` etc.
- **Deploy**: `vercel deploy`, `vercel --prod`, anything ending in `deploy`
- **Messaging**: any Slack/email/Discord CLI
- **Vendor-portal interactions**: do not log in to Deepgram, Anthropic, Vercel dashboards; do not use curl/wget against vendor portal URLs
- **Destructive ops**: `rm -rf`, `git reset --hard`, `git checkout .`, `git clean -fd`, `git branch -D`
- **Force pushes**: `git push --force`, `git push -f`
- **Hook bypasses**: `--no-verify`, `--no-gpg-sign`, `--no-pre-commit`
- **Major version bumps**: Next.js, React, AI SDK, Vitest, Tailwind, ESLint, TypeScript major versions
- **Non-test top-level deps** other than those explicitly pre-approved above
- **Bulk dep ops**: `npm update`, `npm audit fix --force`, `npm-check-updates`
- **`git add -A`**, **`git add .`** — explicit filenames only
- **Modifying `app/api/deepgram/**`** beyond reading
- **Modifying `.project/`**, `public/logos/`, brand assets
- **Modifying files outside `/Users/israelbitton/Live FactCheck/`**
- **`curl`/`wget` piped to a shell**
- **Long-running processes** beyond the brief dev-server verifications described above
- **Rebrand operations** (renaming `factify-scaffold` → `yentl` anywhere)
- **Fact-check pipeline work** (creating `app/api/extract-claims/`, `app/api/verify-*`, etc.) — that's a separate goal
- **Engagement-gate runtime** (creating a Haiku-based classifier in code) — clause 24 documents the policy only

## Hard-stop conditions (watchdog enforces — any triggers `STOP`)

- `Total cost (approx, USD)` > $150
- `Runs completed` > 50
- Days since first run > 14
- Same `Next planned actions` in 3+ consecutive runs
- `Status: blocked` for 3+ consecutive runs
- Any single group has 0 clauses-progressed for 4+ runs (group stall)
- Any denied-tool invocation attempted
- GOAL.md modified after Locked date by worker
- Sampled clause verification fails at claimed completion

## Approval gates (worker stops, writes to alerts.md, exits without acting)

- Modify a file not in the "Allowed write targets" list (broad as it is)
- Change any clause of the end condition
- Skip a clause (cannot satisfy, asks operator to defer or remove)
- Install a non-pre-approved dependency
- Interact with any vendor portal
- Touch `app/api/deepgram/**`
- Touch fact-check pipeline files (`app/api/extract-claims/**`, `app/api/verify-*/**`)
- Implement engagement-gate runtime (vs documenting it in clause 24)
- Bump a major framework version
- Spend more than $5.00 in a single run
- Modify any file in brand asset paths
- Modify CHANGELOG.md entries that the worker did not create
- Modify any existing trust-page content the operator added between runs (treat operator edits as authoritative)

## Sanity

- Public-facing legal copy is high-stakes. When uncertain, write `<!-- TODO: legal review -->` and flag in alerts.md rather than ship slop.
- The 28 clauses don't have to be done in order — pick the highest-value, lowest-dependency clause each run. Group B first is a recommendation, not a requirement.
- 14 days. $150. 28 clauses. Patience and discipline beat heroics.
