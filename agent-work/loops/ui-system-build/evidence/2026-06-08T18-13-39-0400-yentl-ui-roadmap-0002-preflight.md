# YENTL-UI-ROADMAP-0002 Preflight

Timestamp: 2026-06-08T18:13:39-04:00

## Scope

Preflighted the queued immediate-wave UI-system row before the scheduled 7:20 PM worker.

No product UI files or tests were changed in this preflight.

## Findings

- `YENTL-UI-ROADMAP-0002` is still the only `ready_for_build` row assigned to `ui-system-build`.
- `components/session/ClaimCard.tsx` renders verdict, status, topic, speaker, score, explanation, annotations, and sources, but it does not yet render `card.stance` or `card.ownership`.
- `components/session/claim-row.tsx` renders speaker, timestamp, topic, verdict, score, claim text, and source stance summary, but it does not yet render `claim.stance` or `claim.ownership`.
- The required data already exists in `lib/types.ts`:
  - `ClaimCard.stance?: ClaimStance`
  - `ClaimCard.ownership?: ClaimOwnership`
  - `ClaimStance`: `asserted`, `denied`, `quoted`, `reported`, `mocked`, `questioned`, `corrected`, `hedged`, `unclear`
  - `ClaimOwnership.attribution_status`, `attribution_reasons`, `owner_speaker_id`, `confidence`, `source_turn_ids`, and `source_segment_ids`

## Scheduled Worker Target

The scheduled UI worker should make a compact, non-legal visual surface for ownership context:

- In `ClaimCard.tsx`, add a small ownership/stance row or pill group near the existing speaker/topic badges.
- In `claim-row.tsx`, add the same compact context in the speaker row or immediately under it.
- Prefer human labels such as `Asserted`, `Reported`, `Quoted`, `Denied`, `Questioned`, `Hedged`, `Unclear`, and attribution labels such as `Confident owner`, `Uncertain owner`, `Unsafe overlap`, `Quote or clip`, or `No attribution`.
- Do not claim legal responsibility or attribution accuracy; this is UI context for how the claim is held and attributed.
- Keep the change compact enough for dense claim lists and mobile wrapping.

## Verification Target

Add a focused component test if practical, for example `tests/claim-card-ownership.test.tsx`, that renders:

- a reported/uncertain claim in `ClaimCard`
- a denied or quoted claim in `ClaimRow`
- no ownership row for a legacy claim without `stance` or `ownership`

Then run the focused claim UI test plus relevant session/claim UI tests, `npx tsc --noEmit`, and `npm run build` if product files change.
