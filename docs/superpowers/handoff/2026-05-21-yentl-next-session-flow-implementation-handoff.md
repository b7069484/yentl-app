# Yentl next-session handoff - complete flow atlas and screen-state spec

Date: 2026-05-21
Workspace: `/Users/israelbitton/Live FactCheck`
Start URL: `http://localhost:3000/project/flows`

## One-sentence state

The flow atlas is now being converted from a loose screenshot map into a truthful product-state inventory: each screenshot node must be current, reference-only, stale/failure, or missing, and the next session should replace the missing/stale states with exact target screens until every user action and overlay is represented.

## User feedback to preserve

The user wants the A-to-Z flow to answer:

- I click here, what do I see next?
- I scroll, what is below?
- I open this dropdown/menu/modal, what exactly appears?
- I choose this media type, what state happens before, during, after, and on failure?
- Is this screenshot current and representative, or is it old/missing?

The user specifically rejected bare utility screens. A one-field URL entry page is not acceptable just because the task is simple. Every screen must feel like part of the same designed experience.

## What was updated in this pass

Files:

- `components/session/az-flow-dashboard.tsx`
- `tests/ux-flow-dashboard.test.tsx`
- `docs/superpowers/plans/2026-05-21-yentl-complete-flow-screen-state-plan.md`
- `docs/superpowers/specs/2026-05-21-yentl-complete-flow-spec.md`
- `docs/superpowers/handoff/2026-05-21-yentl-next-session-flow-implementation-handoff.md`

## Continuation update - P0 atlas inventory expansion

The A-to-Z atlas has been expanded from the first-wave screenshot map into a 91-node screen-state inventory in `components/session/az-flow-dashboard.tsx`.

New first-class nodes now cover:

- Public/account branches: promo section anchors, trust/method/pricing, auth recovery, guest/live demo.
- Source branches: selected previews, unavailable/platform limits, mobile share/import.
- YouTube granularity: valid URL preview, invalid URL, metadata, caption fetch, transcript build, claim extraction, verification/source search, playback blocked, wrong video/edit URL.
- Extension branches: install/options, popup, same-page panel, page text capture, audio permission, active meter, no-audio recovery, transcript/claims/markers tabs, highlight detail, export menu, full workspace snapshot, future live sync.
- Mic branches: consent, browser permission, listening meter, silence/no audio, live transcript, live claim hit, live marker hit, pause/resume/end, speaker correction.
- Upload/media/document branches: drag hover, selected file, upload/transcode/transcribe, unsupported file, direct URL entry, media detected, remote fetch blocked, paste text, text URL import, PDF upload/OCR, document outline, in-document claim anchor, source/citation drawer.
- Core/depth/durable surfaces: Overview, transcript search/follow, claims list, markers list, Yentl Opinion, speaker reassign menu, source detail, Devil's Advocate, save dialog, export modal, report preview, end dialog, empty/saved library, clear-all confirmation.

Every added node carries screenshot status, screenshot notes, missing state checklists, user job, screen job, desktop target, mobile target, and review anchor text. A local collision check reports 91 unique nodes and zero overlapping cards.

`tests/ux-flow-dashboard.test.tsx` now asserts the expanded atlas coverage, including Devil's Advocate, Yentl Opinion, source/citation drawers, extension export, mobile share/import, and durable-record dialogs.

## Continuation update - first rendered target UI actuals

The flow atlas now supports a separate rendered target UI layer in `components/session/az-flow-dashboard.tsx`.

The screenshot status remains truthful (`current`, `reference`, `stale`, or `missing`), but nodes with a first-pass target screen now show a distinct `Target UI` badge and open a rendered review surface in the full-screen modal. Point comments still work on these target surfaces.

First batch with rendered target UI:

- Public/account: promo section anchors, trust/method/pricing, sign in/sign up, auth recovery, guest/live demo.
- Source entry: default source choice, selected source preview, unavailable/platform-limit state, mobile share/import.
- YouTube: URL entry, preview shell, valid URL preview, invalid URL, link resolving, metadata, caption fetch, transcript build, claim extraction, verification/source search, video ready, caption fallback, playback blocked, wrong video/edit URL.

These are still target actuals inside the flow dashboard, not a claim that production routes are fully wired. Next batches should add rendered target UI for extension tabs/menus, mic states, upload/media/document states, core review, Devil's Advocate, Yentl Opinion, marker learning, and export/library dialogs.

New or refreshed screenshot assets:

- `public/visual-evidence/flow-screenshots/current/promo-product-page.png`
- `public/visual-evidence/flow-screenshots/current/youtube-url-entry.png`
- `public/visual-evidence/flow-screenshots/current/youtube-processing-overview.png`
- `public/visual-evidence/flow-screenshots/current/youtube-player-ready.png`
- `public/visual-evidence/flow-screenshots/current/youtube-live-analysis.png`
- `public/visual-evidence/flow-screenshots/current/youtube-no-captions.png`

Dashboard changes:

- Added screenshot-status metadata to every A-to-Z node.
- Added visible status badges on thumbnails and selected-node detail.
- Added missing-state checklists per node.
- Expanded the YouTube branch into:
  - `YouTube URL Entry`
  - `YouTube Preview Shell`
  - `Link Resolving`
  - `Video Ready`
  - `Essential Video Review`
  - `Caption Fallback`
