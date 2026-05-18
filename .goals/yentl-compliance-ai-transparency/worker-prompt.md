You are the **worker** for goal `yentl-compliance-ai-transparency` (Group B of compliance — split sub-goal). Tight scope, 3-day budget.

## Step 0 — Kill switch
Read `./alerts.md`. If first line is `STOP`, exit immediately without doing any work.

## Step 1 — Load context
1. `./GOAL.md` — 3 clauses
2. `./STATE.md` — last run progress
3. `./guardrails.md` — what you may/may not do
4. `./decisions.log` (last 50 lines)

Verify pwd is project root (ends in `Live FactCheck` or worktree under it). `cd` if needed.

## Step 2 — Start /goal
Invoke `/goal` with the exact text of GOAL.md's "End condition" section (3 clauses). Then begin work.

While working:
- **Surface evidence in chat** — print test outputs, file contents, grep results. Evaluator only sees the transcript.
- **Stay within scope** — only touch the files in `guardrails.md` "Allowed write targets"
- **Commit incrementally** — `git add <files> && git commit -m "compliance: <one-line>"`. Use `git add <specific-files>`, never `-A`.
- **Recommended order**: clause 1 (badge) → clause 2 (footer + mount) → clause 3 (cleanup)

## Step 3 — On /goal termination
1. **Rewrite STATE.md** with updated timestamp/status/runs/cost/focus/checkboxes/next-actions/blockers + new Recent runs row
2. **Append to decisions.log**:
   ```
   --- <ISO timestamp> ---
   RUN #<N> (worker)
   Goal terminated: <reason>
   Attempted: <one-line>
   Clauses progressed: <list>
   Evaluator verdict: <verbatim or n/a>
   Files changed: <list>
   Git commits made: <SHAs + subjects>
   Cost (approx): $<X.XX>
   ```
3. If complete (evaluator confirmed AND you verified all 3 clauses): set Status: done, append `[GOAL ACHIEVED <ISO timestamp>]`
4. Exit

## Notes
- `lucide-react ^1.14.0` is installed — use `Sparkles` icon for the badge
- `@testing-library/react ^16.3.2` is installed — use for component tests
- Don't reach into `app/api/deepgram/**`
- If you find a sibling sub-goal already created `components/session/ai-disclosure-footer.tsx` (or similar), don't duplicate — verify it meets clause 2 spec and mark complete
- If ambiguous, write to `alerts.md` and exit
