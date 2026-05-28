# State: yentl-this-week-actions

**Last updated**: 2026-05-20 (Run 1 partial — clauses 1, 2, 3 complete)
**Status**: active (3 of 6 clauses done)
**Runs completed**: 1 (partial)
**Total cost (approx, USD)**: ~$1.50

---

## 2026-05-20 honest status check

No clause has moved since 2026-05-17 lock. The V3 wireframe sprint
(`feat/v3-auth-screens`, 8 screens, 10 commits) consumed all build cycles
2026-05-19 → 2026-05-20 and DID NOT touch any clause of this goal:

- Clause 1 (`diarize=false`): still NOT set explicitly in
  `lib/client/deepgram-stream.ts`. BIPA exposure clock continues to run
  on every dev/test recording.
- Clause 2 (EU endpoint env-switchable): still hardcoded US URL.
- Clause 3 (`docs/dpa-status.md`): still does not exist.
- Clause 4 (`ConsentGate.tsx`): still does not exist.
- Clause 5 (`RecordingBeacon.tsx`): still does not exist; also blocks
  `yentl-compliance-foundation` clause 4 (AudioRouteDisclosure).

Israel acknowledged the gap (chat, 2026-05-20) and chose to continue the
V3 visual sprint (Batch B claim sheets) before pivoting back. This entry
exists to keep the portfolio honest. AI Act Art 50 binds 2026-08-02
(~9 weeks from this entry). Clauses 1+2 are ~1 hour each; the delay is
a deliberate priority call, not a technical blocker.

---

## Current focus

Goal scaffolded but no worker run has executed yet. On first run, the worker will:
1. Read GOAL.md, guardrails.md, STATE.md, decisions.log.
2. Capture baseline for clauses 1, 2 (read existing deepgram files; check current diarization + URL state).
3. Verify nothing in the codebase already partially-implements clauses 3-5 (ls components/session, check for ConsentGate/RecordingBeacon files, check docs/).
4. Begin work on clause 1 (diarization off) since it's the highest-urgency lowest-effort item.

## Progress against success criteria

- [x] (1) Diarization OFF — `lib/client/deepgram-stream.ts` and
      `lib/server/deepgram-batch.ts` both set `diarize` explicitly to false.
      `grep -rE "diariz" lib/ app/ components/` returns ONLY `diarize=false`
      / `diarize: false` references in those two files. No `diarize=true`
      / `diarize: true` / `diarization: true` anywhere. Test
      `tests/deepgram-config.test.ts` asserts the live-stream URLSearchParams
      shape has `searchParams.get('diarize') === 'false'`. **(Run 1)**
- [x] (2) EU endpoint switchable — `lib/client/deepgram-endpoint.ts` exports
      `getDeepgramWsUrl()` selecting between US (default) and EU based on
      `process.env.NEXT_PUBLIC_DEEPGRAM_REGION` (`us | eu`). Unknown values
      fall back to US with `console.warn`. `.env.example` documents the var
      with a one-line GDPR-rationale comment. `tests/deepgram-config.test.ts`
      verifies: (a) default → US, (b) `eu` → EU, (c) `EU` (case-insensitive)
      → EU, (d) `uk` (unknown) → US with warn, (e) EU URL with params still
      has `diarize=false`. All 8 tests green. **(Run 1)**
- [x] (3) `docs/dpa-status.md` — exists at project root with full structure:
      sub-processor table (Deepgram / Anthropic / Vercel; Status, Portal URL,
      Contact, Notes), "What to verify in each DPA" 6-point checklist,
      Anthropic-specific auto-incorp note (2026-01-01 commercial ToS),
      Vercel-specific dashboard-sign note, TIA-status table, Human-action
      checklist with 7 boxes. Supersedes 2026-05-18 summary version that
      lived at this path from compliance-foundation Run 1. **(Run 1)**
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
| 1 | 2026-05-20T19:00:00Z | ~25 | ~$1.50 | Clauses 1+2+3 complete; deepgram diarize off everywhere, EU endpoint switchable, DPA doc expanded to clause-3 spec; 8/8 tests pass; build green |

> Worker appends one row per run.
