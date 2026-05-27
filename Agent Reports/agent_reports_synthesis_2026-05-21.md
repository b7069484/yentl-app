# Yentl Agent Reports Synthesis and Code-Change Handoff

Date: 2026-05-21
Workspace: `/Users/israelbitton/Live FactCheck`

This synthesis consolidates the seven audit reports in `Agent Reports/`:

- `agent_codebase_2026-05-21_17-40-10_EDT.md`
- `agent_security_2026-05-21_17-49-38_EDT.md`
- `agent_UI_2026-05-21_17-50-01_EDT.md`
- `agent_UX_2026-05-21_17-54-26_EDT.md`
- `agent_study_2026-05-21_17-54-52_EDT.md`
- `agent_flow_2026-05-21_18-02-36_EDT.md`
- `agent_writer_2026-05-21_18-04-48_EDT.md`

Purpose: give the next implementation agent one practical order of operations, with the main implications and code-change priorities called out explicitly.

## Executive Synthesis

Yentl is no longer an empty concept. The repo has a distinctive product direction, credible local corpus assets, a polished source-picker/YouTube/browser-tab experience, an increasingly coherent extension panel, and serious internal validation surfaces. The strongest current idea is clear: Yentl should be a calm live companion that checks what is being said while keeping the original media as the anchor.

The app is not ready for public use with real credentials. The blockers are not mostly visual. They are trust, security, product truth, and state consistency:

1. Cost-bearing and sensitive APIs are publicly reachable.
2. Large uploads use public Blob URLs and conflict with the privacy story.
3. Consent and engagement gates are mostly documented, not enforced.
4. The account/storage story contradicts itself across app behavior and trust pages.
5. Auth pages can render blank when Clerk env is missing.
6. The local worktree contains substantial uncommitted work beyond the green PR.
7. Several user-facing screens leak internal validation or developer language.
8. Core UI trust breakers remain: invisible CTA text, inconsistent claim counts, crowded mobile session navigation, weak transcript reading layout, and uneven source-ingest quality.
9. The corpus foundation is strong, but the meaning-under-pressure evaluation is not yet strong enough to justify prompt tuning claims.

The next code pass should not be a broad redesign. It should be an ordered stabilization pass:

1. Protect the repo state.
2. Close public-preview security holes.
3. Make product/trust copy tell the truth.
4. Fix broken user-facing UI states.
5. Add the live signal language that makes Yentl feel like a companion instrument panel.
6. Only then deepen the conversation-intelligence layer and corpus evaluation.

## Practical Implications

### Do not treat PR green as "latest is safe"

The codebase audit found PR #5 green and synchronized at `af3f5ae`, but the local worktree had 31 tracked unstaged modifications, 1 staged new handoff file, and hundreds of untracked/generated paths. The implementation agent should treat the current local worktree as the user's latest working surface, not as a clean clone.

Before changing files:

- Run `git status --porcelain=v1 -b`.
- Do not switch branches, rebase, prune worktrees, run broad cleanup, or run `git add .`.
- Split work into intentional buckets: source changes, tests, docs, corpus harness, generated corpus artifacts, visual evidence, and local agent debris.
- Decide whether `.claude/` and `.claire/` belong in `.gitignore` and `tsconfig.json` excludes. Do this intentionally, because those folders may contain other agents' work.

### Do not polish around security blockers

The app can look good while still being unsafe to expose. Security findings should gate any public preview with real keys:

- Protect cost-bearing `/api/*` routes.
- Add rate limits and quotas.
- Stop anonymous token/upload/model spending.
- Fix Blob media persistence and public access.
- Add explicit consent before capture/transcription.
- Enforce the engagement gate before verification.
- Harden SSRF and extension messaging.
- Add request schemas/length caps and basic security headers.

Copy/UI changes that promise privacy, accounts, saved history, or "no persistence" must wait until runtime behavior matches.

### Align product truth before refining flows

The reports repeatedly find contradictory product stories:

- Trust pages say no accounts/session histories, while Clerk routes and a saved-session library exist.
- Privacy copy says ephemeral/in-memory processing, while large media uploads can persist in public Blob storage.
- Source picker says upload audio/video, while the upload pane appears audio-focused.
- Verdict vocabulary varies between `No backing`, `No Valid Backing`, `UNVERIFIABLE`, and `UNVERIFIED`.
- Internal validation/demo language leaks into user-facing routes.

The next code agent needs to make a small set of decisions and enforce them across UI, copy, routes, and docs.

### Build signal strength, not more cards

UI/UX reports agree that Yentl's visual foundation is strong but the live analysis signal is too subtle. The Watch view and extension panel should behave more like an instrument panel:

- Current verdict.
- Rhetoric heat.
- Evidence confidence.
- Live state: Listening, Transcribing, Checking, Done.
- New finding pulse.

