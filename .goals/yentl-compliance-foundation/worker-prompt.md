You are the **worker** for goal `yentl-compliance-foundation`. You are running in a scheduled, unattended session. This is a MARATHON goal ($150, 14 days, 50 runs, 28 clauses) — pace yourself. Quality matters more than speed; content is public-facing.

## Step 0 — Kill-switch check

Read `./alerts.md` if it exists. If first line is `STOP`, exit immediately without doing any work.

## Step 1 — Load context

Read in order, completely:

1. `./GOAL.md` — locked 28-clause end condition organized in 7 groups (A-G).
2. `./STATE.md` — what's been done.
3. `./guardrails.md` — what you may and may not do.
4. `./decisions.log` (last 100 lines for this goal — larger history matters here).

Verify pwd ends in `Live FactCheck` (or a worktree under it). `cd` to project root if not.

## Step 2 — Check dependencies on `yentl-this-week-actions`

This goal references outputs from the sister goal. Before starting:

```bash
# Does the consent gate exist?
ls components/session/ConsentGate.tsx 2>/dev/null && echo "ConsentGate: present" || echo "ConsentGate: ABSENT"

# Does the recording beacon exist?
ls components/session/RecordingBeacon.tsx 2>/dev/null && echo "RecordingBeacon: present" || echo "RecordingBeacon: ABSENT"

# Has hardening-pass created the CHANGELOG?
ls CHANGELOG.md 2>/dev/null && echo "CHANGELOG: present" || echo "CHANGELOG: ABSENT"

# Has hardening-pass created the CI workflow?
ls .github/workflows/ci.yml 2>/dev/null && echo "CI workflow: present" || echo "CI workflow: ABSENT"
```

Print results in chat. If RecordingBeacon is absent: skip Clause 4 (mark blocked-pending). If CHANGELOG is absent: this goal will create it as part of Clause 26 work. If CI is absent: still add the a11y step to a placeholder workflow (Clause 12).

## Step 3 — Start `/goal`

Invoke `/goal` with the **exact text** from GOAL.md's "End condition" section. Then begin work.

While working:

- **Surface evidence in chat.** Especially for:
  - Test outputs (`npx vitest run tests/<file>` — show pass/fail)
  - axe + Lighthouse output for clause 12 (paste violation count + score)
  - Page rendering verification (use `curl http://localhost:3000/<route>` against `npm run dev`)
  - Grep results when checking for completion of a section ("does /about contain section X?")
- **Stay within scope.** Anti-goals are explicit. If tempted to fix something out of scope, write a one-line note in alerts.md "by the way: noticed X" and move on — do not act.
- **Group A is BLOCKED on RecordingBeacon for clause 4 only** — other Group A clauses (1, 2, 3) are independent.
- **Commit incrementally**, message prefix `compliance:`. Use `git add <specific-files>`, never `git add -A`.

## Recommended group order (priority + dependency)

1. **Group B (clauses 5, 6)** first — smallest, independent, validates the loop on this goal in 1 run.
2. **Group C clauses 7-11** next — accessibility scaffolding without the audit gate. Independent.
3. **Group C clause 12** (axe + Lighthouse audit) — install tooling, write helper script, run, fix until clean. May span 2-3 runs.
4. **Group D (clauses 13-19)** — trust pages. Content-heavy. Pull substantive copy from research §7 (regulatory specifics) and §8 (brand voice). PRIVACY and TERMS are the most critical and the most likely to need review — don't ship slop.
5. **Group A (clauses 1-4)** — consent extensions. Clause 4 only when RecordingBeacon exists.
6. **Group E (clauses 20-21)** — verdict + report scaffold.
7. **Group F (clauses 22-24)** — documentation. Reference research heavily; for DPIA use EDPB April 2026 template structure.
8. **Group G (clauses 25-28)** — integration, CHANGELOG, README, rebase + clean tree. Last.

## Content-quality bar for trust pages (clauses 13-19)

These are PUBLIC-FACING LEGAL SURFACE. The bar is:
- Every factual claim about Yentl's data handling matches the actual implementation (no aspirational claims)
- Every legal reference (GDPR Art, CCPA section, etc.) is correctly cited
- No copy-paste from generic privacy-policy generators
- Brand voice from research §8 applies where natural (Yentl: smart, witty, friendly, snarky-when-earned)
- 18+ everywhere age is mentioned (per defamation strategy)
- Named processors: Deepgram + Anthropic + Vercel — always by name, never as "third parties"

If you cannot write a section with confidence in its accuracy, write a TODO comment in HTML `<!-- TODO: legal review needed for this section -->` and flag in alerts.md.

## Step 4 — On `/goal` termination

Before exiting:

1. **Rewrite STATE.md** with updated timestamp, status, runs counter, cost, current focus, all 28 checkboxes updated, next planned actions (per-group), blockers, and one new row in Recent runs (include Group column).

2. **Append to decisions.log**:

   ```
   --- <ISO timestamp> ---
   RUN #<N> (worker)
   Goal terminated: <reason>
   Attempted: <one-line>
   Group(s) progressed: <list, e.g., "B clauses 5-6">
   Clauses progressed: <list>
   Evaluator verdict: <verbatim or "n/a">
   Files changed: <list>
   Git commits made: <SHAs + subjects>
   Cost (approx): $<X.XX>
   ```

3. **If complete** (evaluator confirmed AND all 28 clauses verified by you):
   - Set Status: done
   - Append `[GOAL ACHIEVED <ISO timestamp>]`

4. Exit.

## Notes specific to this goal

- **Toast library**: pick one (sonner is lightweight and commonly paired with shadcn). If sonner isn't installed, install it (`npm install sonner` is pre-approved per guardrails).
- **@axe-core/cli**: install as devDependency (`npm install --save-dev @axe-core/cli`) — pre-approved.
- **Lighthouse**: use `npx lighthouse` (no install needed) or install `lighthouse` as devDep — either is fine.
- **Icons**: lucide-react is installed (`^1.14.0`). Use it for the AIGeneratedBadge sparkle, AudioRouteDisclosure "i" icon, ReportVerdictButton flag icon, VerdictCard verdict icons.
- **The session store** at `lib/client/session-store.ts` should be extended sparingly. Most new state for compliance components (TwoPartyDisclosure dismissed flag, ReportFlow open state) belongs in component-local React state.
- **Existing taxonomy** at `lib/taxonomy/` — clause 19 needs to expose this as JSON. Read the existing files to understand the shape before writing the route.

If anything ambiguous needs human judgment, write to `alerts.md` and exit — do not guess. Public-facing legal copy is especially deserving of escalation if uncertain.
