# Goal: Yentl Loop Watchdog

Status: scaffolded
Owner: Israel B. Bitton
Created: 2026-06-07

## Objective

Audit the Yentl automation loops. The watchdog does not build product features. It checks whether loops are staying useful, scoped, current, and safe.

## End Condition Per Run

A run is complete when all are true:

- `STATE.md` is updated.
- A timestamped watchdog report exists in `evidence/`.
- Each active loop is marked PASS, WARN, or STOP.
- Any STOP condition is written to that loop's `alerts.md` and this loop's `alerts.md`.

## Checks

- State updated recently enough for the configured cadence.
- Reports are evidence-backed, not vague status.
- No loop edited outside its allowed write scope.
- No repeated blocker has persisted for three consecutive runs without escalation.
- No issue ledger row is duplicated instead of updated.
- No build ledger row is duplicated instead of updated.
- No `fixed_pending_verify` row stays unverified for more than two audit cycles.
- No `built_pending_verify` row stays unverified for more than two audit cycles.
- No loop claims launch/mobile/speaker-attribution readiness without proof.
- No loop is drifting away from its GOAL.
- Verification failures are surfaced instead of hidden.
- Loop-contract edits are either recorded in `change-control.md` or treated as STOP.
- Older `manual-*last-message*` notes do not override newer `STATE.md`, `issue-ledger.md`, `build-ledger.md`, or `change-control.md` entries.
