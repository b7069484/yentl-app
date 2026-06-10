# Goal: Yentl UI And Mobile Fix Round

Status: pilot
Owner: Israel B. Bitton
Created: 2026-06-07

## Objective

Fix exactly one ledger-approved UI/mobile issue per run, then verify it. This loop exists so audit findings become closed issues instead of recurring complaints.

## Selection Rules

The loop may work only on a row in `agent-work/loops/issue-ledger.md` with status `ready_for_fix`.

Pick the highest-severity eligible issue where:

- the affected files are under `app/`, `components/`, or `lib/client/`
- the likely fix touches no more than three product files
- the verification command or visual check is clear
- no human approval gate is involved

If no issue qualifies, write a no-op report and stop.

## End Condition Per Run

A run is complete when all are true:

- At most one ledger issue was selected.
- Product edits, if any, are limited to the selected issue.
- `STATE.md` is updated.
- A timestamped report exists in `evidence/`.
- The selected ledger row is updated to `fixed_pending_verify`, `blocked_needs_context`, `blocked_needs_verification`, or `escalated`.
- The report lists exact files changed and verification commands run.

## Never Fix In This Loop

- Legal/privacy/terms/subprocessors claims
- API security, consent, capture, diarization, auth, billing, or deployment behavior
- Native iOS/Android implementation
- Broad redesigns spanning multiple product areas
- Anything that requires new dependencies or secrets
