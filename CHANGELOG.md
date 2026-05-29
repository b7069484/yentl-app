# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Phase 1a — Foundation (2026-05-28)
- **Honest speaker attribution** — `TranscriptSegment` schema gains `words[]`, `attribution_status`, `audio_features`, `stance`. Deepgram batch path stops defaulting `speaker_id` to 0 (a lie); emits `null + attribution_status: "not_available"` when no per-word speaker is available.
- **Confidence-weighted dominantSpeaker** + `latent_boundary` flag in deepgram-stream
- **AudioMeter RMS persistence** onto `segment.audio_features`; UI label "Rhetoric heat" → "Language heat"
- **Persistent prompt cache** on analyze-rhetoric (40-60% token cost reduction)
- **Shared `aiGenerateText` wrapper** with retries (3) + 30s timeout
- **Package rename** factify-scaffold → yentl-app; `factify-rose.vercel.app` swept from manifests

### Phase 1a follow-ups (2026-05-29)
- **`deepgram-batch.ts` half-open midpoint filter** — prevents word double-assignment at exact utterance boundaries when diarize:true is enabled in future phases
- **`attachAudioFeatures` helper** — split from `onFinalUtterance`; callers now attach BEFORE `appendFinal` so Zustand subscribers see audio_features on the first render

### Phase 1b — Persistence + uncertainty UI (2026-05-29)
- **Session persistence to Neon** — `POST /api/sessions` (Clerk-authed write) + `GET /api/sessions/[id]` (public read); `endSession()` fires fire-and-forget save with `keepalive: true`
- **`/verdict/[id]` route** — shareable verdict URL with VerdictView + AIGeneratedBadge + AIDisclosureFooter
- **AttributionBadge** in `TranscriptView` — surfaces Phase 1a's `attribution_status` with worst-case-wins aggregation across speaker blocks
- **ClaimStanceBadge** on `ClaimCard` — surfaces Phase 1a's `stance` (denied/quoted/mocked/hedged/…)
- **ConfidenceTierBadge** — 3-tier display derived from existing `score` (high ≥ 85, medium ≥ 65, low otherwise)
- **OPINION renders as diamond glyph** instead of full-height stripe (colorblind-safe + screenshot-safe)
- **`/methodology` adds "What Yentl doesn't fact-check" section** — satire, predictions, opinions, hypotheticals, personal experience reports
- **CapReachedSheet paywall scaffold** — V3.11 sheet + `isOverCap` gate (Stripe Checkout deferred to Phase 1d)

### Phase 1c — Editorial integrity + paywall wire (2026-05-29)
- **Security headers on every response** — HSTS preload + X-Content-Type-Options + X-Frame-Options DENY + Referrer-Policy + Permissions-Policy + X-DNS-Prefetch-Control
- **`label_rationale` field** on verify-provisional + verify-confirmed schemas — single sentence defending the boundary call ("Picked MIXED over FALSE because…"); rendered on ClaimCard
- **Disputes scaffold** — `disputes` table + `POST /api/disputes` + `/verdict/[id]/dispute` form + `/corrections` empty-state launch + dispute link on VerdictView
- **Paywall fully wired** — `GET /api/subscriptions/me` + `PaywallGate` client component + mount in session page + `save-session` upserts `audioSecondsUsed` on each save

### Phase 1d — Trimodal integrity (2026-05-29)
- **YouTube URL caption drift fix** — `normalizeTranscriptTime` heuristic was wrong by design; always treat youtube-transcript times as ms. Closes the 467.6-second drift the eval found on da_race_kcra.
- **Revision-event schema** — `RevisionStatus = "initial" | "reopened" | "superseded" | "merged"` on TranscriptSegment + ClaimCard + RhetoricMarker
- **Trimodal eval regression gate** — `compareSummaries()` + `scripts/eval/check-baseline.ts` CLI + saved baseline + 10 unit tests
- **`YENTL_ENABLE_BIPA_DIARIZE` env flag** — env-level kill switch for batch-path diarization
- **`temperature: 0`** on every integrity-critical AI route (extract-claims, verify-provisional, verify-confirmed, analyze-rhetoric) — closes the 0% claim Jaccard the eval found on hitchens_mcgrath SRT-vs-audio

