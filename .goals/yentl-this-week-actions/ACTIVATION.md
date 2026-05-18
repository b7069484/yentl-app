# Activation runbook: `yentl-this-week-actions`

Step-by-step from "goal files exist" to "cron is running on the most urgent goal in the portfolio". This goal has a 3-day budget — don't sit on it.

## 0. Pre-flight

```bash
claude --version   # must be 2.1.139+

cd "/Users/israelbitton/Live FactCheck/.claude/worktrees/wizardly-jones-792f60"
git status

ls -la .goals/yentl-this-week-actions/
# Expected: README.md, ACTIVATION.md, GOAL.md, STATE.md, worker-prompt.md, watchdog-prompt.md, guardrails.md, decisions.log
```

## 1. Review GOAL.md critically

Read the 6 clauses end-to-end. Especially confirm:
- Clause 4's consent modal copy — those exact phrases will appear in production UI; edit if you want different wording.
- Clause 3's DPA list — Deepgram, Anthropic, Vercel. Add another vendor if you've signed up for one I don't know about.
- Clause 5's beacon position — top-right vs bottom-right vs other; current spec leaves it to worker's UX judgment.

If any clause is wrong, edit BEFORE step 2.

## 2. Merge to `main`

The goal lives in the worktree. Cron needs a stable path.

```bash
cd "/Users/israelbitton/Live FactCheck/.claude/worktrees/wizardly-jones-792f60"
git add .goals/yentl-this-week-actions/
git commit -m "feat(goals): add yentl-this-week-actions scaffold"

cd "/Users/israelbitton/Live FactCheck"
git checkout main
git merge claude/wizardly-jones-792f60
```

Stable goal path post-merge:

```
/Users/israelbitton/Live FactCheck/.goals/yentl-this-week-actions/
```

## 3. Trust the workspace

```bash
cd "/Users/israelbitton/Live FactCheck"
claude
# Accept trust dialog. /exit.
```

One-time per workspace; already done if you trusted for the hardening-pass goal.

## 4. Manual dry-run (RECOMMENDED — costs ~$1, catches loop-breakers)

```bash
cd "/Users/israelbitton/Live FactCheck"
claude --print < .goals/yentl-this-week-actions/worker-prompt.md
```

Watch for:
- Loads GOAL/STATE/guardrails/decisions correctly
- Invokes `/goal` with the end-condition text
- Surfaces command outputs (test runs, grep results) in chat
- Respects the tight path scope (doesn't try to edit SessionHeader, TranscriptView, etc.)
- On termination: rewrites STATE.md, appends to decisions.log

## 5. Register cron

Default cadence (different from hardening — more aggressive watchdog because of 3-day budget):

- Worker: `0 * * * *` → `.goals/yentl-this-week-actions/worker-prompt.md`
- Watchdog: `0 */8 * * *` → `.goals/yentl-this-week-actions/watchdog-prompt.md`

Use `/schedule` slash command, `schedule` skill, or `CronCreate` MCP tool (whichever your install provides).

## 6. Activate

```bash
sed -i '' 's/\*\*Status\*\*: draft/**Status**: active/' "/Users/israelbitton/Live FactCheck/.goals/yentl-this-week-actions/GOAL.md"
git add .goals/yentl-this-week-actions/GOAL.md
git commit -m "chore(goals): activate yentl-this-week-actions"
```

## 7. Observe

Daily-ish, or whenever you want a status:

```bash
cd "/Users/israelbitton/Live FactCheck/.goals/yentl-this-week-actions"
cat STATE.md
tail -50 decisions.log
cat alerts.md 2>/dev/null
```

Watchdog runs 3× per day (every 8h); you'll see `[OK ...]` lines fast if healthy.

## 8. Kill switch

```bash
echo STOP > "/Users/israelbitton/Live FactCheck/.goals/yentl-this-week-actions/alerts.md"
```

Worker aborts on next firing. To kill permanently, also delete both routines.

## 9. When it completes

When you see `[WATCHDOG CONFIRMED COMPLETE ...]` in decisions.log:

1. **Check `docs/dpa-status.md`** — if any human checkbox is still unchecked, the loop is done but YOUR work isn't. The DPAs themselves are a 30-minute human task (Deepgram dashboard, Vercel dashboard, Anthropic console). Do them this week.
2. **Verify the consent modal in the browser**: `npm run dev`, navigate to `/session`, click Record, confirm the modal appears with all 4 required checkboxes + disclosures.
3. **Verify the recording beacon**: after consenting, confirm the beacon shows up, pulses (or doesn't, with reduced motion), and the End button works.
4. **Open a PR** from the working branch to `main` (humans own this).

## 10. Recommended portfolio context

This is goal **1 of 3 active**. The others:

- `yentl-hardening-pass` — activate AFTER this completes (loop validator with longer wall-clock)
- `yentl-compliance-foundation` — activate IN PARALLEL with hardening (different scope, no file conflicts)

Reason for this order: this goal is the most urgent (BIPA), smallest budget (loop-validates fastest), and unblocks the consent UX that compliance-foundation builds on top of.