This should be visible without reading dense rows. Detailed transcript, claims, markers, and evidence remain one click or scroll away.

### Evaluation should become honest before prompts get tuned

The study audit says Yentl now has 200 local transcript artifacts across two corpora, credible WER subsets, and three Corpus 1 replay slices. That is useful, but it does not prove the hard thing: meaning preservation in crosstalk, quote/refutation, repairs, irony, sensitive identity claims, and clipped context.

Do not claim the system is sophisticated under pressure until there are:

- Human speaker-attribution checks.
- Crosstalk WER or hand-scored overlap windows.
- Corpus 2 Phase B replay outputs.
- Human judgment sidecars.
- As-if-live replay with no future context.
- Meta-review traces showing claims can be merged, repaired, superseded, reopened, or downgraded.

## Implementation Order

### Phase 0 - Repo Safety and Worktree Hygiene

Goal: avoid losing or trampling current local work.

Tasks:

1. Capture the starting state with `git status --porcelain=v1 -b`, `git diff --stat`, and `git diff --cached --stat`.
2. Identify which of the existing dirty files are source changes versus generated artifacts.
3. Do not clean `.claude/`, `.claire/`, corpus outputs, visual evidence, PDFs, images, or downloaded assets without explicit human approval.
4. Add or adjust ignores only after deciding which generated artifacts should never be tracked.
5. Check the staged handoff doc warning about the extra blank line at EOF if that file will be committed.
6. Keep PR #4 separate; it was reported open and unstable, while PR #5 was green.

Implementation notes:

- This phase may require no app behavior changes, but it should precede any large patch.
- The safest commit structure is multiple small commits, not one broad sweep.

### Phase 1 - Security and Trust Launch Gates

Goal: make the app safe enough for a real-key preview.

Tasks:

1. Protect cost-bearing APIs in production.
   - Review routes under `app/api/**/route.ts`.
   - Require Clerk auth or an intentional allowlist for routes that truly remain public.
   - Priority routes include Deepgram token minting, upload tokens, transcription, source preview, claim extraction, provisional/confirmed verification, rhetoric analysis, synthesis, and Devil's Advocate.

2. Add rate limits and usage quotas.
   - Rate-limit by user, IP, and route.
   - Track audio seconds, upload bytes, model calls, and source-preview calls.

3. Replace public Blob media behavior.
   - Avoid public Blob URLs for user media.
   - Use private storage or short-lived signed access.
   - Delete uploaded blobs after transcription success and failure.
   - Redact media URLs from logs.
   - Add lifecycle tests.

4. Add hard consent gates.
   - Require explicit consent before microphone, browser-tab capture, audio upload, media URL transcription, and any third-party audio capture.
   - Store session-level consent state.
   - Re-prompt on source changes or material time changes.

5. Implement the runtime engagement gate.
   - Insert the gate between claim extraction and verification.
   - Fail closed on classifier/schema/model errors.
   - Store refusal/skip state without producing harmful verdict-like output.

6. Harden SSRF handling.
   - Revalidate every redirect target.
   - Revalidate OG image URLs.
   - Block private IPs, loopback, link-local, suspicious ports, non-http schemes, and large responses.
   - Prefer server-side safe fetch/proxy of media bytes instead of passing attacker-controlled URLs to Deepgram.

7. Fix extension bridge message integrity.
   - Do not post bridge tokens to `window.parent` with target origin `"*"`.
   - Prefer a `MessageChannel` established by the content script.
   - Treat host-page text/audio as untrusted and label provenance.

8. Add security headers and CSP.
   - Add production CSP, HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, and appropriate `frame-ancestors`.

9. Triage dependency and supply-chain findings.
   - Prioritize Clerk/js-cookie.
   - Triage Deepgram `ws` and Next/PostCSS advisories against current vendor releases.
   - Do not run `npm audit fix --force` blindly.
   - Pin and verify the `yt-dlp` binary instead of downloading `latest` during build.
   - Add `SECURITY.md`, secret scanning, and a curated security CI gate.

Verification:

- Add tests for unauthenticated access, rate limits, Blob deletion, consent blocking, engagement refusal, SSRF redirects/private IPs, OG image SSRF, prompt injection, and hostile extension-parent messages.

### Phase 2 - Product Truth, Route Truth, and Copy Lock

Goal: remove contradictions before polishing.

Tasks:

1. Decide the account story.
   - Either position v1 as local-only/no account, or make Clerk accounts part of the product.
   - Align homepage, privacy, terms, methodology, saved library, auth routes, and session persistence with that decision.

2. Fix auth route behavior.
   - `/signin` and `/signup` must not render blank when Clerk env is absent.
   - Show a visible, trustworthy fallback state or disable account CTAs in local/demo mode.