### Phase 1e — BIPA consent + AI Act sweep (2026-05-29)
- **Per-call BIPA consent checkbox** on audio upload pane — dual gate with the env flag; URL/YouTube ingest never sets consent (user can't consent for third-party speakers)
- **Methodology gains "Voiceprint consent for speaker labeling" section** — explains BIPA, the checkbox, Deepgram's no-retention posture
- **YouTube caption paths stop defaulting `speaker_id` to 0** — all 4 paths (parseSrt, Innertube, youtube-transcript items, scraper) now emit `null + attribution_status: "not_available" + provider: "youtube-*"`
- **OpenGraph + Twitter cards** on `/verdict/[id]` — shared verdict URLs render preview cards
- **AIGeneratedBadge** added to dispute + corrections pages (AI Act Art 50 disclosure coverage)

### Verification
- **1489/1489 tests passing** (1374 baseline + 115 new across all phases)
- **`npx tsc --noEmit`** clean
- **Trimodal eval regression gate**: PASS with 4 measured improvements on vance_walz_debate spot-check (claim Jaccard +60pp on SRT/YT, +14pp on SRT/Audio; marker overlap +55pp SRT/YT, +50pp SRT/Audio)

### Deploy notes
- ⚠ `npx drizzle-kit push --force` to materialize the new `disputes` table on preview + prod
- `YENTL_ENABLE_BIPA_DIARIZE` defaults to off — flip to `"1"` only after BIPA disclosure copy ships
- `proxy.ts` now returns `NextResponse.next()` explicitly to carry security headers

---

## [0.2.0] — 2026-05-18

### Compliance foundation

#### Components added
- `components/ui/ai-generated-badge.tsx` — AIGeneratedBadge: AI-content chip with sparkle icon and aria-label; ≥4.5:1 contrast (WCAG AA)
- `components/session/AIDisclosureFooter.tsx` — Persistent footer: "Verdicts are AI-generated. Sources may be incomplete. Use your head."
- `components/ui/skip-to-content.tsx` — Skip-to-content link; first focusable element in layout; anchors to #main-content
- `components/session/SessionTimer.tsx` — 30-minute re-confirmation toast: "Still rolling at 30:00. Pause anytime."
- `components/session/TwoPartyDisclosure.tsx` — Two-party consent disclosure banner; localStorage-flagged; verbatim brand-voice copy
- `components/session/ClaimsLiveRegion.tsx` — aria-live="polite" region for future verdict announcements
- `components/verdict/ReportVerdictButton.tsx` — 44×44 accessible report button with flag icon
- `components/verdict/ReportFlow.tsx` — Report dialog with categorized form; localStorage persistence (yentl.reports)
- `components/verdict/VerdictCard.tsx` — Triple-encoded verdict states (TRUE/FALSE/MIXED/UNVERIFIED); color + icon + label; WCAG 1.4.1 compliant

#### Existing components modified
- `components/session/SessionHeader.tsx` — Pause button promoted to primary (brand-blue #2563EB, default focus); End button demoted to destructive-outline; recording beacon gains `motion-reduce:animate-none`
- `components/session/TranscriptView.tsx` — Transcript container gains `aria-live="polite"`
- `components/ui/button.tsx` — Default size overridden to h-11 (44px) for WCAG 2.5.5 touch target compliance

#### Pages added
- `app/about/page.tsx` — About page: mission, engines (Deepgram Nova-3, Anthropic Claude Opus 4.7, Vercel AI Gateway), taxonomy source, funding model, known limitations
- `app/methodology/page.tsx` — Methodology v1: decision tree, reputation tier definitions, taxonomy summary, engagement-gate rules, prompt-version log
- `app/changelog/page.tsx` — User-facing changelog for methodology/prompt/model changes
- `app/privacy/page.tsx` — Privacy policy: GDPR Art. 6(1)(a) + Art. 9(2)(a) lawful basis; named processors (Deepgram, Anthropic, Vercel); retention (in-memory only); cross-border transfer mechanisms; GDPR rights; CCPA notice; Quebec Law 25
- `app/terms/page.tsx` — Terms of service: informational-only disclaimer; 18+ age limit; no-warranty clause; anti-SLAPP California choice-of-law; user obligations; dispute resolution placeholder
- `app/subprocessors/page.tsx` — Subprocessor table: Deepgram, Anthropic, Vercel with purpose, location, DPA/transfer mechanism
- `app/accessibility/page.tsx` — Accessibility statement: WCAG 2.2 AA conformance status, known gaps, audit date (2026-05-18), contact

#### Routes added
- `app/taxonomy.json/route.ts` — GET /taxonomy.json: 123-entry bias/fallacy/rhetoric taxonomy as JSON with `_license: "CC-BY-4.0"`

#### Documentation added
- `docs/dpia.md` — Data Protection Impact Assessment (EDPB April 2026 template); covers three EDPB high-risk triggers; residual risks identified
- `docs/engagement-gate.md` — Engagement-gate policy spec: ENGAGE/DECLINE_FRIVOLOUS/REFUSE_INAPPROPRIATE decision categories; claim quality + appropriateness buckets; hard refusal list

#### Config changes
- `app/layout.tsx` — Added SkipToContent as first element; added Sonner Toaster
- `app/globals.css` — --ring token updated to oklch(0.4 0 0) (≥3:1 contrast against white, WCAG 2.4.7); contrast rationale commented
- `app/session/page.tsx` — Mounted SessionTimer, TwoPartyDisclosure, ClaimsLiveRegion, AIGeneratedBadge, AIDisclosureFooter; main gets id="main-content"
- `package.json` — Added `sonner` dependency (toast library for SessionTimer)
- `.github/workflows/ci.yml` — Added CI workflow with type-check, lint, vitest, and a11y audit steps

#### Tests added (13 new test files)
- `tests/ai-generated-badge.test.tsx`
- `tests/ai-disclosure-footer.test.tsx`
- `tests/skip-to-content.test.tsx`
- `tests/css-tokens.test.ts`
- `tests/touch-targets.test.tsx`
- `tests/reduced-motion.test.tsx`
- `tests/aria-live-regions.test.tsx`
- `tests/session-header.test.tsx`
- `tests/session-timer.test.tsx`
- `tests/two-party-disclosure.test.tsx`
- `tests/report-flow.test.tsx`
- `tests/verdict-card.test.tsx`
- `tests/taxonomy-route.test.ts`

---

## [0.1.0] — 2026-05-17

### Initial scaffold

- Next.js 16 app with TypeScript, Tailwind v4, shadcn/ui components
- Real-time audio transcription via Deepgram SDK
- Zustand session store
- Taxonomy: 123-entry bias/fallacy/rhetoric taxonomy (CC-BY-4.0)
- Existing tests: dedup, reputation, taxonomy, smoke
