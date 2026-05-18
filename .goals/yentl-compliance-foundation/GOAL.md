# Goal: Yentl Compliance Foundation (v1 launch trust layer)

**Slug**: `yentl-compliance-foundation`
**Owner**: Israel B. Bitton (b7069484@gmail.com)
**Locked**: 2026-05-17
**Status**: active

> Change Status to `active` once cron is registered. Values: `draft | active | paused | done | abandoned`.

---

## Objective (the WHY)

Build the **launch-grade compliance + trust layer** identified in expansion research §8 (Requirement → Component, 40 v1 items) and §10 (Top Risks), beyond what `yentl-this-week-actions` covers. Specifically: the other 35 v1 components + 6 trust pages + DPIA + accessibility statement + engagement-gate policy spec.

This is **what stands between Yentl's current state and being legally + ethically shippable to the public** under EU + US + UK + Quebec + Australia regimes. Per the research, the v1 web app is NOT launch-ready without this layer, regardless of how complete the fact-check pipeline is.

**Hard deadlines this goal feeds:**
- 2026-06-28 — European Accessibility Act / WCAG 2.2 AA (Group C)
- 2026-08-02 — EU AI Act Article 50 transparency binding (Groups B + D)
- Continuous — Defamation exposure on AI verdicts (Top Risk #1; this goal documents the *policy* in Group F)

The 28 clauses below are grouped into 7 split-friendly clusters. If the watchdog flags a stalled cluster, the recommended remediation is split into a per-cluster micro-goal (see README "If this goal stalls").

## End condition (THE LITERAL TEXT `/goal` EVALUATES)

> ALL of the following are simultaneously true and have been verified by running the listed commands during the same /goal session, with the outputs surfaced into the chat transcript so the evaluator can see them.
>
> **Group A — Consent extensions (4 clauses)**
>
> 1. **Pause > End hierarchy fix**: `components/session/SessionHeader.tsx` refactored so the Pause button is the **primary** action (filled brand-blue `#2563EB`, larger size, default focus target) and End is the **destructive-secondary** action (outlined, smaller, separated by visible space). A test in `tests/session-header.test.tsx` verifies Pause button has the primary class and End button has the destructive-outline class.
>
> 2. **Long-session re-confirmation toast**: A `<SessionTimer>` component fires a toast at 30:00 of any active session: "Still rolling at 30:00. Pause anytime." (verbatim, from research §8 Brand-Voice Copy). Implementation can use a simple `setInterval` plus the project's preferred toast lib (sonner, radix-ui, or a minimal custom component — pick one and use it consistently). Test in `tests/session-timer.test.tsx` verifies (a) toast fires at 30:00 with fake timers, (b) toast does not fire if session is paused, (c) toast text matches verbatim.
>
> 3. **Two-party consent disclosure banner**: A `<TwoPartyDisclosure>` component shown on first session via a localStorage flag `yentl.two_party_seen`, with verbatim text from research §8: "Heads up — recording the people around you may need their consent. Yentl doesn't know where you are; you do." Dismissible. Renders inside the session view, above the transcript. Test verifies (a) appears when flag absent, (b) does not appear when flag present, (c) dismissing sets the flag.
>
> 4. **Audio route disclosure popover**: An `<AudioRouteDisclosure>` component accessible via an "i" icon adjacent to the RecordingBeacon (built in `yentl-this-week-actions`). Opens a popover/dialog explaining the audio chain in one paragraph (per AI Act Art 13 transparency). Suggested content: "Your microphone audio streams directly from your browser to Deepgram for transcription. Transcripts go to Anthropic Claude for fact-check + bias/fallacy analysis with web-search-backed citations. No audio is stored on Yentl's servers." Test verifies popover opens on icon click and contains the key terms (Deepgram, Anthropic, Claude, no-storage).
>
> **Group B — AI transparency (2 clauses)**
>
> 5. **AIGeneratedBadge component**: `components/ui/ai-generated-badge.tsx` exists exporting a small "AI" chip component. Triple-encoded for a11y: text label "AI", icon (sparkle or similar), distinct background color with ≥4.5:1 contrast against text. Includes `aria-label="AI-generated content"`. Used in `app/session/page.tsx` (mounted at the page level OR in component scaffold for VerdictCard — wherever AI output will appear). Test verifies render + aria attributes.
>
> 6. **AIDisclosureFooter component**: `components/session/AIDisclosureFooter.tsx` exists, rendered persistently at the bottom of the session page. Verbatim text from research §8: "Verdicts are AI-generated. Sources may be incomplete. Use your head." Styled subtly but readable (no `text-xs`, no opacity < 0.7). Test in `tests/ai-disclosure-footer.test.tsx` verifies (a) renders on `/session`, (b) text is verbatim.
>
> **Group C — WCAG 2.2 AA accessibility baseline (6 clauses)**
>
> 7. **Skip-to-content link**: A `<SkipToContent>` component renders at the top of `app/layout.tsx` as the first focusable element. Visually hidden by default (`sr-only`), visible when focused (use `focus:not-sr-only` Tailwind variant). Anchors to `#main-content`; the `<main>` in `app/session/page.tsx` (and other route pages) carries `id="main-content"`. Test verifies SkipToContent is the first focusable element in tab order.
>
> 8. **Focus ring tokens**: `app/globals.css` (or wherever Tailwind v4 CSS variables live) defines `--ring` (or equivalent ring color token) with a value that achieves ≥3:1 contrast against both the page background and any common element backgrounds (per WCAG 2.4.7). Document the chosen value and the contrast calculation as a comment in the CSS file. Test in `tests/css-tokens.test.ts` parses the CSS file and asserts the ring token is present and matches an expected pattern.
>
> 9. **44×44 touch targets**: The shadcn `Button` default size is verified to render at minimum 44×44 px (`size="default"` should produce `h-11` AND `px-` such that the resulting box is ≥44×44; if not, override the default in `components/ui/button.tsx`). Same check for IconButton if one exists. Test in `tests/touch-targets.test.tsx` renders Button with default props and asserts the bounding box satisfies the minimum.
>
> 10. **prefers-reduced-motion respected**: All animated elements (RecordingBeacon pulse, SessionTimer toast entrance, any other transitions) use Tailwind's `motion-reduce:` variants to disable or shorten animation. A `tests/reduced-motion.test.tsx` smoke test renders the session page with `matchMedia` mocked to `prefers-reduced-motion: reduce` and asserts that animated components have the appropriate `animate-none` / `motion-reduce:` class.
>
> 11. **aria-live regions**: Two live regions exist:
>     - **Transcript live region**: `aria-live="polite"` on the transcript container in `components/session/TranscriptView.tsx` (or equivalent). Polite, NOT assertive (assertive turns the app into screen-reader torture).
>     - **Claims live region**: A `<ClaimsLiveRegion>` component reserved for future verdict announcements (data wiring in fact-check pipeline goal). For this clause, the component exists, is mounted on the session page, and has `aria-live="polite"` `aria-atomic="false"` `role="status"`.
>     Test verifies both regions present with correct attributes.
>
> 12. **WCAG 2.2 AA pass — gated by tooling**: `@axe-core/cli` is installed as a devDependency. `npm run dev` starts the app; `npx @axe-core/cli http://localhost:3000` AND `npx @axe-core/cli http://localhost:3000/session` both exit 0 with zero violations. (Helper script `scripts/run-a11y-audit.sh` is added that boots dev, waits, runs both audits, kills dev — to make this repeatable for CI.) Lighthouse a11y score ≥95 on both routes (use `npx lighthouse` or the lighthouse-ci package). The CI workflow added by `yentl-hardening-pass` clause 10 is extended to include this audit as a step (if hardening-pass hasn't been activated yet, add the step to a placeholder `.github/workflows/ci.yml`). Outputs from both tools printed in chat for the evaluator.
>
> **Group D — Trust pages (7 clauses)**
>
> 13. **`/about` page**: `app/about/page.tsx` exists and contains sections (verifiable by grep for section headings): **What Yentl does** (1-paragraph mission), **Engines used** (Deepgram Nova-3, Anthropic Claude Opus 4.7, Vercel AI Gateway, named), **Taxonomy source** (named: "Cognitive Biases & Logical Fallacies Used by Antisemites" by Israel B. Bitton, 2024), **Funding model** (placeholder OK, e.g. "Self-funded · seeking responsible partners"), **Known limitations** (at least 5 bullets: AI verdicts may be wrong, sources may be incomplete, etc.). Renders without errors at `http://localhost:3000/about`.
>
> 14. **`/methodology` page**: `app/methodology/page.tsx` exists with sections: **Version** (v1), **Decision tree** (how a claim becomes a verdict, narrative or diagram), **Reputation tier definitions** (high/medium/low source reputation criteria), **Marker taxonomy** (link to /taxonomy.json + summary), **Decline-to-engage rules** (when Yentl refuses to adjudicate — links to docs/engagement-gate.md from clause 24), **Prompt-version log** (table with at least one row: "v1 · 2026-05-17 · initial").
>
> 15. **`/changelog` page**: `app/changelog/page.tsx` exists (separate from CHANGELOG.md — this is the user-facing page summarizing methodology/prompt/model changes for transparency). At least one entry: "2026-05-17 · v1 baseline · launch trust layer + accessibility · compliance foundation goal."
>
> 16. **`/privacy` page**: `app/privacy/page.tsx` exists, names **Deepgram + Anthropic + Vercel** as processors, includes:
>     - Lawful basis for processing (GDPR Art 6(1)(a) consent + Art 9(2)(a) explicit consent for sensitive)
>     - Retention policy: "No audio or transcripts persisted on Yentl servers in v1; analysis in-memory only."
>     - Cross-border transfer mechanism: SCCs + EU-US Data Privacy Framework where applicable; Deepgram EU endpoint for EU traffic
>     - GDPR rights: access, rectification, erasure, portability, restriction, objection, complaint to supervisory authority
>     - CCPA notice: "California residents have rights under CCPA — see [Universal Opt-Out / GPC](https://globalprivacycontrol.org/)." (For v1 with no accounts, full CCPA does not apply, but the notice is good practice.)
>     - Quebec Law 25 acknowledgment
>     - Contact: a real email address (placeholder OK if not yet provisioned, but the page references the contact route)
>     - Last-updated date (today)
>
> 17. **`/terms` page**: `app/terms/page.tsx` exists, covering:
>     - "Informational, not advice" disclaimer (prominent)
>     - Methodology link (to `/methodology`)
>     - No-warranty clause (AI may be wrong)
>     - Age limit: 18+ (defends against COPPA actual-knowledge per research §7)
>     - Anti-SLAPP-aware choice-of-law: California, Texas, or New York (per research §7 recommendation)
>     - Arbitration / dispute resolution (placeholder language OK; flag for legal review)
>     - User obligations: lawful use, no automated abuse, etc.
>
> 18. **`/subprocessors` page**: `app/subprocessors/page.tsx` exists with a table:
>     | Subprocessor | Purpose | Location | DPA status link |
>     | Deepgram | Audio transcription | US (default) / EU (api.eu.deepgram.com for EU traffic) | docs/dpa-status.md |
>     | Anthropic | AI fact-check + bias/fallacy analysis | US | docs/dpa-status.md |
>     | Vercel | Hosting + edge | US/global edge | docs/dpa-status.md |
>     Updated-on date (today). Plain-text accessible.
>
> 19. **`/taxonomy.json` route**: Either a static file at `public/taxonomy.json` OR a Route Handler at `app/taxonomy.json/route.ts` returns the 123-entry taxonomy as valid JSON. License field in the JSON header: `"_license": "CC-BY-4.0"`. Test in `tests/taxonomy-route.test.ts` fetches the route, parses JSON, asserts it contains expected entries (a known bias name from `lib/taxonomy/`).
>
> **Group E — Verdict + report infrastructure scaffold (2 clauses)**
>
> 20. **ReportVerdictButton + ReportFlow**: `components/verdict/ReportVerdictButton.tsx` and `components/verdict/ReportFlow.tsx` exist. ReportVerdictButton renders an accessible button (44×44, focus ring, aria-label "Report this verdict"). On click opens ReportFlow dialog with a categorized form: radio options "Wrong verdict / Bad sources / Harmful content / Other"; optional free-text "What went wrong? (optional)"; submit button. Submission for v1 persists to localStorage key `yentl.reports` as an array of `{report_id (ULID), category, note, verdict_ref (placeholder), timestamp_iso}`. No backend yet — v2 will add that. Tests in `tests/report-flow.test.tsx` cover: opens, validates required category, persists to localStorage, closes after submit.
>
> 21. **VerdictCard triple-encoding scaffold**: `components/verdict/VerdictCard.tsx` exists. Props: `verdict: "TRUE" | "FALSE" | "MIXED" | "UNVERIFIED"`, `claim: string`, `summary: string`, `sources: Array<{url: string; domain: string; reputation: "high" | "medium" | "low"}>`, `markers: Array<{type: string; severity: "subtle" | "clear" | "blatant"}>`. **Triple-encoding** for each verdict state:
>     - **TRUE**: color stripe `#16A34A` (verified green from R4 V3 palette) + check-circle icon + mono uppercase label "✓ TRUE"
>     - **FALSE**: color stripe `#DC2626` (false red) + x-circle icon + mono uppercase label "✗ FALSE"
>     - **MIXED**: color stripe `#F59E0B` (amber friendly) + half-circle icon + mono uppercase label "◐ MIXED"
>     - **UNVERIFIED**: color stripe `#6B7280` (neutral gray) + question-circle icon + mono uppercase label "? UNVERIFIED"
>     Includes `<AIGeneratedBadge>` (from clause 5) and `<ReportVerdictButton>` (from clause 20). Sources rendered as keyboard-navigable list with reputation indicators. Markers rendered as `<MarkerChip>`-style spans (full MarkerChip component is fact-check goal scope; for this clause, simple span with severity color suffices). A Storybook-or-equivalent rendering (or a `tests/verdict-card.test.tsx` snapshot/render test) shows all 4 verdict states render without errors, satisfy WCAG 1.4.1 (color is not the sole means of conveying verdict), and have correct aria attributes.
>
> **Group F — Documentation (3 clauses)**
>
> 22. **Accessibility statement**: Either a dedicated `app/accessibility/page.tsx` route OR a clearly-headed `## Accessibility` section on `/about`. Content: conformance level (WCAG 2.2 AA targeted, current status), known limitations (be honest — if X is not yet accessible, say so with a date), contact for accessibility issues (email), date of last audit (today). Required by European Accessibility Act.
>
> 23. **DPIA documented**: `docs/dpia.md` exists at the project root, follows the EDPB April 2026 DPIA template structure. Sections at minimum:
>     - **Scope**: what processing this DPIA covers (Yentl v1 web app's audio→Deepgram→Anthropic pipeline)
>     - **Processing purposes**: transcription, fact-check, bias/fallacy analysis
>     - **Lawful basis**: GDPR Art 6(1)(a) + Art 9(2)(a)
>     - **Special-category data assessment**: audio may contain political/religious/health/orientation/ethnicity — explicit consent obtained via ConsentGate
>     - **Cross-border transfer assessment**: Deepgram US (DPF + SCCs + TIA), Anthropic US (DPA + SCCs auto-incorporated in Commercial ToS Jan 1, 2026), Vercel US/global edge (DPA + SCCs)
>     - **Three EDPB high-risk triggers addressed**: (1) innovative technology (LLM fact-checking), (2) potentially large-scale special-category processing, (3) automated decision-making with potentially significant effect (a FALSE verdict can affect reputation)
>     - **Mitigations**: no persistence, in-memory only, named-processor disclosure, ConsentGate, RecordingBeacon, ReportFlow, public methodology, engagement-gate policy
>     - **Residual risk**: list what's NOT mitigated and why acceptable
>     - **Author + date**: Israel B. Bitton, 2026-05-17
>
> 24. **Engagement-gate policy spec**: `docs/engagement-gate.md` exists, documenting (NOT implementing — implementation is in fact-check pipeline goal):
>     - **Decision categories** (verbatim from research §4 Gate type): `ENGAGE`, `DECLINE_FRIVOLOUS`, `REFUSE_INAPPROPRIATE`
>     - **Claim quality buckets**: `verifiable`, `opinion`, `rhetorical`, `joke`, `none`
>     - **Appropriateness buckets**: `ok`, `edgy_but_engage`, `harassment_vector`, `doxxing`, `csam`, `extremism`
>     - **Hard refusals**: per research §4 "Yentl refuses (silent)" — private-individual harassment vector, hate/extremist/threatening, doxxing, CSAM, defamation-trap setups
>     - **Engage cautiously**: contested-but-factual matters (consensus + named dissents + confidence)
>     - **Public policy doc structure** (to be linked from `/methodology`): "Yentl engages / engages cautiously / declines / refuses (silent)" — full table per research §4
>     - **Why this exists**: Top Risk #1 mitigation (defamation against identifiable private figures)
>     - **Implementation hand-off note**: this spec is implemented in the fact-check pipeline goal as a Haiku-based pre-engagement classifier per research §4 architecture
>
> **Group G — Integration + git hygiene (4 clauses)**
>
> 25. **All new components have tests**: Every component added in this goal (clauses 1-11, 20-21) has a corresponding test file in `tests/`. `npx vitest run` exits 0 with all tests passing, no skipped tests. Coverage on the new `components/verdict/**` and `components/session/**` (only for new files; existing files not affected) is ≥70%.
>
> 26. **CHANGELOG.md updated**: The project root `CHANGELOG.md` (created by `yentl-hardening-pass`, OR created here if hardening hasn't run) has a new section dated today titled "Compliance foundation" listing: every component added, every page added, every doc added, every config change. Follows Keep a Changelog format.
>
> 27. **README has Compliance section**: The project root `README.md` has a new `## Compliance & Trust` section (or an extension of an existing Security & Operations section from hardening-pass) covering: consent flow overview (with reference to ConsentGate), trust pages map (links to /about, /methodology, /changelog, /privacy, /terms, /subprocessors, /accessibility), accessibility posture (WCAG 2.2 AA target, axe-clean), DPIA reference (link to docs/dpia.md), engagement-gate spec reference (link to docs/engagement-gate.md), how to report issues.
>
> 28. **Working tree clean and rebased**: `git status --porcelain` returns empty. All worker commits prefixed `compliance:`. Branch rebases cleanly onto `origin/main`.

## Success criteria (auditable checklist — mirrors end-condition clauses)

### Group A — Consent extensions
- [ ] (1) Pause > End hierarchy fix in SessionHeader + test
- [ ] (2) SessionTimer 30-min toast + tests
- [ ] (3) TwoPartyDisclosure banner + localStorage flag + tests
- [ ] (4) AudioRouteDisclosure popover + test

### Group B — AI transparency
- [ ] (5) AIGeneratedBadge component + a11y + test
- [ ] (6) AIDisclosureFooter on session page + test

### Group C — WCAG 2.2 AA baseline
- [ ] (7) SkipToContent in layout + test
- [ ] (8) Focus ring tokens in globals.css + contrast doc + test
- [ ] (9) 44×44 touch targets verified + test
- [ ] (10) prefers-reduced-motion applied to all animated UI + smoke test
- [ ] (11) Transcript + Claims aria-live regions + test
- [ ] (12) axe-core + Lighthouse a11y pass on / and /session

### Group D — Trust pages
- [ ] (13) /about page with all required sections
- [ ] (14) /methodology page with v1 spec
- [ ] (15) /changelog page with first entry
- [ ] (16) /privacy page (GDPR + CCPA + Quebec + named processors)
- [ ] (17) /terms page (18+, anti-SLAPP, no-warranty)
- [ ] (18) /subprocessors page with vendor table
- [ ] (19) /taxonomy.json route + license header + test

### Group E — Verdict + report scaffold
- [ ] (20) ReportVerdictButton + ReportFlow + localStorage persistence + tests
- [ ] (21) VerdictCard triple-encoding (4 states) + tests

### Group F — Documentation
- [ ] (22) Accessibility statement (page or /about section)
- [ ] (23) DPIA documented (`docs/dpia.md`)
- [ ] (24) Engagement-gate policy spec (`docs/engagement-gate.md`)

### Group G — Integration
- [ ] (25) All new component tests pass; coverage ≥70% on new files
- [ ] (26) CHANGELOG entry
- [ ] (27) README Compliance & Trust section
- [ ] (28) Working tree clean + rebased

## Out of scope (anti-goals)

- **The 5 items in `yentl-this-week-actions`** (diarization off, EU endpoint, DPA-status doc, ConsentGate, RecordingBeacon) — that goal owns them. If `this-week-actions` hasn't completed yet and you need its outputs, mark dependent clauses (4 needs RecordingBeacon icon; 5 is fine standalone) as blocked and proceed with independent clauses.
- **Rebrand** (factify → yentl) — separate goal, DNS/Vercel implications.
- **`app/api/deepgram/**`** beyond reading.
- **Fact-check pipeline** (Tasks 12–26): extract-claims, verify-provisional, verify-confirmed, modes, export.
- **Engagement-gate RUNTIME** (the Haiku classifier that returns ENGAGE/DECLINE/REFUSE) — clause 24 documents the *policy*; the runtime is in the fact-check pipeline goal.
- **VerdictCard data wiring** — clause 21 is the *component with all 4 states statically rendered*; live data binding is fact-check goal scope.
- **MarkerChip + MarkerExplanationDrawer** — those are tightly coupled to fact-check data; defer to fact-check goal.
- **Pre-submission accuracy audit (50T/50F)** — that's its own future goal `yentl-accuracy-audit`.
- **Brand asset modifications** — anything under `.project/`, `public/logos/`.
- **Push to `origin/main`**, PR creation/merge — humans own these.
- **Major version bumps**.
- **New non-test top-level dependencies** without an explicit clause requiring them (testing-related dev deps like `@axe-core/cli` are pre-approved in guardrails.md).

## Context / references

- `./GOAL.md` — this file
- `./guardrails.md`, `./STATE.md`, `./decisions.log`
- **Research source of truth**: `/Users/israelbitton/Live FactCheck/.project/research/yentl-expansion-research.html`
  - §4 — engagement gate architecture (used by clause 24)
  - §6 — Apple/Play store-specific requirements (informs clauses 16, 17)
  - §7 — Regulatory Landscape (GDPR, AI Act, CCPA, Quebec, ADA/EAA, defamation, recording-consent matrix)
  - §8 — Requirement → Component table (the 40 v1 items; this goal covers ~35 of them)
  - §10 — Top Risks (this goal mitigates #2, #4, #5, #6, #7, #8, #9)
- **Brand voice for compliance copy** (research §8 Brand-Voice Copy section):
  - Use the verbatim strings provided for: TwoPartyDisclosure, SessionTimer toast, AIDisclosureFooter, decline-to-engage messages
- **Current code**:
  - `components/session/SessionHeader.tsx` — clause 1 refactor target
  - `components/session/TranscriptView.tsx` — clause 11 (aria-live)
  - `components/session/RecordingBeacon.tsx` — from this-week-actions; clause 4 attaches the "i" icon
  - `app/layout.tsx` — clauses 7, 12 mount points
  - `app/globals.css` (or wherever Tailwind v4 tokens live) — clause 8
  - `components/ui/button.tsx` — clause 9 (touch target verification)
  - `lib/taxonomy/` — clause 19 source data
  - `lib/types.ts` — clause 21 props alignment

## Budget

- **Max cost (USD)**: $150.00
- **Max wall-clock days**: 14
- **Max worker runs**: 50
- **Per-run cost cap**: $5.00

> If the watchdog flags any single group as unconvergeable, **split the goal** per the README recipes. Do not extend the budget without splitting; that's how scope creeps.
