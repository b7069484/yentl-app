# Yentl Committee Report - UI, Visual Design, Accessibility, and Mobile Ergonomics

    **Committee member:** Bezalel Navon  
    **Remit:** UI craft, visual hierarchy, responsive layout, WCAG 2.2 AA, mobile ergonomics, extension panel surfaces.  
    **Why this name:** Bezalel is the Jewish master-craftsperson figure; Navon means discerning. This seat is about making a complex trust system visible and coherent.  
    **Date:** 2026-05-21  
    **Workspace:** `/Users/israelbitton/Live FactCheck`


## Evidence Inspected

- Existing reports: `Agent Reports/agent_UI_2026-05-21_17-50-01_EDT.md`, `agent_UX_2026-05-21_17-54-26_EDT.md`, `agent_flow_2026-05-21_18-02-36_EDT.md`, `agent_reports_synthesis_2026-05-21.md`.
- UI source: `components/session/source-picker.tsx`, `components/session/session-shell.tsx`, `components/session/watch-view.tsx`, `components/session/activity-feed.tsx`, `components/session/TranscriptView.tsx`, `components/session/extension-panel-view.tsx`, `components/session/ingest-panes/audio-ingest-pane.tsx`, `components/session/ingest-panes/media-url-ingest-pane.tsx`, `components/ui/button.tsx`, `app/accessibility/page.tsx`.
- Routes and visual states: `/`, `/session`, `/session?sample=cable_008&view=watch`, `/session?surface=extension-panel&source=browser-tab&demo=validation`, `/sessions`, `/signin`, `/signup`, `/project/flows`, `/project/validation`, and `public/visual-evidence/flow-screenshots/current/`.

## Current Strengths

Yentl already has a distinctive visual vocabulary: warm paper, ink, teal/amber risk accents, a serif wordmark, and a calm investigative tone. It does not look like a generic AI wrapper. The source picker correctly treats browser-tab capture as the premium path, and the YouTube pane shows the strongest existing intake pattern: URL validation, preview, processing feedback, fallback state, and a destination into Watch.

The Watch view and extension panel are the right product shape. They keep source media, transcript, claims, markers, and evidence in the same mental workspace. That is far stronger than a separated transcript dashboard because Yentl's value depends on preserving source context.

There are real accessibility seeds: skip link, aria-live transcript handling, claims live region, visible focus-ring tokens, reduced-motion intent, and a design system button component. These are not enough for launch, but they are good bones.

## Severe Gaps

The first visible trust breaker is CTA legibility. Audio and Media URL primary buttons use `bg-ink text-bg`; the prior rendered audits found these buttons effectively blank/dark. A conversion button that cannot be read makes the app feel fragile exactly when the user is trying to trust it.

Auth is a second trust break. `app/layout.tsx` skips `ClerkProvider` when the Clerk key is missing, while `app/signin/[[...rest]]/page.tsx` and `app/signup/[[...rest]]/page.tsx` still render Clerk components. That produces blank/broken auth routes in common local states and makes the product look half-wired.

The active session shell is not mobile-native. It compresses a desktop header into a small viewport: brand/status, horizontally scrolling tabs, horizontally scrolling controls, and speaker rail. Controls often use small button sizes, while the accessibility page claims target sizes that the rendered app does not actually meet.

Claim counts contradict each other. The session nav filters out `checking` claims, while Watch counts all claims. Users can therefore see a claim in Watch while the nav says `Claims 0`. That is a comprehension bug, not a minor count mismatch.

The accessibility statement overclaims. It says all targets are 44x44, but small buttons and close controls do not consistently meet that. This is risky because Yentl is a trust product; overstated accessibility copy damages confidence.

## Recommendations

1. Fix visible blockers first: unreadable CTAs, broken auth fallback, claim-count vocabulary, and accessibility overclaims.
2. Redesign the mobile active session shell as a dedicated mobile product surface, not a squeezed desktop header. Use one compact status region, one persistent primary insight strip, and a touch-safe tab/control system.
3. Add a persistent signal board in Watch and extension: live state, verdict mix, rhetoric heat, evidence confidence, and pending checks.
4. Promote the YouTube pane pattern into Audio, Text, Media URL, and Browser Tab: preview/status, consent/privacy, progress ladder, recovery routes, and a concrete next destination.
5. Replace broad first-run disclosure with source-specific consent gates. Text paste does not need the same treatment as microphone, tab capture, or upload.
6. Regenerate visual evidence after UI fixes and treat `/project/flows` as a spec/status surface, not proof that every target state is live.

## Launch Blockers

Do not launch public preview until these are fixed: unreadable ingest CTAs; auth fallback; mobile session crowding; claim-count contradiction; accessibility statement mismatch; source-specific hard consent; internal validation language leaking into end-user flows.

## Metrics And Tests

Add Playwright visual regression for desktop and mobile across `/`, all six ingest panes, Watch, Overview, Claims, Markers, extension panel, and dialogs. Add computed-style tests for CTA contrast, no-horizontal-overflow tests for mobile shell and extension panel, bounding-box touch target tests on rendered app controls, axe-core route coverage, VoiceOver manual review, and contract tests for claim lifecycle counts across Watch/nav/Overview/Claims.
