# Miriam flow atlas coverage audit

Date: 2026-05-21
Workspace: `/Users/israelbitton/Live FactCheck`
Route checked: `http://localhost:3000/project/flows`

## Directive

Miriam was marked `ready` in the tracker workbook. The directive was to start from the launch brief, create only the deliverable folder, and report via reporting-inbox/status-row. No workbook blocker was listed.

## Scope Compliance

Stayed inside the Miriam write scope:

- `components/session/az-flow-dashboard.tsx`
- `tests/ux-flow-dashboard.test.tsx`
- `docs/superpowers/plans/2026-05-21-yentl-complete-flow-screen-state-plan.md`
- `docs/superpowers/specs/2026-05-21-yentl-complete-flow-spec.md`
- `agent-work/miriam-flow-atlas/`
- `agent-work/reporting-inbox/`

No source intake components, extension files, security/API routes, marker assets, git branch operations, staging, commits, or pushes were changed.

## Coverage Result

The A-to-Z atlas now has 99 unique nodes.

Screenshot status counts:

- Current capture: 3
- Reference only: 36
- Stale / failure capture: 3
- Target missing: 57

Mechanical graph check:

- Duplicate node ids: none
- Broken child links: none
- Card overlaps: none

## Nodes Added

- `Post-Auth Redirect`: makes the auth return state explicit instead of hiding it inside sign-in notes.
- `Claim-Only Quick Check`: adds the missing source path named in the plan for checking one factual assertion without media/document ingest.
- `Claim-Only Verification`: separates standalone claim source search, result vocabulary, evidence quality, and Devil's Advocate from generic claim detail.
- `Validated Source Thumbnail`: makes source-provided thumbnail proof first-class.
- `No-Thumbnail Fallback`: makes the designed fallback explicit so missing images are not replaced with generated art.
- `Claim Source Gallery`: tracks claim-detail source comparison with validated-thumbnail/no-thumbnail variants.
- `Marker Icon States`: tracks chip, row, detail, and learning-card icon states for the taxonomy.
- `Archetype Motion / Reduced Motion`: tracks motion loops and `prefers-reduced-motion` fallback as product states.

## Nodes Reclassified

- `Source Choice`: reclassified from `reference` to `current` because it is a current source-picker capture, while missing states still track selected/hover/mobile/claim-only/source-switch work.
- `Media URL`: reclassified from `reference` to `current` because it is a current successful direct-media proof, while entry/progress/error states remain missing.
- `Media Detected`: reclassified from `reference` to `current` for the same current direct-media proof, while the pre-analysis detected-media state remains missing.

## Spec and Plan Updates

- Added the claim-only quick-check inventory to the flow plan.
- Added a claim-only quick-check section to the flow spec with entry, context, source search, result-vocabulary, Devil's Advocate, save/export, and mobile states.

## Point Comments

Point-comment behavior was preserved. The targeted test still covers opening the full-length screenshot modal, adding a point, editing it, removing it, and seeing the empty state return.

## Rendered Evidence

- Browser proof screenshot: `agent-work/miriam-flow-atlas/project-flows-az-flow.jpg`
- Existing review comment file checked: `.project/review-comments/yentl-flow-review-latest.json`

## Checks Run

- `npx vitest run tests/ux-flow-dashboard.test.tsx` - passed, 7 tests.
- `npx tsc --noEmit` - passed.
- Browser check opened `http://localhost:3000/project/flows`, clicked the A-to-Z tab, verified the new node/status text, and saved the screenshot above.

## Remaining Gaps

- Most target captures are still intentionally marked `missing`, especially auth, claim-only, visual-evidence, extension tab variants, mic states, upload/media progress, document overlays, and export/report states.
- The public promo screenshot is full-length, but the atlas still needs separate section-anchor captures and current-route integration.
- Source switch during an active session is still tracked as a missing state, not yet a first-class node, because the implementation route/dialog is not captured.
- The target UI renderer covers public/account/source/YouTube nodes only; extension, mic, upload, document, core review, visual-evidence, export, and claim-only target actuals remain future batches.
