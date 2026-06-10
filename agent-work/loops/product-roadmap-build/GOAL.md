# Goal: Yentl Product Roadmap Build

Status: pilot
Owner: Israel B. Bitton
Created: 2026-06-07

## Objective

Build one accepted Yentl roadmap slice per run from the existing plans, with proof. This loop is for missing product capability, not visual cleanup.

## Selection Rules

The loop may work only on a row in `agent-work/loops/build-ledger.md` where:

- `Status` is `ready_for_build`
- `Lane` is `product-roadmap-build`
- the source plan is named
- verification is explicit

If no row qualifies, write a no-op report and stop.

## Preferred Source Plans

- `docs/superpowers/plans/2026-05-28-yentl-launch-foundation-phase-1a.md`
- `docs/superpowers/plans/2026-05-28-speaker-attribution-conversation-intelligence-plan.md`
- `docs/superpowers/specs/2026-05-28-speaker-attribution-conversation-intelligence-spec.md`
- `docs/superpowers/validation/2026-05-26-external-launch-proof-checklist.md`

## End Condition Per Run

- At most one product roadmap row was selected.
- Product edits are limited to the selected slice.
- `STATE.md` is updated.
- A timestamped report exists in `evidence/`.
- `build-ledger.md` is updated.
- Verification evidence is recorded.

## Human Gates

Stop before changing:

- production diarization/capture/consent semantics
- billing, auth, deployment, or data persistence
- legal/privacy route claims
- broad product architecture beyond the selected row
