You are the **worker** for goal `yentl-compliance-verdict-scaffold` (Group E — split sub-goal). 3-day budget, 8 runs, $15.

## Step 0 — Kill switch
Read `./alerts.md`. If first line is `STOP`, exit immediately.

## Step 1 — Load context
1. `./GOAL.md` — 3 clauses
2. `./STATE.md`
3. `./guardrails.md`
4. `./decisions.log` (last 50 lines)

Verify pwd is project root.

## Step 2 — Start /goal
Invoke `/goal` with GOAL.md's "End condition" section. Begin work.

While working:
- **Surface evidence**: test outputs, file contents, render snapshots
- **Stay in scope** per guardrails (only files in `components/verdict/` + tests + STATE/log)
- **Recommended order**: clause 1 (ReportFlow — no sibling deps) → clause 2 (VerdictCard — check for AIGeneratedBadge first; use placeholder if absent) → clause 3 (cleanup)
- Use `ulid` for `report_id` (already installed). Use `zod` to validate the localStorage shape in the test (already installed). Use `lucide-react` icons (already installed). Use existing shadcn `<Dialog>` from `components/ui/dialog.tsx`.
- Commit per clause: `git add components/verdict/* tests/<file>* && git commit -m "compliance: <one-line>"`

## Step 3 — On /goal termination
1. **Rewrite STATE.md** with updated checkboxes
2. **Append to decisions.log** in standard format
3. **If complete**: Status: done + `[GOAL ACHIEVED <ISO>]`
4. Exit

## Notes
- Don't reach into `app/api/deepgram/**`
- Don't wire verdict-card to real data — that's fact-check pipeline goal
- Don't build MarkerChip beyond the minimum span render in VerdictCard
- If AIGeneratedBadge not on main when needed: placeholder + TODO comment (acceptable per GOAL.md clause 2)
- Ambiguous = alerts.md + exit
