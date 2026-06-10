# Goal: Yentl Mobile UI Build

Status: pilot
Owner: Israel B. Bitton
Created: 2026-06-07

## Objective

Improve Yentl's mobile-web experience one narrow slice at a time. This loop owns mobile ergonomics and platform truth, not native iOS/Android implementation.

## Selection Rules

The loop may work only on a row in `agent-work/loops/build-ledger.md` where:

- `Status` is `ready_for_build`
- `Lane` is `mobile-ui-build`

If no row qualifies, write a no-op report and stop.

## Build Targets

- mobile source ordering
- browser-tab unavailable states on mobile
- touch target size and spacing
- transcript readability
- mobile session navigation
- export/share affordance clarity
- text overflow and occlusion fixes at 390px class widths

## End Condition Per Run

- At most one mobile build row was selected.
- Product edits are limited to the selected mobile slice.
- `STATE.md` is updated.
- A timestamped report exists in `evidence/`.
- `build-ledger.md` is updated.
- Verification evidence is recorded.

## Disallowed

- Native iOS/Android claims or implementation
- Capture policy changes
- API/security/auth/billing/consent/diarization changes
- Legal claim edits
