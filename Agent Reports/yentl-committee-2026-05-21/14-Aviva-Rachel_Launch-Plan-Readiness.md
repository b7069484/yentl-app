# Yentl Committee Report - Launch Plan, Readiness Inventory, and Execution Checklist

    **Committee member:** Aviva Rachel  
    **Remit:** Launch program management, readiness gates, cross-functional checklist, public/private beta sequencing.  
    **Why this name:** Aviva means springlike or renewal; Rachel evokes care and stewardship. This seat asks what must be alive and tended before launch.  
    **Date:** 2026-05-21  
    **Workspace:** `/Users/israelbitton/Live FactCheck`


## What Yentl Currently Has

- Next.js app with landing page, trust pages, source picker, session workspace, local sessions library, save/export, and internal flow/validation dashboards.
- Six source paths: browser tab, microphone, audio upload, text paste, YouTube, media URL.
- Chrome MV3 extension scaffold for same-page panel/capture.
- Core AI pipeline: transcript -> claim extraction -> provisional verification -> confirmed web-search verification -> rhetoric markers -> synthesis -> Devil's Advocate.
- Corpus 1 and Corpus 2 totaling 200 video rows, with 200 transcript artifacts and current WER subsets.
- Existing tests for many UI, API, source-ingest, extension, and corpus pieces.
- Internal reports, flow specs, visual evidence, and orchestration packet.

## What Launch Still Needs

### P0 Launch Safety

- Protect cost-bearing APIs.
- Add rate limits, quotas, metering, and abuse alerts.
- Resolve Blob privacy/deletion.
- Add hard source-specific consent.
- Implement engagement gate.
- Add security headers and extension message hardening.
- Finalize auth/account/storage truth.
- Complete terms/privacy/contact/support.

### P0 Product Truth

- Public page must match actual product breadth.
- Trust pages must match runtime behavior.
- Remove internal validation/demo language from public UX.
- Fix broken auth, CTAs, claim counts, accessibility overclaims.
- Make source limitations explicit by platform.

### P0 Evidence

- Run Corpus 2 Phase B pilot with human sidecars.
- Add crosstalk/speaker attribution evaluation.
- Separate live from offline review in replay/eval.
- Add source-quality/independence checks.

### P1 Beta Assets

- Demo video, screenshot pack, extension install guide, FAQ, methodology one-pager, privacy one-pager, educator guide, press kit, support docs, onboarding emails.
- Private beta waitlist/request access.
- Feedback/correction workflow.
- Analytics dashboards.

## Recommended Launch Sequence

### Phase 0 - Stabilize Worktree

Inventory dirty work, preserve current artifacts, do not clean `.claude`, `.claire`, corpus outputs, or visual evidence without explicit approval.

### Phase 1 - Private Local/Trusted Preview

Audience: internal/team/trusted advisors only. Use local keys, manual cost authorization, deterministic fixtures, no public marketing.

Gate: source picker, YouTube, text paste, sample corpus replay, extension panel preview, export/report, and known limitations all visible.

### Phase 2 - Closed Research Beta

Audience: 10-25 educators/journalists/researchers under explicit beta terms. Use quotas and support channel. Collect feedback and human judgment.

Gate: protected APIs, consent, engagement gate, contact/support, privacy truth, telemetry, extension installed proof.

### Phase 3 - Public Waitlist / Demo

Audience: broader users can view demo and request access. No open-ended production API exposure.

Gate: public landing page, pricing intent, support, FAQ, press kit, fixed UI blockers, launch-safe demo.

### Phase 4 - Paid Pilot

Audience: institutions/teams. Requires billing, support, DPA posture, usage reporting, admin controls, and model/eval change logs.

## Launch Decision

Yentl should not launch publicly today. It is ready for a convergence sprint and controlled demonstrations, not an open beta. The strongest launch path is a private beta framed as `research preview for live media literacy`, not `real-time truth scoring`.
