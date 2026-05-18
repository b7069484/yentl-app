You are the **worker** for goal `yentl-this-week-actions`. You are running in a scheduled, unattended session — there is no human supervising right now. Act conservatively, surface evidence in chat, respect the guardrails absolutely. This goal has a TIGHT budget ($10, 3 days, 8 runs) — efficiency matters.

## Step 0 — Kill-switch check

Read `./alerts.md` if it exists. If its first line is `STOP`, immediately exit the session without doing any work. Do not modify any files.

## Step 1 — Load context

Read these files in order, completely, before doing anything else:

1. `./GOAL.md` — locked objective. The 6 end-condition clauses are what determines completion.
2. `./STATE.md` — what's been done in prior runs and what was planned next.
3. `./guardrails.md` — what you may and may not do; **path scope is tight for this goal**.
4. `./decisions.log` (last 50 lines).

Verify you are in the project root: `pwd` should end in `Live FactCheck` (or a worktree under it). `cd` to the project root if not.

## Step 2 — Start `/goal`

Invoke `/goal` with the **exact text** from GOAL.md's "End condition" section (the assertion paragraph and all 6 numbered clauses). Then begin work.

While working:

- **Surface evidence in chat.** The evaluator only sees the transcript. After every meaningful action (running tests, grepping, editing files), print the result/diff/exit-code directly into chat.
- **Stay within path scope.** Only write to files enumerated in `guardrails.md` "Allowed write targets". Anything else triggers an approval gate.
- **Do NOT touch `app/api/deepgram/**`** beyond reading. The JWT mint path is stable.
- **Do NOT attempt to sign DPAs** or interact with vendor portals. Clause 3 creates/maintains the doc only.
- **Commit incrementally** with message prefix `this-week:`. Use `git add <specific-files>` not `git add -A`.
- **Run tests after each clause's changes** — `npx vitest run tests/deepgram-config.test.ts`, `npx vitest run tests/consent-gate.test.tsx`, `npx vitest run tests/recording-beacon.test.tsx`. Show the output in chat.

## Recommended clause order (priority + dependency)

1. **Clause 1 (diarization OFF)** — 5 lines of change in `lib/client/deepgram-stream.ts`, plus a test. ~10 minutes. Highest urgency (BIPA).
2. **Clause 2 (EU endpoint switchable)** — extract URL into a helper, add env var, document in `.env.example`, add 4 tests. ~30 minutes. Pairs with clause 1 (same test file).
3. **Clause 3 (DPA-status doc)** — pure markdown. ~15 minutes. No code dependencies.
4. **Clause 4 (ConsentGate)** — largest clause. Component + tests + integration with `app/session/page.tsx`. Probably needs 2 runs to converge.
5. **Clause 5 (RecordingBeacon)** — medium clause. Component + tests + integration. Probably 1 run.
6. **Clause 6 (clean working tree + rebase)** — final-run check.

If you complete clauses 1+2 in the same run, commit them as one `this-week: deepgram diarization off + EU endpoint switchable`. Otherwise commit them separately.

## Step 3 — On `/goal` termination

`/goal` terminates when the evaluator confirms, OR context/turn cap is hit, OR you call `/goal clear`. Before exiting the session:

1. **Rewrite `./STATE.md` completely** with updated timestamp, status, runs counter, cost, current focus, checkbox progress, next planned actions, blockers, and one new row in Recent runs.

2. **Append to `./decisions.log`** in this format:

   ```
   --- <ISO timestamp> ---
   RUN #<N> (worker)
   Goal terminated: <reason>
   Attempted: <one-line summary>
   Clauses progressed: <list of clause numbers>
   Evaluator verdict: <verbatim if available, else "n/a">
   Files changed: <list>
   Git commits made: <SHAs + subjects>
   Cost (approx): $<X.XX>
   ```

3. **If the goal is complete** (evaluator confirmed AND you independently re-verified all 6 clauses):
   - Set `Status: done` in STATE.md.
   - Append `[GOAL ACHIEVED <ISO timestamp>]` to decisions.log.
   - If clause 3's doc shows any human checkbox still unchecked, ALSO append `[GOAL READY FOR HUMAN ACTION <ISO timestamp>] DPA signing still required — see docs/dpa-status.md` (this is informational, NOT a failure).

4. Exit.

## Notes specific to this goal

- **`ulid` is already in `package.json`** (`^3.0.2`) — use it for `consent_id`, don't add a new dep.
- **`@testing-library/react` is installed** for component tests — use it for ConsentGate and RecordingBeacon tests.
- **`vitest.config.ts` has jsdom configured already** (verify with `cat vitest.config.ts`).
- **The session store at `lib/client/session-store.ts`** is the Zustand source of truth — extend it for consent state if needed (don't create a parallel store).
- **The research file** is at `.project/research/yentl-expansion-research.html` (after merge to main). §8 Patterns 1 + 2 have the spec for ConsentGate and RecordingBeacon; reference verbatim text where the spec gives it.

If anything ambiguous needs human judgment, do NOT guess. Note it in `STATE.md` blockers and write to `alerts.md` with the question, then exit.
