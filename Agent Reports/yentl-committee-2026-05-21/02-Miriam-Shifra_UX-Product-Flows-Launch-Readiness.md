# Yentl Committee Report - UX, Product Flows, Session State, and Launch Sequencing

    **Committee member:** Miriam Shifra  
    **Remit:** Product UX architecture, onboarding, session-state design, trust UX, roadmap sequencing, launch readiness.  
    **Why this name:** Miriam evokes guidance through a crossing; Shifra adds a care lens. This seat guides users from source choice into a trustworthy session without losing context or consent.  
    **Date:** 2026-05-21  
    **Workspace:** `/Users/israelbitton/Live FactCheck`


## Evidence Inspected

- `app/session/page.tsx`, `components/session/session-shell.tsx`, `lib/client/session-store.ts`, `lib/client/orchestrator.ts`.
- `docs/superpowers/specs/2026-05-21-yentl-complete-flow-spec.md`, `docs/superpowers/plans/2026-05-21-yentl-complete-flow-screen-state-plan.md`, `components/session/az-flow-dashboard.tsx`.
- Prior reports: flow, UX, security, study, writer, and synthesis.

## Current Strengths

Yentl's product center of gravity is right: the user starts with media/text, then moves into an evidence workspace. `/session` correctly withholds session chrome until there is an active or restored session, avoiding the common mistake of showing final workspace tabs before a user has a source.

The source breadth is real: browser tab, mic, audio upload, text, YouTube, and media URL. The YouTube pane is the strongest pattern because it gives a preview, explains work in progress, handles caption failure, and routes to Watch. The extension panel is the strongest strategic direction because it allows Yentl to live beside the actual page.

The flow atlas is unusually valuable. It already names missing states that most teams forget: auth recovery, platform limits, permission denied, no captions, export variants, save state, library empty/saved/clear-all, extension denied/no-audio, mobile alternatives, and pricing/FAQ gaps.

## Severe Gaps

The biggest UX issue is product truth alignment. Privacy says no accounts, no server-side histories, and no persistent audio/transcripts, while the app has signin/signup routes, local saved sessions, upload APIs, Blob usage, and a session library. This mismatch must be resolved before the user journey can feel trustworthy.

Consent and engagement gating are not runtime products yet. The banner is dismissible localStorage UX, while methodology describes an engagement gate that is still a policy document. A user can reasonably believe Yentl is enforcing protections that are not actually enforced.

Security blocks the UX from launching. Middleware protects `/session` and `/account`, not cost-bearing APIs. Upload code explicitly says anonymous uploads. A beautiful flow that can be abused or spend money anonymously is not ready.

Session intelligence is not yet equal to the product promise. Bulk ingest appends all transcript segments before analysis, which creates future-context risk for replayed sessions. Users may see analysis that looks live but had more context than a true live system would have.

The current public page does not yet do the acquisition job. The flow atlas says it needs hero, proof, five ways in, method, trust/privacy, pricing, FAQ. The live page is still much closer to a polished launch splash.

## Recommendations

1. Product truth and trust pass: decide account/no-account, local/server storage, retention, pricing/cost controls, and exactly what public claims Yentl is allowed to make.
2. Runtime gates: explicit consent before capture/upload, engagement gate before verification, API protection, route schemas, quotas, and owner/session checks.
3. Flow completion: make `/` explain real product breadth; make `/sessions` a real dashboard; remove developer validation language from onboarding; normalize each source pane into the same pattern.
4. Workspace clarity: persistent session state with source, live/processing/done, active claim, verdict status, rhetoric heat, evidence confidence, pending/terminal counts, and next action.
5. Conversation intelligence: add claim clusters, verdict history, repaired/superseded/reopened statuses, stance tracking, time anchoring, and `too fragmented to judge` outcomes.

## What Exists Vs. What Launch Still Needs

Current assets: source picker, YouTube ingest, browser-tab extension scaffold, mic/audio/text/media panes, Watch/Overview/Transcript/Claims/Markers, local save/export/library, corpora, test infrastructure, flow specs, visual evidence, and internal dashboards.

Still needed: hardened APIs, hard consent, engagement gate, truthful privacy/account story, complete terms/contact routes, pricing/cost metering, public onboarding, installed extension proof, mobile/platform plan, analytics plan, support/comms plan, cleaned end-user copy, and Phase B evaluation evidence.

## Committee Vote

Yentl is promising and unusually well-instrumented, but not launch-ready. The next move should be a convergence sprint making product claims, runtime behavior, session state, legal pages, and validation evidence tell the same truth.