- Added full-length screenshot review mode and fit-screen toggle.
- Preserved point-comment create/edit/remove/save behavior.

## Current screenshot audit

Use this as the starting triage list.

Current or near-current:

- Source picker: reference capture, still needs final job-based states.
- Promo product page: richer prior implementation capture, not yet current app route.
- Media URL success: rendered proof, but entry/progress/error states are missing.

Reference-only:

- Extension article/page preview.
- YouTube loaded/ready/watch states.
- Mic proof state.
- Text/document proof state.
- Library state.

Stale/failure captures kept intentionally:

- YouTube URL Entry: shows the bare-field failure.
- Audio upload: old upload pane.
- Claim detail: old detail surface lacking visual evidence and Devil's Advocate.

Missing targets:

- Sign in / sign up flow.
- YouTube Preview Shell target.
- Audio-only essential review.
- Marker learning/detail screen.
- Many mobile variants.
- Most dropdowns, modals, menus, and overlays.

## Next-session priority

P0: Make the inventory complete enough to guide design work.

- Add remaining nodes for every core branch listed in the spec.
- Make every node carry status and missing states.
- Add nodes for all known modals/dropdowns:
  - save dialog
  - export modal
  - end dialog
  - source switch
  - speaker reassign menu
  - claim/source detail drawers
  - marker detail popovers
  - extension export menu
  - extension options

P1: Replace the worst stale/missing screenshots with target captures.

- YouTube URL entry target shell.
- Auth screens.
- Mic live visualizer and pre-consent state.
- Audio-only review.
- Claim detail with validated thumbnails and no-thumbnail fallback.
- Marker learning with taxonomy icon.
- Extension installed proof states.
- Mobile variants for source, YouTube, watch, claims, markers, and library.

P2: Convert target screens into implementation tasks.

- Source-card validated-thumbnail metadata.
- Marker asset metadata keyed by taxonomy `canonical_id`.
- Claim status semantics with no final `Unverifiable` verdict.
- Yentl Opinion live summary and good-faith/bad-faith meta-read.
- Devil's Advocate placement and persistence.
- Gamified transcript hit effects with reduced-motion handling.

## Important product constraints

Do not use generated art as evidence. Generated visuals are allowed for marker education, not source thumbnails.

No final user verdict should be "unverifiable." Use a result vocabulary that distinguishes truth, contradiction, mixed/caveated, no valid backing found, still checking, and genuinely unknown.

Mobile capture must be platform-honest. Chrome extension same-page capture is a desktop/browser launch path; iOS/Android should use share sheet, file import, microphone, URLs, and documents.

The A-to-Z map is not a gallery. It is a branch graph with exact state transitions.

## Reports to re-open first

- `docs/superpowers/plans/2026-05-21-yentl-complete-flow-screen-state-plan.md`
- `docs/superpowers/specs/2026-05-21-yentl-complete-flow-spec.md`
- `docs/superpowers/handoff/2026-05-20-worldclass-ux-committee-audit-pickup.md`
- `docs/superpowers/handoff/2026-05-21-yentl-extension-panel-workspace-export-handoff.md`
- `docs/superpowers/validation/2026-05-20-source-validation-proof.md`
- `docs/superpowers/visual-evidence/marker-asset-production.md`
- `.project/review-comments/yentl-flow-review-latest.json`

## Continuation update - extension target hierarchy cleanup

After reviewing the latest committee reports, the interrupted extension target work in `components/session/az-flow-dashboard.tsx` was completed around the committee-backed hierarchy:

- one compact source/capture strip at the top of the panel
- `Yentl's Read` directly under that strip, with first summary lines and an expand affordance
- persistent signal board: claim risk, rhetoric heat, evidence state, and new finding pulse
- tabs for Transcript, Claims, and Markers
- diagnostics only inside contextual failure states, such as no audio detected
- source preview remains dominant and side-by-side with the panel in the target review frame

The rebuilt target covers the Chrome extension atlas states, including setup, popup, same-page panel, page text, audio permission, audio meter, no-audio recovery, transcript/claims/markers tabs, highlight detail, export, full workspace handoff, and future live sync. Browser verification on `/project/flows` opened the Extension Claims Tab target and found no horizontal overflow/right-edge clipping in the target frame.

## Validation commands

Run after dashboard/doc changes:

```bash
npx vitest run tests/ux-flow-dashboard.test.tsx
npx tsc --noEmit
npm run lint
npm run build
```

If implementation work touches source previews, markers, or claim status semantics, add:

```bash
npx vitest run tests/og-fetch.test.ts tests/marker-assets.test.ts tests/api/corpus-sample.test.ts
```

## Acceptance definition for the next session

The next session should be considered successful when:

1. `/project/flows` clearly distinguishes final/current screens from stale/reference/missing targets.
2. The YouTube branch no longer skips states.
3. At least the public/account, source picker, YouTube, extension, mic, upload, document, core review, claim detail, marker detail, export, and library branches have full screen-state inventories.
4. The worst stale screenshot nodes have replacement target captures or explicit "missing target" labels.
5. All point-comment review behavior works on full-length screenshots.
6. Tests, typecheck, lint, and build pass.
