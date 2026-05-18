# Guardrails: yentl-this-week-actions

> Tight-scope goal. Path discipline is the main safety mechanism — the worker should only touch the files enumerated below.

## Allowed write targets (exhaustive — anything else is an approval gate)

The worker may **create or modify** ONLY the following files:

- `lib/client/deepgram-stream.ts` (clauses 1, 2)
- `lib/client/deepgram-endpoint.ts` (clause 2, if extracting helper to new file)
- `lib/server/deepgram.ts` (clause 1, if diarization needs to be explicitly disabled in token grant)
- `lib/client/session-store.ts` (clauses 4-5, if extending Zustand store with consent or recording state — only if existing fields are insufficient)
- `app/session/page.tsx` (clauses 4, 5, integration)
- `app/layout.tsx` (clause 5, only if mounting RecordingBeacon at layout level)
- `components/session/ConsentGate.tsx` (clause 4 — NEW file)
- `components/session/RecordingBeacon.tsx` (clause 5 — NEW file)
- `components/session/consent-storage.ts` (clause 4, if extracting ledger logic — NEW file, optional)
- `docs/dpa-status.md` (clause 3 — NEW file)
- `.env.example` (clause 2)
- `tests/deepgram-config.test.ts` (clauses 1, 2 — NEW file)
- `tests/consent-gate.test.tsx` (clause 4 — NEW file)
- `tests/recording-beacon.test.tsx` (clause 5 — NEW file)
- `tests/__helpers/` (NEW directory, optional, if shared test utilities needed)
- `.goals/yentl-this-week-actions/STATE.md` (per-run progress)
- `.goals/yentl-this-week-actions/decisions.log` (per-run + per-audit append)
- `.goals/yentl-this-week-actions/alerts.md` (worker writes only if approval-gate hit)

**Anything outside this list is an approval-gate violation.** If the worker believes it needs to write elsewhere (e.g., update SessionHeader.tsx, modify TranscriptView, add a new route), it MUST write a note to `alerts.md` and exit — do not write the file.

## Allowed tools (unsupervised)

- `Read`, `Glob`, `Grep` — read anything project-wide
- `Edit`, `Write` — only on allowed write targets above
- `Bash` for:
  - **Tests**: `npx vitest run`, `npx vitest run <specific-test-file>`
  - **Type/lint**: `npx tsc --noEmit`, `npx eslint .`, `npx eslint <specific-file> --fix`
  - **Git (read-only)**: `git status`, `git diff`, `git log`, `git show`, `git branch`, `git fetch origin`, `git merge-base`
  - **Git (write — this goal only)**: `git add <specific-files>` (NEVER `git add -A` or `git add .`), `git commit -m "this-week: <message>"`, `git rebase origin/main`, `git push origin <current-branch>` (NEVER main)
  - **File inspection**: `ls`, `cat <small file>`, `head`, `tail`, `wc`, `find -maxdepth 3`
  - **Search**: `grep`, `grep -rE`
- `WebFetch`, `WebSearch` — only for: Deepgram docs, GDPR/AI Act texts, WCAG references. Not for code-execution payloads.

## Denied tools (any invocation = critical issue)

- **Push to `origin/main`** in any form
- **PR ops**: `gh pr create`, `gh pr merge`, `gh pr close`, `gh pr ready`
- **Publish**: `npm publish`, `pnpm publish`, `yarn publish`
- **Deploy**: `vercel deploy`, `vercel --prod`, anything ending in `deploy`
- **Messaging**: any Slack, email, Discord CLI
- **Vendor-portal interactions**: do NOT attempt to log in to Deepgram dashboard, Anthropic console, Vercel dashboard. Do NOT use any `curl`/`wget` against vendor portal URLs. Do NOT attempt to sign DPAs.
- **Destructive ops**: `rm -rf`, `git reset --hard`, `git checkout .`, `git clean -fd`, `git branch -D`
- **Force pushes**: `git push --force`, `git push -f`
- **Hook bypasses**: `--no-verify`, `--no-gpg-sign`, `--no-pre-commit`
- **Major version bumps**: Next.js, React, AI SDK, Vitest, Tailwind, ESLint, TypeScript
- **New top-level dependencies** other than verified-already-present (`ulid` is in package.json ^3.0.2)
- **Bulk dep ops**: `npm update`, `npm audit fix --force`, `npm-check-updates`
- **`git add -A`**, **`git add .`** — stage by explicit filename only (defense against committing unrelated work)
- **Modifying `app/api/deepgram/**`** beyond reading
- **Modifying `.project/`** or `public/logos/`
- **Modifying files outside `/Users/israelbitton/Live FactCheck/`**
- **`curl`/`wget` piped to a shell**
- **Long-running processes** (`npm run dev` for more than a brief verification — kill within same command)

## Hard-stop conditions (watchdog enforces — any triggers `STOP` to alerts.md)

- `Total cost (approx, USD)` > $10
- `Runs completed` > 8
- Days since first run > 3
- Same `Next planned actions` in 3+ consecutive runs (stall)
- `Status: blocked` for 2+ consecutive runs
- Same clause unchecked after 3+ runs of attempted work on it (more aggressive than other goals — short budget)
- Any denied-tool invocation attempted
- GOAL.md modified after Locked date by a worker commit (goal-creep)
- Sampled clause verification fails at claimed completion

## Approval gates (worker stops, writes to alerts.md, exits without acting)

If the worker believes any of the following is needed, it must STOP, write the request to alerts.md, and exit:

- Modify a file not in the "Allowed write targets" list above
- Change any clause of the end condition
- Skip a success criterion
- Install a new top-level dependency
- Interact with any vendor portal
- Sign any DPA or click through any agreement
- Touch `app/api/deepgram/**`
- Bump a major framework version
- Spend more than $2 in a single run
- Modify any file in the brand asset paths

## Sanity

- The worker is autonomous, not omniscient. When uncertain: write to alerts.md and exit.
- Anything irreversible belongs in an approval gate.
- Watchdog detects, does not fix. Worker fixes within scope.
- Three days. Six clauses. $10. Move with intent, not haste.
