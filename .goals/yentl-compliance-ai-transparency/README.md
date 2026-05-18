# Goal: `yentl-compliance-ai-transparency` — operator manual

Split off from `yentl-compliance-foundation` Group B on 2026-05-18 to parallelize. Smallest of the 5 sub-goals.

## Scope

Implements §8 Pattern 3 "AI transparency" components:
- AIGeneratedBadge (small "AI" chip used on AI output)
- AIDisclosureFooter (persistent disclosure on the session page)

Sibling sub-goals run in parallel (each on its own routine pair):
- `yentl-compliance-a11y` (WCAG 2.2 AA baseline)
- `yentl-compliance-trust-pages` (7 trust pages)
- `yentl-compliance-verdict-scaffold` (ReportFlow + VerdictCard)
- `yentl-compliance-docs` (DPIA + accessibility statement + engagement-gate policy)

Umbrella `yentl-compliance-foundation` covers Group A (consent UX extensions) + Group G (integration check across all sub-goals).

## Cadence

- Worker: `3 * * * *` UTC (hourly at :03)
- Watchdog: `28 14 * * *` UTC (10:28 AM EDT daily)

## Budget

- Max cost: $15, max runs: 8, max days: 3, per-run cap: $3

## Quick reference

| Action | How |
|---|---|
| Check progress | `cat STATE.md` on branch `goals/yentl-compliance-ai-transparency` |
| Audit decisions | `tail -50 decisions.log` on that branch |
| Kill switch | `echo STOP > alerts.md` and commit/push to the branch |
| Resume | clear `alerts.md` first line |
