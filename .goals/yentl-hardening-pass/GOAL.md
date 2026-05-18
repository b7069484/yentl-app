# Goal: Yentl Hardening Pass (v1)

**Slug**: `yentl-hardening-pass`
**Owner**: Israel B. Bitton (b7069484@gmail.com)
**Locked**: 2026-05-17
**Status**: draft

> Change Status to `active` once cron is registered. Values: `draft | active | paused | done | abandoned`.

---

## Objective (the WHY)

Bring the Yentl codebase (currently named `factify-scaffold` in `package.json` — rebrand is a separate goal) to a hardened, launch-ready baseline before resuming new product feature work. This is a quality / security / operability sweep, not a feature build.

Secondary purpose: this is the **first /goal we are validating end-to-end** with the autonomous-goal scaffold. If this loop runs cleanly to completion, we trust the machine for higher-ambition goals (Stripe integration scaffolding, mobile shell preparation, etc.). If it stalls, we learn what kinds of end conditions break the loop before betting more on it.

## End condition (THE LITERAL TEXT `/goal` EVALUATES)

> ALL of the following are simultaneously true and have been verified by running the listed commands during the same /goal session, with the outputs surfaced into the chat transcript so the evaluator can see them:
>
> 1. **Audit clean**: `npm audit --omit=dev --audit-level=high` exits 0 (zero high or critical vulnerabilities in production dependencies). Output of the command is printed in chat.
> 2. **Type-strict**: `npx tsc --noEmit` exits 0. `tsconfig.json` contains `"strict": true` at the top level of `compilerOptions` (already true at goal-lock time — must remain true).
> 3. **Tests pass**: `npx vitest run` exits 0. No tests are skipped (`it.skip` / `describe.skip` / `test.skip` returns no matches in `tests/` and `app/` and `lib/` and `components/`).
> 4. **Coverage gate configured and met**: `vitest.config.ts` declares a `coverage` block with `provider: 'v8'`, `reporter` including `'text'` and `'json-summary'`, and per-file thresholds `lines: 70`, `functions: 70`, `branches: 65`, `statements: 70` scoped to `lib/**`. `npx vitest run --coverage` exits 0 with thresholds met.
> 5. **Lint clean**: `npx eslint . --max-warnings=0` exits 0.
> 6. **No TODO/FIXME/XXX in source**: `grep -rE "TODO|FIXME|XXX" --include="*.ts" --include="*.tsx" app lib components scripts` returns no matches, OR every match is inside a single `docs/known-deferred.md` file that catalogs intentionally deferred items with a one-line rationale each.
> 7. **No `console.log` in production bundle**: After `npm run build` succeeds, `grep -rE "console\.log" .next/static/ .next/server/` returns no matches. (`console.warn` and `console.error` are allowed.)
> 8. **Env parity**: For every `process.env.X` reference in `app/**`, `lib/**`, `components/**`, `scripts/**` (test files excluded), `X` is enumerated in `.env.example` with a one-line comment explaining its purpose. Conversely, every key in `.env.example` is read somewhere in those paths (no dead keys). A one-shot script or grep proves both directions in chat.
> 9. **Security middleware in place**: A `middleware.ts` exists at the project root that applies, at minimum:
>    - Rate limiting on `/api/**` routes: 50 req/min per IP (in-memory token bucket is acceptable for v1)
>    - Security response headers on all responses: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` disabling camera/microphone/geolocation/payment unless explicitly needed (microphone IS needed for Deepgram — document the exception in code), `Content-Security-Policy-Report-Only` with sensible defaults (`default-src 'self'`, plus allowlists for `https://*.deepgram.com` and any AI Gateway endpoints).
>    - A test in `tests/middleware.test.ts` verifies headers are set on a sample response and rate limit triggers at the configured threshold.
> 10. **CI workflow exists**: `.github/workflows/ci.yml` exists, triggers on `push` to any branch AND `pull_request` against `main`. It uses Node 20+, `npm ci` for installs, caches `~/.npm`, and runs (in this order, each as a separate step that fails the workflow on non-zero exit):
>     - `npx tsc --noEmit`
>     - `npx eslint . --max-warnings=0`
>     - `npx vitest run --coverage`
>     - `npm audit --omit=dev --audit-level=high`
> 11. **CHANGELOG.md exists** at the project root following the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format. It contains an entry under `## [Unreleased]` or a dated section `## [hardening-1] - 2026-05-17` (or the date the goal completes, whichever is later) titled "Hardening pass" enumerating: every dependency added or upgraded, every config file changed or created, every new file added, every breaking change introduced.
> 12. **README has a "Security & Operations" section** (heading: `## Security & Operations`) at the project root README.md, documenting at minimum: (a) how to run tests with coverage locally, (b) where env vars are documented and how to obtain values for each one, (c) how the rate limiter behaves and how to tune it, (d) how to report a vulnerability (single contact email or process).
> 13. **Branch is mergeable**: The branch the worker has been operating on rebases cleanly onto `origin/main`. Verified by `git fetch origin && git rebase origin/main` succeeding without conflicts, OR by `git merge-base --is-ancestor origin/main HEAD` returning 0.
> 14. **Working tree clean**: `git status --porcelain` returns empty output (no staged/unstaged/untracked changes left over from this run). All worker-created changes are committed.

