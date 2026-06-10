# Goal: Yentl UI And Mobile Audit

Status: pilot
Owner: Israel B. Bitton
Created: 2026-06-07

## Objective

Continuously audit Yentl's user-facing surfaces across desktop and mobile web so the app converges toward a truthful, polished launch experience.

The loop starts audit-only. It may not change product code during the pilot unless its guardrails are explicitly updated later.

## Product Surfaces

Minimum surfaces per audit:

- `/`
- `/pricing`
- `/faq`
- `/demo`
- `/session`
- `/sessions`
- `/project/flows`
- `/about`
- `/methodology`
- `/privacy`
- `/terms`
- `/subprocessors`
- `/accessibility`
- `/contact`

Session-specific surfaces to inspect when feasible:

- source picker
- YouTube preview/import state
- text import state
- browser-tab unavailable/mobile state
- transcript/claims/markers/watch views when validation demo state is available
- save/export/report preview affordances

## End Condition Per Run

A run is complete when all are true:

- `STATE.md` is updated.
- A timestamped audit report exists in `evidence/`.
- `agent-work/loops/issue-ledger.md` is updated for every new, recurring, verified-fixed, or escalated finding.
- The report covers desktop and mobile risks separately.
- The report distinguishes verified UI behavior from code-read inference.
- No product code was edited during the pilot.
- Any launch-critical issue is written to `alerts.md`.

## Audit Criteria

- Mobile web does not imply Chrome extension or arbitrary other-app capture.
- Text fits in its containers at mobile widths.
- Touch targets are at least 44px where practical.
- Source pathways have honest unavailable/error/recovery states.
- Public copy matches actual runtime behavior.
- Internal validation language does not leak into public-facing flows.
- Browser-tab capture is described as desktop Chrome extension first, not universal mobile behavior.
- Reports avoid claiming iOS/Android readiness unless verified through an actual device/cloud-device plan.

## Anti-Repeat Rules

- Before adding a finding, search the ledger for the same route/component/symptom.
- If it exists and is still present, update `Last Seen`, increment `Recurrences`, and do not create a duplicate.
- If it was `fixed_pending_verify` and is still present, set `reopened`.
- If it was `fixed_pending_verify` and is gone, set `verified_fixed`.
- Mark a non-legal issue `ready_for_fix` only if the likely file scope is narrow and verification is clear.
- Privacy, legal, terms, subprocessors, and other human-approval-gated public claims must be marked `blocked_needs_context` unless Israel has explicitly approved the edit or a dedicated legal-copy lane owns it.
