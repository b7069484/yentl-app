# State: yentl-compliance-foundation (NARROWED)

**Last updated**: 2026-05-18T00:00:00Z (re-baselined after split)
**Status**: active (Groups A + G only)
**Runs completed**: 0 (with new narrowed scope)
**Total cost (approx, USD)**: $0.00

---

## Current focus

Goal scope was narrowed on 2026-05-18 to **Groups A + G only** (8 clauses) — sister sub-goals own Groups B-F. On next worker fire:
1. Read narrowed GOAL.md (8 clauses)
2. Check whether RecordingBeacon exists yet on origin/main (clause 4 dependency)
3. Start with Group A clauses 1-3 (no deps); defer clause 4 if RecordingBeacon absent
4. Clauses 5-8 (Group G integration) BLOCKED until all 5 sub-goals report Status: done

## Progress against success criteria

### Group A — consent UX extensions
- [ ] (1) Pause > End hierarchy fix — *baseline: SessionHeader exists; current button hierarchy needs verification*
- [ ] (2) SessionTimer 30-min toast — *no component exists; may install sonner*
- [ ] (3) TwoPartyDisclosure banner — *no component exists*
- [ ] (4) AudioRouteDisclosure popover — *no component exists; **depends on RecordingBeacon from yentl-this-week-actions***

### Group G — integration check (BLOCKED on sub-goals)
- [ ] (5) All 5 compliance sub-goals report Status: done — *all currently not-started or in-progress*
- [ ] (6) CHANGELOG.md rollup — *may depend on hardening-pass creating CHANGELOG.md first*
- [ ] (7) README.md Compliance & Trust section — *missing*
- [ ] (8) Working tree clean + rebased — *recheck final*

## Next planned actions

1. **Run 1** (when worker fires): clauses 1, 2, 3 (Group A non-blocked). Commit.
2. **Run 2-3**: clause 4 IF RecordingBeacon present on origin/main; otherwise wait.
3. **Runs 4+**: Group G clause 5 check (read sibling sub-goal STATE.mds); if all done, do clauses 6, 7. Otherwise exit "waiting on sub-goals."
4. **Final run**: clause 8 cleanup + rebase.

## Blockers

- **Clause 4**: depends on `components/session/recording-beacon.tsx` existing on origin/main (from `yentl-this-week-actions` worker output).
- **Clauses 5-7**: depend on all 5 compliance sub-goals reporting Status: done.
- **Clause 6**: depends on root `CHANGELOG.md` existing (created by `yentl-hardening-pass` clause 11, OR this goal creates it).

## Recent runs

| # | When (ISO) | Duration (min) | Cost (USD) | Outcome |
|---|---|---|---|---|

> Worker appends one row per run. Mark "BLOCKED — waiting on sub-goals" runs explicitly so the watchdog doesn't flag them as stalls.