## Success criteria (auditable checklist — work-breakdown)

Maps 1:1 to end-condition clauses. Worker updates these in `STATE.md` as it progresses.

- [ ] (1) npm audit clean on production deps
- [ ] (2) tsc strict passes (no changes expected — strict is already on)
- [ ] (3) Existing 4 tests pass; no skipped tests
- [ ] (4) vitest coverage block added + `@vitest/coverage-v8` installed; thresholds met on `lib/**`
- [ ] (5) ESLint passes with zero warnings (may require fixing or tightening config)
- [ ] (6) TODO/FIXME/XXX cleared from source or migrated to `docs/known-deferred.md`
- [ ] (7) console.log removed from production build paths
- [ ] (8) `.env.example` reconciled with actual `process.env.X` usage; each entry commented
- [ ] (9) `middleware.ts` with rate limit + security headers; tested
- [ ] (10) `.github/workflows/ci.yml` created and passes on a test push
- [ ] (11) `CHANGELOG.md` created with hardening entry
- [ ] (12) README Security & Operations section added
- [ ] (13) Branch rebased clean against `origin/main`
- [ ] (14) Final commit + clean working tree

## Out of scope (anti-goals — worker MUST NOT do these even if it seems helpful)

- **No rebrand**. Do NOT rename `factify-scaffold` to `yentl` in `package.json`, `README.md`, or anywhere else in code, docs, or DNS. Rebrand is a separate goal with Vercel/DNS implications.
- **Do NOT touch `app/api/deepgram/**`** beyond importing security helpers FROM the new middleware. Live transcription path was just stabilized — no logic changes.
- **No new product features.** No new routes, new UI components, new API endpoints, taxonomy expansion, or copy changes.
- **No brand asset changes.** Do not modify anything under `.project/`, `public/logos/`, or component visual styling.
- **No pushes to `origin/main`** and no PR creation/merge. Commits to the working branch are required (per clause 14); pushing the working branch to origin is also allowed (for CI to run); creating or merging PRs is human-only.
- **No major version upgrades.** Next.js, React, AI SDK, Vitest, Tailwind major versions are frozen for this pass. Patch/minor upgrades are allowed if `npm audit` requires them.
- **No `npm install` / `npm update` without a specific target tied to a clause.** No "while we're here" dependency cleanup.
- **No money spent on external services or new account signups.**
- **No deleting tests, marking tests `.skip`, or weakening assertions** to make tests pass. If a test is genuinely wrong, fix the test thoughtfully and document why in the commit message.
- **No modifications to `~/.claude/`** or anything outside `/Users/israelbitton/Live FactCheck/`.

## Context / references (worker reads each run)

- `./GOAL.md` — this file (locked end condition).
- `./guardrails.md` — tool allow/deny and hard-stop conditions.
- `./STATE.md` — last run's progress.
- `./decisions.log` (last 50 lines) — recent decisions.
- `/Users/israelbitton/Live FactCheck/package.json` — deps and scripts.
- `/Users/israelbitton/Live FactCheck/tsconfig.json` — TS config (strict: true already).
- `/Users/israelbitton/Live FactCheck/eslint.config.mjs` — ESLint flat config.
- `/Users/israelbitton/Live FactCheck/vitest.config.ts` — Vitest config (no coverage block yet).
- `/Users/israelbitton/Live FactCheck/.env.example` — currently lists `DEEPGRAM_API_KEY`, `DEEPGRAM_PROJECT_ID`.
- `/Users/israelbitton/Live FactCheck/tests/` — existing tests: smoke, reputation, dedup, taxonomy.
- Next.js 16 middleware docs: https://nextjs.org/docs/app/api-reference/file-conventions/middleware
- Keep a Changelog: https://keepachangelog.com/en/1.1.0/
- Vitest coverage: https://vitest.dev/guide/coverage

## Budget (watchdog enforces from `guardrails.md`)

- **Max cost (USD)**: $50.00 (small validation budget; raise after the scaffold proves itself)
- **Max wall-clock days**: 7
- **Max worker runs**: 24 (≈ 3 days of hourly runs to converge)
- **Per-run cost cap**: $5.00

> If the watchdog repeatedly flags any single clause as unconvergeable, **split the goal**: keep clauses 1–8 (quality + env) in this one, move clauses 9–14 (middleware + CI + docs + git hygiene) into `yentl-hardening-pass-infra`.
