# Goal: `yentl-hardening-pass` — operator manual

Instantiated from `~/.claude/templates/goal-scaffold/` on 2026-05-17. Targets the Yentl codebase (currently named `factify-scaffold` in package.json — rebrand is a separate goal).

See `ACTIVATION.md` next to this file for the **step-by-step activation runbook** specific to this goal.

## Architecture (recap from template)

```
You define GOAL → Cron fires worker hourly → worker invokes /goal with the end condition →
/goal evaluator (Haiku) judges completion → STATE updated → exit.
Daily watchdog reads STATE + decisions.log → flags drift/stall/cost issues.
```

- **Worker** = does the work (this codebase's hardening pass).
- **Watchdog** = audits the worker's progress and enforces hard stops.
- **/goal evaluator** = decides "done" (separate model, judges from chat transcript).

## Requirements (verify before activating)

- Claude Code **v2.1.139+** (for `/goal`). Check: `claude --version`.
- `/schedule` mechanism available (slash command, skill, or `CronCreate` MCP tool).
- **Trusted workspace** — run `claude` once in the goal's target dir and accept the trust dialog BEFORE cron fires.
- Hooks enabled.

## File layout

```
.goals/yentl-hardening-pass/
├── README.md            # this file
├── ACTIVATION.md        # step-by-step activation runbook (project-specific)
├── GOAL.md              # locked objective + 14-clause end condition
├── STATE.md             # worker rewrites each run
├── worker-prompt.md     # what cron fires hourly
├── watchdog-prompt.md   # what cron fires daily at 9am
├── decisions.log        # append-only audit trail
├── guardrails.md        # allow/deny tools, hard stops, approval gates
└── alerts.md            # watchdog creates on first issue; also kill-switch file
```

## Default cadence

- **Worker**: `0 * * * *` — hourly
- **Watchdog**: `0 9 * * *` — 9am local daily

## Quick reference

| Action            | How                                                                                   |
|-------------------|---------------------------------------------------------------------------------------|
| Check progress    | `cat STATE.md`                                                                        |
| Audit decisions   | `tail -50 decisions.log`                                                              |
| Check alerts      | `cat alerts.md`                                                                       |
| Pause             | Disable both routines via your /schedule mechanism                                    |
| Resume            | Re-enable both routines                                                               |
| Kill switch       | `echo STOP > alerts.md` (worker aborts on next firing without doing work)             |
| Kill permanently  | Delete both routines via your /schedule mechanism                                     |
| Change cadence    | Update cron expressions and re-register                                               |

## Known considerations (specific to this goal)

- **The .goals/ directory lives in this worktree**. Before activating cron, MERGE this branch to `main` so the cron can reference a stable path. See `ACTIVATION.md`.
- **The worker is allowed to `git commit`** (one of the few goals where it is — see `guardrails.md`). It must NOT push to `origin/main`. Pushing to its working branch is fine.
- **The worker is NOT authorized to do the brand rebrand** (factify → yentl renames in package.json, DNS, Vercel, etc.). That's a separate goal with downstream gates.
- **The worker MUST NOT touch `app/api/deepgram/**`** beyond importing security middleware. Live transcription path was just stabilized.
- **Coverage thresholds are intentionally moderate** for v1 (lines/functions/statements 70, branches 65, lib/** only) — don't let the worker chase 100% by writing trivial tests; that's an anti-pattern.

## If this goal stalls

The watchdog will flag stalls and (for critical issues) write `STOP` to `alerts.md`. If the watchdog flags repeatedly that the same clause won't converge, the right move is usually to **split this goal into two smaller ones** — quality/lint/coverage as one, middleware+CI+CHANGELOG as another — rather than relaxing the end condition.
