# State: yentl-this-week-actions

**Last updated**: 2026-05-17T00:00:00Z (initial — worker has not run yet)
**Status**: not-started
**Runs completed**: 0
**Total cost (approx, USD)**: $0.00

---

## Current focus

Goal scaffolded but no worker run has executed yet. On first run, the worker will:
1. Read GOAL.md, guardrails.md, STATE.md, decisions.log.
2. Capture baseline for clauses 1, 2 (read existing deepgram files; check current diarization + URL state).
3. Verify nothing in the codebase already partially-implements clauses 3-5 (ls components/session, check for ConsentGate/RecordingBeacon files, check docs/).
4. Begin work on clause 1 (diarization off) since it's the highest-urgency lowest-effort item.

## Progress against success criteria

- [ ] (1) Diarization OFF — *baseline: not set explicitly; `lib/client/deepgram-stream.ts:17-24` builds URLSearchParams without `diarize`*
- [ ] (2) EU endpoint switchable — *baseline: hardcoded `wss://api.deepgram.com` at `lib/client/deepgram-stream.ts:30`*
- [ ] (3) `docs/dpa-status.md` — *does not exist*
- [ ] (4) `ConsentGate.tsx` — *does not exist; `app/session/page.tsx:14` calls `start()` directly without gate*
- [ ] (5) `RecordingBeacon.tsx` — *does not exist*
- [ ] (6) Working tree clean + rebased — *recheck on final run*

## Next planned actions

1. **Run 1**: clauses 1 (diarization) + 2 (EU endpoint). Both are 1-file edits. Add `tests/deepgram-config.test.ts`. Commit `this-week: deepgram diarization off + EU endpoint switchable`.
2. **Run 2**: clause 3 (`docs/dpa-status.md`). Pure documentation. Commit `this-week: add DPA status doc`.
3. **Run 3-4**: clause 4 (`ConsentGate.tsx`). The largest clause. Add tests. Commit `this-week: launch consent modal (Art 6/7/9 + AI Act 50 + 5.1.2(i))`.
4. **Run 5-6**: clause 5 (`RecordingBeacon.tsx`). Add tests. Commit `this-week: recording beacon (two-party consent UX)`.
5. **Run 7**: clause 6 (working tree clean + rebase). Verify all clauses still hold (re-run the verification commands). Final commit `this-week: complete; rebased clean`.
6. **Run 8**: spare — slack for any clause that needs a second pass.

## Blockers

None yet. Clause 3 (DPA-status doc) cannot fully *complete* without humans signing the DPAs, but the *document* completes when in the spec shape. Human signing is tracked separately in the doc's checklist and reported via the `[GOAL READY FOR HUMAN ACTION]` marker rather than blocking goal completion.

## Recent runs

| # | When (ISO) | Duration (min) | Cost (USD) | Outcome (one line) |
|---|---|---|---|---|

> Worker appends one row per run.