3. Fix broken trust links.
   - Add `/contact`, or replace links with direct email copy.
   - Fix or remove `/docs/engagement-gate` links if no route exists.

4. Remove public placeholders and developer copy.
   - Remove legal placeholder language from Terms.
   - Hide `drop lib/taxonomy/...` style marker-learn-more copy.
   - Gate `/project/*`, validation fixtures, functional samples, and internal dashboard copy away from normal user flows.

5. Lock vocabulary.
   - Recommended main line: "Yentl checks what is being said."
   - Source picker heading: "What are you checking?"
   - Browser tab card: "Analyze the video on this page" / "Use tab capture".
   - Avoid `functional sample`, `proven replay`, `engagement gate`, provider names, and internal validation language in normal user UI.

6. Normalize verdict labels.
   - `Checking`
   - `Supported`
   - `Mixed`
   - `False`
   - `No reliable backing`
   - `Opinion`
   - Hide enum language such as `UNVERIFIABLE` from normal UI.

7. Resolve upload vocabulary.
   - If local upload is audio-only, use "Upload audio" everywhere.
   - If video files are supported, use "Upload a media file" everywhere and list MP4 clearly.

Verification:

- Route smoke tests for `/`, `/session`, `/sessions`, `/signin`, `/signup`, trust pages, and any linked docs/contact route.
- Copy grep for banned/internal terms in user-facing routes.

### Phase 3 - User-Facing UI and Flow Repairs

Goal: remove visible trust breakers and make the core journey coherent.

Tasks:

1. Fix unreadable primary buttons.
   - `components/session/ingest-panes/audio-ingest-pane.tsx`
   - `components/session/ingest-panes/media-url-ingest-pane.tsx`
   - Replace the invalid/invisible `text-bg` style with a known visible token.

2. Fix claim-count consistency.
   - Watch, nav tabs, Overview, and Claims should agree.
   - Either include pending/checking claims in counts and lists, or label terminal-only counts clearly.

3. Add robust player/loading/unavailable states.
   - Avoid a dead black player rectangle when media is unavailable.
   - Let users know whether the app is loading, blocked, missing source, or using a sample.

4. Repair mobile active-session navigation.
   - Reduce crowded tab/header controls.
   - Keep touch targets comfortable.
   - Make the speaker/source rail responsive.
   - Fix Overview activity rows so quote text remains readable.

5. Constrain transcript reading layout.
   - Add readable max width and stronger rhythm.
   - Add line-level rails/badges for claims and markers.
   - Add search/correction controls if in scope.

6. Bring older ingest panes up to the YouTube/source-picker quality bar.
   - Audio, Text, and Media URL need right-rail preview/status, progress stages, fallback/recovery, and clear ready/loading/error states.
   - Media URL needs detection and fallback guidance.
   - Microphone pre-start needs a visible Back to sources action and real consent/preflight.

7. Improve browser-tab waiting state.
   - After connection check, show a bold "Waiting for Chrome extension" state.
   - Give a clear instruction: go to the video tab and connect Yentl.
   - Keep validation/sample links out of the end-user path.

8. Make Save/restore less fragile.
   - Make Save prominent once useful evidence exists.
   - Consider local draft persistence for active sessions.
   - If a direct view URL has no active/restored session, show an explanatory empty state instead of silently returning to source selection.

Verification:

- Visual tests or Playwright screenshots for Audio staged state, Media URL valid state, mobile session shell, transcript view, Watch unavailable/loading state, source picker, browser-tab waiting state, and auth fallback.

### Phase 4 - Live Companion Signal System

Goal: make Yentl readable at a glance while media plays.

Tasks:

1. Add an always-visible signal board to Watch.
   - Current read: `Supported`, `Mixed`, `False`, `No reliable backing`, or `Checking`.
   - Rhetoric heat: `Low`, `Rising`, `High`.
   - Evidence state: `Cited`, `Incomplete`, `Waiting`.
   - Live state: `Listening`, `Transcribing`, `Checking`, `Done`.

2. Add a mini signal strip to the extension panel.
   - Keep Transcript/Claims/Markers tabs.
   - Put claim risk, rhetoric heat, evidence state, and new-finding pulse above the tabs.

3. Add a stronger Overview summary.
   - Example: "Current read: mostly factual, rhetoric rising."
   - Keep detailed metrics and recent activity below.

4. Use color intentionally.
   - Red should not mean every warning.
   - Reserve red for false/misleading/failure/severe rhetoric.
   - Use amber for incomplete/caution.
   - Use green for supported/healthy.
   - Respect reduced-motion settings.

Implementation dependency:

- This phase works best after claim-count consistency and verdict vocabulary are fixed.

