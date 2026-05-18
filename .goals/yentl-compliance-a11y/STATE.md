# State: yentl-compliance-a11y

**Last updated**: 2026-05-18T00:00:00Z (initial)
**Status**: not-started
**Runs completed**: 0
**Total cost (approx, USD)**: $0.00

---

## Current focus

Initial. First run will baseline:
- Does `app/layout.tsx` have any skip link?
- What's in `app/globals.css` (focus ring tokens)?
- Default Button size in `components/ui/button.tsx`
- Is RecordingBeacon (from this-week-actions) yet present + has motion-reduce?
- Is TranscriptView aria-live already?
- Is @axe-core/cli installed?
- Does `.github/workflows/ci.yml` exist (from hardening-pass)?

Then start with clauses that have NO net-new dependencies (1, 5, 4) before tackling clause 6 (audit gate) which needs install + script + iteration.

## Progress against success criteria

- [ ] (1) SkipToContent in layout — *baseline: unknown, verify*
- [ ] (2) Focus ring tokens in globals.css — *baseline: unknown*
- [ ] (3) 44×44 touch targets — *baseline: unknown; verify Button default*
- [ ] (4) motion-reduce variants applied — *needs scan + edits*
- [ ] (5) aria-live regions — *Transcript: unknown; Claims region missing*
- [ ] (6) axe-core gate + zero violations — *@axe-core/cli not installed*
- [ ] (7) Clean tree + rebased — *final*

## Next planned actions

1. Run 1: baseline reads of all the above; clauses 1, 5 (small additions). Commit.
2. Runs 2-3: clauses 2, 3, 4 (CSS/component tweaks). Commit incrementally.
3. Runs 4-6: clause 6 (install axe-cli, write script, iterate on violations). Most iterative work here.
4. Run 7-8: clause 7 (clean up, rebase, final commit). Done.

## Blockers

Clause 6's CI integration step depends on whether `yentl-hardening-pass` has created `.github/workflows/ci.yml`. If not, create a minimal one with just the a11y step; hardening-pass will merge/extend later.

## Recent runs

| # | When (ISO) | Duration (min) | Cost (USD) | Outcome |
|---|---|---|---|---|
