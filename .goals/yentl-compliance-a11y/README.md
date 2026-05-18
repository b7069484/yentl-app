# Goal: `yentl-compliance-a11y` — operator manual

Split off from `yentl-compliance-foundation` Group C on 2026-05-18.

## Scope

WCAG 2.2 AA baseline + a11y audit gate. Mandatory before public launch per European Accessibility Act (in force June 28, 2025 — penalty €100k per violation per Member State) and de-facto ADA Title III bar.

7 clauses (Group C from original umbrella, renumbered).

## Cadence

- Worker: `13 * * * *` UTC (hourly at :13)
- Watchdog: `33 14 * * *` UTC (10:33 AM EDT daily)

## Budget

- Max cost: $40, max runs: 20, max days: 7, per-run cap: $5

## Quick reference

| Action | How |
|---|---|
| Check progress | `cat STATE.md` on `goals/yentl-compliance-a11y` branch |
| Audit | `tail -50 decisions.log` |
| Kill switch | `echo STOP > alerts.md` on that branch + commit/push |

## Notes specific to this sub-goal

- Installs `@axe-core/cli` as devDependency — pre-approved in guardrails
- Adds `scripts/run-a11y-audit.sh` for repeatable axe + Lighthouse runs
- May extend `.github/workflows/ci.yml` (added by hardening-pass) with an a11y step. If hardening hasn't created CI yet, creates a minimal stub.
- Coordinates with sibling `yentl-compliance-ai-transparency` if its components need a11y review
