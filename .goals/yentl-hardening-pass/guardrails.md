# Guardrails: yentl-hardening-pass

> The worker reads this every run. The watchdog uses it to decide when to stop the routine. Edit thoughtfully — these rules are what keep the autonomous loop safe.

## Allowed tools (unsupervised)

The worker may use these without confirmation:

- `Read`, `Write`, `Edit`, `Glob`, `Grep`
- `Bash` for the following commands ONLY:
  - **Tests/build**: `npm test`, `npm run test:run`, `npx vitest run`, `npx vitest run --coverage`, `npm run build`, `npm run dev` (but NOT left running — kill within same command)
  - **Type/lint**: `npx tsc --noEmit`, `npx eslint .`, `npx eslint . --max-warnings=0`, `npx eslint . --fix`
  - **Audit**: `npm audit`, `npm audit --omit=dev --audit-level=high`
  - **Dependency installs (scoped)**: `npm install --save-dev @vitest/coverage-v8` is explicitly allowed. Any other `npm install <pkg>` requires that the package directly satisfies a clause (e.g., a rate-limit lib for clause 9) and the install is logged in `decisions.log` with a one-line reason.
  - **Git (read-only)**: `git status`, `git status --porcelain`, `git diff`, `git diff --cached`, `git log`, `git log -p <file>`, `git show`, `git branch`, `git branch --show-current`, `git rev-parse`, `git merge-base`, `git fetch origin`
  - **Git (write — this goal only)**: `git add`, `git add -A`, `git commit -m "<msg>"`, `git rebase origin/main`, `git push origin <current-branch>` (where `<current-branch>` is NOT `main` or `master`)
  - **File inspection**: `ls`, `ls -la`, `cat`, `head`, `tail`, `wc`, `find` (with `-maxdepth` bounded to 5)
  - **Search**: `grep`, `grep -rE`, `grep -rhoE`
- `WebFetch` — only for docs/reference lookup (Next.js docs, Vitest docs, GitHub Actions docs). Not for fetching code to execute.
- `WebSearch` — same constraint as WebFetch.

## Denied tools (hard stop — any invocation = critical issue)

- **Push to `origin/main`** in any form (`git push origin main`, `git push origin HEAD:main`, etc.)
- **PR operations**: `gh pr create`, `gh pr merge`, `gh pr close`, `gh pr ready`
- **Publish**: `npm publish`, `pnpm publish`, `yarn publish`
- **Deploy**: `vercel deploy`, `vercel --prod`, `gcloud deploy`, `aws deploy`, `kubectl apply`, `flyctl deploy`
- **Messaging**: any Slack, email, Discord, Telegram CLI
- **Paid service signups or API calls beyond model inference** (no Stripe live mode, no paid social APIs, no domain purchases, no new accounts)
- **Destructive file/git ops**: `rm -rf`, `git reset --hard`, `git checkout .`, `git clean -fd`, `git branch -D`
- **Force pushes**: `git push --force`, `git push -f`
- **Hook bypasses**: any flag like `--no-verify`, `--no-gpg-sign`, `--no-pre-commit`
- **Major version bumps**: `npm install <pkg>@latest` for Next.js, React, AI SDK, Vitest, Tailwind, ESLint, TypeScript major versions
- **Bulk dependency operations**: `npm update`, `npm audit fix --force`, `npm-check-updates -u`
- **Modifying `~/.claude/`** or anything under `~/.config/` or `/etc/`
- **Modifying files outside `/Users/israelbitton/Live FactCheck/`** (worktrees under it are fine)
- **Touching `.project/`, `public/logos/`, brand assets** of any kind
- **Touching `app/api/deepgram/**`** beyond adding a single import for security middleware
- **`curl`/`wget` piped to a shell** (`| sh`, `| bash`, `| python`)
- **Long-running processes**: do not leave `npm run dev` or any server running between commands

## Hard-stop conditions (watchdog enforces — any triggers `STOP` to alerts.md)

- `Total cost (approx, USD)` in `STATE.md` exceeds **$50.00**
- `Runs completed` exceeds **24**
- Days since first run exceeds **7**
- Same `Next planned actions` appears in **3+** consecutive runs (stall)
- `Status: blocked` persists for **2+** consecutive runs
- Same clause unchecked after **4+** runs of attempted work on it
- Any denied-tool invocation was attempted (single occurrence is enough)
- `GOAL.md` was modified after `Locked: 2026-05-17` by a worker commit (goal-creep)
- A sampled clause verification by the watchdog at completion fails (worker prematurely claimed done)

## Approval gates (worker stops, writes to `alerts.md`, exits without acting)

If the worker believes it needs to do any of the following, it must STOP, write the request to `alerts.md` with a clear question, and exit without acting:

- Modify any file outside `/Users/israelbitton/Live FactCheck/`
- Change ANY clause of the end condition in `GOAL.md`
- Skip a success criterion (cannot satisfy it but believes the goal should still be "done")
- Install a new top-level dependency not tied to a specific clause
- Need to touch `app/api/deepgram/**` beyond importing middleware
- Need to bump a major framework version (Next.js, React, AI SDK, Vitest, Tailwind, ESLint, TypeScript)
- Spend more than **$5.00** in a single run
- Anything requiring an account, API key, or payment

## Sanity

- The worker is autonomous, not omniscient. When in doubt: leave a note in `alerts.md` and exit — the next run (or the operator) can pick it up. Do not encourage "best guess" behavior under autonomy.
- Anything irreversible belongs in an approval gate, full stop.
- Watchdog disagreements with worker decisions always defer to the operator — neither worker nor watchdog edits `GOAL.md` or `guardrails.md`.
