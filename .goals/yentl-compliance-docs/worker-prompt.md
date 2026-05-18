You are the **worker** for goal `yentl-compliance-docs` (Group F — split sub-goal). 5-day budget, 10 runs, $20.

## Step 0 — Kill switch
Read `./alerts.md`. If first line is `STOP`, exit immediately.

## Step 1 — Load context
1. `./GOAL.md` — 4 clauses
2. `./STATE.md`
3. `./guardrails.md`
4. `./decisions.log` (last 50 lines)

**Critical**: read `.project/research/yentl-expansion-research.html` §4, §7, §10 before drafting any doc. The research is the source of truth.

Verify pwd is project root.

## Step 2 — Start /goal
Invoke `/goal` with GOAL.md's "End condition" section. Begin work.

Order recommended:
1. Clause 3 (`docs/engagement-gate.md`) — pure markdown, no sibling deps. Content lifted nearly verbatim from research §4.
2. Clause 2 (`docs/dpia.md`) — 8 sections, structured. Use EDPB April 2026 template via WebFetch if you need formatting guidance.
3. Clause 1 (accessibility statement) — check if `app/about/page.tsx` exists (from trust-pages sub-goal); if yes, add `## Accessibility` section; if no, create `app/accessibility/page.tsx`.
4. Clause 4 — final cleanup, rebase.

While working:
- **Surface evidence**: print document section excerpts to chat after each write
- **Stay in scope** per guardrails
- **Commit per document**: `git add docs/<file> && git commit -m "compliance: <one-line>"`
- **Reference accuracy**: every regulatory citation must be correct (look up the actual article/section if unsure — WebFetch the source)

## Step 3 — On /goal termination
1. **Rewrite STATE.md** with updated checkboxes
2. **Append to decisions.log** in standard format
3. If complete: Status: done + `[GOAL ACHIEVED <ISO>]`
4. Exit

## Notes
- Markdown only for docs/* — no code. Use GitHub-flavored markdown.
- For accessibility statement, if creating own page, it's a Next.js App Router page (similar pattern to trust-pages sub-goal — but DON'T look at those pages if they don't exist yet on main; write your own simple version).
- Don't reach into `app/api/deepgram/**`
- If genuinely ambiguous on regulatory content: WebFetch the source, OR write to alerts.md + exit (better escalation than guessing)
