You are the **worker** for goal `yentl-compliance-trust-pages` (Group D — split sub-goal, content-heavy). 7-day budget, 20 runs, $50. **Content quality is everything for this goal.**

## Step 0 — Kill switch
Read `./alerts.md`. If first line is `STOP`, exit immediately.

## Step 1 — Load context
1. `./GOAL.md` — 8 clauses
2. `./STATE.md`
3. `./guardrails.md`
4. `./decisions.log` (last 50 lines)

**Critical**: also read `.project/research/yentl-expansion-research.html` §7 (Regulatory Landscape) before writing /privacy or /terms. The research is the source of truth — don't paraphrase incorrectly.

Verify pwd is project root.

## Step 2 — Start /goal
Invoke `/goal` with GOAL.md's "End condition" section. Begin work.

While working:
- **Surface evidence**: print rendered page excerpts via `curl http://localhost:3000/<route>` after starting dev server briefly
- **Content bar absolute**:
  - Every factual claim about Yentl's behavior must match actual implementation (read the code if you're unsure)
  - Every legal reference must be correctly cited (look up the actual GDPR article, CCPA section, etc.)
  - No copy-paste from generic privacy-policy generators
  - Apply brand voice from research §8 where natural (smart, witty, friendly, snarky-when-earned — see Brand-Voice Copy section)
  - Named processors always: Deepgram + Anthropic + Vercel (never "third parties")
  - 18+ for any age reference
- If you cannot write a section with confidence in its accuracy: embed `<!-- TODO: legal review needed -->` in the page AND append a note in alerts.md flagging it (informational, not STOP)
- **Commit per clause** when possible: `git add app/<route>/* tests/<route>* && git commit -m "compliance: /<route> page"`
- **Recommended order**: /about → /methodology → /changelog → /subprocessors → /taxonomy.json → /privacy → /terms (saving the two highest-stakes pages for after the loop is warmed up)

## Step 3 — On /goal termination
1. **Rewrite STATE.md** with updated checkboxes per-clause
2. **Append to decisions.log** in standard format (see umbrella)
3. **If complete** (evaluator confirmed + all 8 clauses verified by you with rendered output): Status: done + `[GOAL ACHIEVED <ISO>]`
4. Exit

## Notes specific to this sub-goal

- These are **Next.js 16 App Router pages**. Use `export default function Page()` with TypeScript. Server component is fine (no client hooks needed).
- Use the project's existing UI primitives (`@/components/ui/*`). Don't import third-party UI libraries.
- Tailwind v4 styling.
- The `/taxonomy.json` route can be either: (a) static file at `public/taxonomy.json` (simplest, no Route Handler), or (b) Route Handler at `app/taxonomy.json/route.ts`. EITHER is acceptable — pick whichever is simpler given current taxonomy shape.
- Tests can use `@testing-library/react` for component pages + `fetch` against dev server for the JSON route.
- If sibling sub-goal `yentl-compliance-docs` has created `docs/engagement-gate.md`, link to it from `/methodology` decline-to-engage section. Otherwise inline a prose summary and note `<!-- TODO: link to engagement-gate.md once available -->`.
- If sibling `yentl-this-week-actions` has created `docs/dpa-status.md`, link to it from `/subprocessors`. Otherwise prose with `<!-- TODO -->`.
- Don't touch `app/api/deepgram/**`. Don't touch sibling sub-goal files outside what's in guardrails.
- If genuinely ambiguous: write to `alerts.md`, exit (don't guess on legal content).
