# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

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
