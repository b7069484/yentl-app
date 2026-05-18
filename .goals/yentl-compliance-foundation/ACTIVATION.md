# Activation runbook: `yentl-compliance-foundation`

Step-by-step from "goal files exist" to "the launch trust layer is being autonomously built." This is the longest-running goal in the portfolio (14-day wall-clock, 50-run budget) — set expectations accordingly.

## 0. Pre-flight

```bash
claude --version   # must be 2.1.139+

cd "/Users/israelbitton/Live FactCheck/.claude/worktrees/wizardly-jones-792f60"
git status

ls -la .goals/yentl-compliance-foundation/
# Expected: README.md, ACTIVATION.md, GOAL.md, STATE.md, worker-prompt.md, watchdog-prompt.md, guardrails.md, decisions.log
```

## 1. Review GOAL.md critically

This goal is BIG (28 clauses). Read end-to-end. Especially confirm:

- **Group A — Consent extensions**: Pause>End refactor is a UX call. Confirm you want Pause primary, End destructive-secondary (research says yes).
- **Group D — Trust pages content sketches**: are the privacy/terms/methodology sections covering what you want public? Add or remove sections before activation.
- **Group F — DPIA + engagement-gate spec**: these are reference docs. Confirm scope is right.
- **Anti-goals**: confirm the worker should NOT touch the fact-check pipeline, MarkerChip, engagement-gate runtime.

**The PRIVACY and TERMS pages are public legal surface.** If you have a media/internet lawyer relationship, plan a review of those two pages after the worker drafts them but before public launch. Per research §7: ~$3-5k one-time for a media/internet lawyer review.

## 2. Decide: activate in parallel with hardening, or sequentially?

**Recommended (with reasoning): activate IN PARALLEL with `yentl-hardening-pass`.** Reasons:
- Different file footprints (hardening focuses on tooling/config/middleware; compliance focuses on components/pages/docs) — no merge conflicts
- Compliance is the long-pole (14 days vs hardening's 7) — starting it sooner unblocks the launch sooner
- The watchdog mechanisms are independent; one goal's stalls don't affect the other

Alternative if you'd rather not run three simultaneous loops: sequential is fine — activate compliance after hardening completes.

## 3. Merge to `main`

```bash
cd "/Users/israelbitton/Live FactCheck/.claude/worktrees/wizardly-jones-792f60"
git add .goals/yentl-compliance-foundation/
git commit -m "feat(goals): add yentl-compliance-foundation scaffold (28 clauses, 7 groups)"

cd "/Users/israelbitton/Live FactCheck"
git checkout main
git merge claude/wizardly-jones-792f60
```

Stable goal path post-merge:

```
/Users/israelbitton/Live FactCheck/.goals/yentl-compliance-foundation/
```

## 4. Trust the workspace

Already done if you trusted for the hardening or this-week-actions goals. Otherwise:

```bash
cd "/Users/israelbitton/Live FactCheck"
claude
# Accept trust dialog. /exit.
```

## 5. Manual dry-run (STRONGLY RECOMMENDED — this goal is big)

```bash
cd "/Users/israelbitton/Live FactCheck"
claude --print < .goals/yentl-compliance-foundation/worker-prompt.md
```

Watch for:
- Correctly loads GOAL/STATE/guardrails/decisions
- Detects status of sister goal outputs (ConsentGate, RecordingBeacon, CHANGELOG)
- Picks Group B first (loop-validation), not a giant group
- On termination: rewrites STATE with all 28 clauses, appends to decisions.log

If anything is off in the dry run, fix the prompt or GOAL.md before activating cron.

## 6. Register cron

Default cadence:

- Worker: `0 */2 * * *` → `.goals/yentl-compliance-foundation/worker-prompt.md` (every 2 hours — slower pace, this is a marathon)
- Watchdog: `0 9 * * *` → `.goals/yentl-compliance-foundation/watchdog-prompt.md` (9am daily)

Use `/schedule`, the `schedule` skill, or `CronCreate` MCP tool.

## 7. Activate

```bash
sed -i '' 's/\*\*Status\*\*: draft/**Status**: active/' "/Users/israelbitton/Live FactCheck/.goals/yentl-compliance-foundation/GOAL.md"
git add .goals/yentl-compliance-foundation/GOAL.md
git commit -m "chore(goals): activate yentl-compliance-foundation"
```

## 8. Observe (daily-ish)

```bash
cd "/Users/israelbitton/Live FactCheck/.goals/yentl-compliance-foundation"
cat STATE.md                  # per-group checkbox progress
tail -100 decisions.log       # what happened recently
cat alerts.md 2>/dev/null     # watchdog flags?
```

The watchdog audits 1× per day; you'll see `[OK ...]` lines if healthy. Group health and trust-page quality are the things to watch for.

## 9. Mid-flight inspection (recommended — at ~25% and ~50% progress)

When `clauses-met` in the latest `[OK ...]` watchdog line reaches **~7/28** (mid-Group C completion) and **~14/28** (mid-Group D):

```bash
cd "/Users/israelbitton/Live FactCheck"
npm run dev
# In another terminal, browse:
#   http://localhost:3000/about
#   http://localhost:3000/methodology
#   http://localhost:3000/privacy
#   http://localhost:3000/terms
```

Eyeball the rendered pages. The worker's content might be technically correct but feel wrong for the brand. Easier to course-correct mid-flight than after all 7 trust pages are drafted.

## 10. Kill switch

```bash
echo STOP > "/Users/israelbitton/Live FactCheck/.goals/yentl-compliance-foundation/alerts.md"
```

Worker aborts on next firing. To kill permanently, also delete both routines.

## 11. Split if a group stalls

If the watchdog flags a stalled group (recommendation will be specific):

1. Kill compliance-foundation (delete routines + STOP).
2. Instantiate a new goal from the template using just that group's clauses:
   ```bash
   ~/.claude/templates/goal-scaffold/init-goal.sh yentl-trust-pages  # or yentl-wcag-baseline, etc.
   ```
3. Customize the GOAL.md to contain only the stalled group's clauses.
4. Activate the new micro-goal.
5. Strike those clauses from compliance-foundation's GOAL.md (with a comment "moved to yentl-trust-pages").
6. Resume compliance-foundation.

## 12. When it completes

When you see `[WATCHDOG CONFIRMED COMPLETE ...]` in decisions.log:

1. **Read every trust page in the browser** — privacy, terms, methodology, about, changelog, subprocessors, accessibility. Eyeball for quality. Flag anything that needs human-author rework.
2. **Run the a11y audit yourself one more time** to confirm WCAG 2.2 AA holds with no regressions.
3. **Plan the legal review** of privacy + terms with a media/internet lawyer (~$3-5k one-time per research §7). The worker's draft is a starting point, not a final answer.
4. **Open a PR** to `main` (humans own merges).
5. **Update the v1 launch checklist** — this goal completing is a major milestone toward public-launch readiness.

## 13. Portfolio context

This is goal **3 of 3 active**, expected to be the longest-running:

- `yentl-this-week-actions` (most urgent, 3-day budget) — activate FIRST
- `yentl-hardening-pass` (loop-validator + foundation, 7-day budget) — activate SECOND
- `yentl-compliance-foundation` (this goal, 14-day budget) — activate THIRD (in parallel with hardening if you're comfortable running 3 loops)

After all three complete, the remaining work toward public launch is in the **human + AI builder track**: Tasks 12-26 (fact-check pipeline), pre-submission accuracy audit (50T/50F), Capacitor mobile shells, App Store submissions.
