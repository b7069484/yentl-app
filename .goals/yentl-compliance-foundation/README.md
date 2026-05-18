# Goal: `yentl-compliance-foundation` — operator manual (NARROWED)

**Updated 2026-05-18**: this goal was originally 28 clauses across 7 groups. To compress wall-clock from 14 days to ~5-7, it was **split into 5 parallel sub-goals**; this umbrella now retains only **Group A (consent UX extensions)** and **Group G (integration check + rollups)**.

## Sibling sub-goals (run in parallel — each on own routine pair)

| Sub-goal | Group | Clauses | Budget | Branch |
|---|---|---|---|---|
| `yentl-compliance-ai-transparency` | B | 3 | $15 / 3d | `goals/yentl-compliance-ai-transparency` |
| `yentl-compliance-a11y` | C | 7 | $40 / 7d | `goals/yentl-compliance-a11y` |
| `yentl-compliance-trust-pages` | D | 8 | $50 / 7d | `goals/yentl-compliance-trust-pages` |
| `yentl-compliance-verdict-scaffold` | E | 3 | $15 / 3d | `goals/yentl-compliance-verdict-scaffold` |
| `yentl-compliance-docs` | F | 4 | $20 / 5d | `goals/yentl-compliance-docs` |
| **`yentl-compliance-foundation`** (this) | A + G | 8 | $30 / 7d | `goals/yentl-compliance-foundation` |

Total compliance portfolio: 33 clauses, ~$170 max, ~7 days wall-clock (limited by the slowest sub-goal).

## This umbrella's scope

- Group A: Pause>End hierarchy fix, SessionTimer 30-min toast, TwoPartyDisclosure banner, AudioRouteDisclosure popover
- Group G: integration check (verifies all 5 sub-goals report Status: done), CHANGELOG rollup, README Compliance & Trust section

The integration check (clause 5) is GATED — this goal cannot complete until all 5 sub-goals are done.

## Cadence (unchanged from original)

- Worker: `37 */2 * * *` UTC (every 2 hours at :37)
- Watchdog: `43 13 * * *` UTC (9:43 AM EDT daily)

## Budget (narrowed)

- Max cost: $30, max runs: 15, max days: 7, per-run cap: $3

## Quick reference

| Action | How |
|---|---|
| Check progress | `cat STATE.md` on `goals/yentl-compliance-foundation` branch |
| Cross-check sub-goals | for each sub-goal: `git show origin/goals/<slug>:.goals/<slug>/STATE.md \| head` |
| Kill umbrella | `echo STOP > alerts.md` + push to its branch |
| Kill ALL compliance work | drop STOP on each of the 6 compliance goals' alerts.md |

## If sub-goals stall but umbrella keeps firing

The umbrella worker will keep firing every 2h and finding sub-goals not yet done. It does Groups A clauses (1-4) once and then will sit at "waiting on sub-goals" for clauses 5-7. That's expected. The watchdog won't flag this as a stall as long as the sub-goals are themselves making progress. If sub-goals stall AND umbrella is also stuck waiting → escalate.

## Original ACTIVATION.md no longer fully accurate

The original ACTIVATION.md was written before the split. Steps for activating the umbrella are still valid; ignore the 28-clause references. Sub-goals each have their own scaffold (no ACTIVATION.md by design — activation was done in the same turn as scaffolding).
