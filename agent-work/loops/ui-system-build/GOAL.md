# Goal: Yentl UI System Build

Status: pilot
Owner: Israel B. Bitton
Created: 2026-06-07

## Objective

Improve Yentl's UI consistency one narrow slice at a time: shared components, spacing, route chrome, visual hierarchy, empty states, button patterns, tabs, and session presentation.

This loop builds. It is not an audit-only loop. It must still use the build ledger and verification before changing files.

## Selection Rules

The loop may work only on a row in `agent-work/loops/build-ledger.md` where:

- `Status` is `ready_for_build`
- `Lane` is `ui-system-build`
- the slice is narrow enough for one run

If no row qualifies, write a no-op report and stop.

## End Condition Per Run

- At most one build-ledger row was selected.
- Product edits are limited to the selected slice.
- `STATE.md` is updated.
- A timestamped report exists in `evidence/`.
- `build-ledger.md` is updated.
- Verification evidence is recorded.

## Scope

Allowed product areas:

- `components/ui/**`
- `components/session/**`
- public route chrome in `app/*/page.tsx`
- `lib/client/**` only if needed for display selectors or UI state

Disallowed:

- API behavior
- auth, billing, consent, capture, diarization, deployment, or database logic
- legal/privacy/terms/subprocessors claim edits
- native mobile app claims
- broad redesigns across more than one product area