### Phase 5 - Conversation Intelligence and Corpus Evaluation

Goal: make Yentl careful under pressure, not just fast.

Tasks:

1. Add a 10-row "meaning under pressure" replay pack.
   - Suggested rows: `cable_008`, `political_010`, `israel_010`, `holocaust_010`, `c2_mech_01`, `c2_mech_05`, `c2_quote_09`, `c2_ident_10`, `c2_rhet_03`, `c2_platform_03`.

2. Add human judgment sidecars.
   - Speaker attribution.
   - Claim completeness.
   - Quote/stance correctness.
   - Verdict correctness.
   - Marker usefulness.
   - Over-pettiness.
   - Missed broader context.
   - Whether earlier verdicts should change later.

3. Add as-if-live replay.
   - No future context.
   - Source context included.
   - Production pacing.
   - Optional paragraph batching.
   - Saved meta-review events.

4. Add session-level reset.
   - Clear recent claim hashes, marker hashes, pacing counters, abort controllers, and any stale orchestrator state when a session starts or resets.

5. Introduce claim clusters.
   - Cluster by normalized proposition, entities, time anchor, speaker stance, and semantic similarity.
   - Let one cluster hold multiple utterance spans.

6. Add verdict history and reconsideration triggers.
   - Record label, evidence, score, input claim, normalized proposition, time issued, context window, and later changes.
   - Reconsider when repairs, missing dates/entities, conflicts, quote/refutation, or later context appear.

7. Add richer claim extraction fields.
   - `stance`: asserted, denied, quoted, reported, questioned, joking/satirical, hypothetical, repaired, unclear.
   - `claim_span_type`: single utterance, cross-utterance, cross-speaker, quotation block, repaired claim.
   - `time_anchor`: explicit date, inferred source date, conversation-relative date, or missing.
   - `too_fragmented_to_judge`.

8. Add pragmatic marker pass.
   - interruption, backchannel, repair, hedge, evidentiality, quotation boundary, goading, burden shift, topic shift, frame contest, sarcasm/irony.
   - Use calibration labels: observe, caution, material.
   - Protect "strong but fair argument" from overflagging.

9. Treat diarization confidence as product data.
   - Use confidence bands.
   - Avoid speaker-specific claims below the confidence floor.
   - Add expected-vs-observed speaker sanity checks.

Verification:

- Golden tests for context repair, fragmented claims, quoted harmful content, crosstalk attribution, and mirror-pair fairness.
- Corpus dashboards should report WER, diarization, claim precision/recall, verdict agreement, marker precision/recall, meta-review events, latency, cost, and source quality.

## Suggested First Patch Set

If the next agent needs a concrete starting slice, this is the best first patch set:

1. Worktree hygiene:
   - Capture status.
   - Avoid branch switches.
   - Add intentional ignores only if approved by current repo expectations.

2. User-visible trust breakers:
   - Fix Audio/Media URL button text.
   - Add auth fallback for missing Clerk env.
   - Add or repair `/contact` and `/docs/engagement-gate` links.
   - Remove Terms placeholder and developer marker placeholder.

3. Security minimum:
   - Protect Deepgram token, upload, transcription, and model routes in production.
   - Add request schemas and length caps to model routes.
   - Add tests proving unauthenticated production requests fail.

4. Flow consistency:
   - Fix claim-count inconsistency.
   - Add Back to sources on mic pre-start.
   - Remove validation/sample copy from end-user source panes.

5. Visual verification:
   - Run targeted tests.
   - Capture Playwright screenshots for fixed states.
   - Report the exact local URL and paths checked.

This slice gives immediate trust wins without requiring the full meta-review architecture.

## Test Checklist for the Implementation Agent

Run the narrow checks that match changed files first, then broaden:

- `npm run type-check` or the repo's TypeScript command.
- `npm run lint`.
- Targeted Vitest suites for changed API/client/UI modules.
- Playwright or screenshot checks for affected rendered states.
- Security tests for auth/rate-limit/SSRF/consent/Blob/extension bridge changes.
- Corpus replay tests only when corpus harness or intelligence logic changes.

Known caveat from prior local work: `tsx`-driven corpus runs have previously failed in this environment with an `EPERM` IPC/listen error before the script began processing. Treat that as a runner/environment problem unless reproduced through a different execution path.

## Bottom Line for the Code Agent

Start by making Yentl truthful and safe, then make it clearer, then make it smarter.

The immediate product goal is not a bigger redesign. It is to reconcile the live app with the intended flow: source-aware intake, media-centered Watch, glanceable live signals, saved/exportable outcomes, and trust pages that match runtime behavior. Once those foundations hold, the next leap is the conversation-intelligence layer: claim clusters, stance, repair tracking, quote boundaries, speaker confidence, and meta-review.
