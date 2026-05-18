# Goal: `yentl-compliance-verdict-scaffold` — operator manual

Split off from `yentl-compliance-foundation` Group E on 2026-05-18.

## Scope

Verdict + report infrastructure SCAFFOLD (UI components only — data wiring belongs to the fact-check pipeline goal):
- `<ReportVerdictButton>` + `<ReportFlow>` — DSA Art. 16 + Apple 4.7.1 chatbot moderation + Play AI-Generated Content in-app reporting
- `<VerdictCard>` triple-encoded (color + icon + text) — WCAG 1.4.1 + research §4 verdict vocabulary

## Cadence

- Worker: `33 * * * *` UTC (hourly at :33)
- Watchdog: `43 14 * * *` UTC (10:43 AM EDT daily)

## Budget

- Max cost: $15, max runs: 8, max days: 3, per-run cap: $3

## NOT in scope

- **Data wiring** (verdict cards receiving real data from /api/verify-*) → fact-check pipeline goal (Tasks 12-26)
- **MarkerChip + MarkerExplanationDrawer** → also fact-check goal (tightly coupled to live data)
- Backend for ReportFlow submissions → v2 (this goal persists to localStorage)
