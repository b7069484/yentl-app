# Activation runbook: `yentl-hardening-pass`

Step-by-step from "goal files exist" to "cron is running and the autonomous loop is live". Follow in order. Stop and ask if anything diverges from what's described.

## 0. Pre-flight checks

```bash
# Verify Claude Code version (must be 2.1.139+ for /goal)
claude --version

# Verify we're in a clean worktree state
cd "/Users/israelbitton/Live FactCheck/.claude/worktrees/wizardly-jones-792f60"
git status

# Verify the goal scaffold is complete
ls -la .goals/yentl-hardening-pass/
# Expected: README.md, ACTIVATION.md, GOAL.md, STATE.md, worker-prompt.md, watchdog-prompt.md, guardrails.md, decisions.log
```

If `claude --version` is below 2.1.139, run `npm i -g @anthropic-ai/claude-code@latest` (or your install's equivalent) before proceeding.

## 1. Review GOAL.md and guardrails.md one more time

These two files are the contract. Once cron is running, the worker treats them as law. **Read GOAL.md end-to-end now**, especially the 14-clause end condition and the anti-goals. If any clause is wrong, edit it BEFORE step 2.

## 2. Merge the goal scaffold to `main`

The goal directory currently lives in this worktree. The cron needs a stable path. Merge first:

```bash
# From the worktree branch
cd "/Users/israelbitton/Live FactCheck/.claude/worktrees/wizardly-jones-792f60"
git add .goals/
git commit -m "feat(goals): add yentl-hardening-pass autonomous goal scaffold"

# Switch to main and merge (your usual flow — adjust if you use PRs)
cd "/Users/israelbitton/Live FactCheck"
git checkout main
git merge claude/wizardly-jones-792f60
```

After merge, the stable goal path is:

```
/Users/israelbitton/Live FactCheck/.goals/yentl-hardening-pass/
```

That's the path the cron will reference.

## 3. Trust the workspace

`/goal` requires a trusted workspace. Run `claude` interactively in the project root and accept the trust dialog:

```bash
cd "/Users/israelbitton/Live FactCheck"
claude
# When prompted, accept the trust dialog. Then /exit.
```

This is a one-time setup per workspace.

## 4. Manual dry-run of the worker prompt (RECOMMENDED before activating cron)

Before letting cron fire unsupervised, manually run the worker prompt once and observe. This catches anything that breaks before you commit to N hours of autonomous runs.

```bash
cd "/Users/israelbitton/Live FactCheck"
claude --print < .goals/yentl-hardening-pass/worker-prompt.md
```

(If your install of Claude Code doesn't support `--print < file`, paste the contents of `worker-prompt.md` into an interactive `claude` session as your first message.)

Watch for:
- Does it correctly load context (GOAL/STATE/guardrails/decisions)?
- Does it invoke `/goal` with the end condition text?
- Does it surface evidence in chat (test outputs, file contents)?
- Does it respect anti-goals (doesn't try to rebrand, doesn't touch deepgram path)?
- On termination, does it rewrite STATE.md and append to decisions.log?

If anything is off, fix the prompt file or GOAL.md before step 5.

## 5. Register cron routines

Default cadence: hourly worker + daily 9am watchdog. Adjust if you want.

**Cron expressions:**
- Worker: `0 * * * *` → `.goals/yentl-hardening-pass/worker-prompt.md`
- Watchdog: `0 9 * * *` → `.goals/yentl-hardening-pass/watchdog-prompt.md`

**Use whichever your Claude Code install provides:**

### Option A: `/schedule` slash command (preferred if available)

```
/schedule
```

Then follow the interactive prompts to add two routines with the cron expressions above, pointing to the two prompt files.

### Option B: `schedule` skill (if `/schedule` isn't a command)

Invoke the `schedule` skill in an interactive `claude` session and create the two routines.

### Option C: `CronCreate` MCP tool (if neither of the above)

Use `CronCreate` directly (load via `ToolSearch` if it's a deferred tool).

## 6. Update GOAL.md status

Once cron is registered:

```bash
sed -i '' 's/\*\*Status\*\*: draft/**Status**: active/' "/Users/israelbitton/Live FactCheck/.goals/yentl-hardening-pass/GOAL.md"
git add .goals/yentl-hardening-pass/GOAL.md
git commit -m "chore(goals): activate yentl-hardening-pass"
```

## 7. Observability — check on it

Daily-ish (or whenever you want a status):

```bash
cd "/Users/israelbitton/Live FactCheck/.goals/yentl-hardening-pass"
cat STATE.md                  # current focus, progress, blockers
tail -50 decisions.log        # what happened recently
cat alerts.md 2>/dev/null     # any watchdog flags? (may not exist)
```

The watchdog runs daily at 9am local; if everything is healthy, you'll see clean `[OK ...]` lines in decisions.log and `alerts.md` won't exist.

## 8. Kill switch

If you need to stop the loop fast (any reason):

```bash
echo STOP > "/Users/israelbitton/Live FactCheck/.goals/yentl-hardening-pass/alerts.md"
```

The worker checks `alerts.md` at startup of every run and aborts if the first line is `STOP`. To kill permanently, also delete both routines via your `/schedule` mechanism.

To resume: remove or replace the `STOP` line and (if you deleted routines) re-register them.

## 9. When it's done

When the watchdog appends `[WATCHDOG CONFIRMED COMPLETE ...]` to decisions.log, the goal is finished. At that point:

1. Review the worker's commits: `git log --oneline main..HEAD` on the working branch (or wherever the worker committed)
2. Run the 14 end-condition checks yourself in a clean shell, just to double-verify
3. If satisfied: open a PR from the working branch to `main` (humans own this step)
4. After merge: delete the cron routines, archive the goal directory if you want (`mv .goals/yentl-hardening-pass .goals/_archive/yentl-hardening-pass-COMPLETED-<date>`)

## If something goes sideways

- **Worker keeps stalling on the same clause**: the watchdog will flag it. Most likely the clause is unmeetable as written — edit GOAL.md, restart.
- **Cost overruns**: the watchdog writes `STOP` automatically. Decide whether to raise the budget in `guardrails.md` or split the goal.
- **Worker tries something denied**: the watchdog catches it as critical. Check the diff before deciding whether to forgive (rare — denied means denied).
- **Goal won't converge after 24 runs**: split it into `yentl-hardening-pass` (clauses 1–8) and `yentl-hardening-pass-infra` (clauses 9–14). Two smaller goals each with their own scaffold.
