# Goal: `yentl-compliance-docs` — operator manual

Split off from `yentl-compliance-foundation` Group F on 2026-05-18.

## Scope

The three compliance reference documents that must exist before public launch:
- **Accessibility statement** (required by European Accessibility Act)
- **DPIA** documented per EDPB April 2026 template (required by GDPR Art. 35 — Yentl hits 3 high-risk triggers)
- **Engagement-gate policy spec** (the rules that prevent Top Risk #1 — defamation against identifiable private figures)

## Cadence

- Worker: `47 * * * *` UTC (hourly at :47)
- Watchdog: `48 14 * * *` UTC (10:48 AM EDT daily)

## Budget

- Max cost: $20, max runs: 10, max days: 5, per-run cap: $3

## Important

Engagement-gate is **policy spec only** — the runtime implementation (Haiku-based classifier) lives in the fact-check pipeline goal. This goal documents the rules; the other goal implements them.
