You are the **worker** for goal `yentl-compliance-a11y` (Group C of compliance — split sub-goal). 7-day budget, 20 runs, $40.

## Step 0 — Kill switch
Read `./alerts.md`. If first line is `STOP`, exit immediately.

## Step 1 — Load context
1. `./GOAL.md` — 7 clauses
2. `./STATE.md`
3. `./guardrails.md`
4. `./decisions.log` (last 50 lines)

Verify pwd is project root.

## Step 2 — Start /goal
Invoke `/goal` with GOAL.md's "End condition" section verbatim. Begin work.

While working:
- **Surface evidence**: axe-core output, Lighthouse scores, test pass/fail, file diffs — all printed in chat for the evaluator
- **Stay in scope** per guardrails
- **Commit incrementally**: `git add <files> && git commit -m "compliance: <one-line>"`
- **Recommended order**: baseline reads → clauses 1, 5 (easy adds) → 2, 3, 4 (CSS/component tweaks) → clause 6 (axe-cli install + script + iteration on violations) → clause 7 (cleanup)

## Special handling — clause 6 (a11y audit gate)

The `scripts/run-a11y-audit.sh` script must wait for the dev server to be READY (not just sleep N seconds — fragile). Use a polling loop:

```bash
npm run dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..30}; do
  if curl -sSf http://localhost:3000 > /dev/null 2>&1; then break; fi
  sleep 2
done
# ... run audits ...
kill $DEV_PID 2>/dev/null || true
```

Then run axe-core on both routes, then Lighthouse on both routes, then sum the gate.

If iterating to fix violations: each fix should be a separate commit with a clear message naming the violation (e.g., `compliance: fix color-contrast on muted text in TranscriptView`).

## Step 3 — On /goal termination
1. **Rewrite STATE.md** with updated timestamp/status/runs/cost/checkboxes/next-actions/blockers + new Recent runs row
2. **Append to decisions.log** with the standard worker entry format (see umbrella for shape)
3. If complete: Status: done + `[GOAL ACHIEVED <ISO>]` line
4. Exit

## Notes
- `@axe-core/cli` is pre-approved for `npm install --save-dev` per guardrails. Lighthouse can be invoked via `npx lighthouse` without install.
- The RecordingBeacon from `yentl-this-week-actions` may or may not exist yet on main. Check `components/session/recording-beacon.tsx`. If absent, clause 4's motion-reduce coverage shouldn't fail just because that file doesn't exist — note in STATE.md "RecordingBeacon not yet on main; clause 4 covers other animated components" and verify clause 4 once it's available.
- If `.github/workflows/ci.yml` is absent, create the minimal version with the a11y step; later hardening-pass merges/extends. If it exists, append the a11y step.
- Don't touch `app/api/deepgram/**`. Don't touch trust pages or other sibling sub-goal files.
- Ambiguous = write to alerts.md, exit.
