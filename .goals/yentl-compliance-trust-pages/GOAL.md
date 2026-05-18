# Goal: Yentl Compliance — Trust Pages (Group D)

**Slug**: `yentl-compliance-trust-pages`
**Owner**: Israel B. Bitton (b7069484@gmail.com)
**Locked**: 2026-05-18
**Status**: active

> Parent sub-goal of `yentl-compliance-foundation`. Group D (7 trust pages).

---

## Objective

Ship the 6 trust-page routes + 1 taxonomy JSON route that pre-submission checklists (Apple, Play, GDPR notice, App Privacy Details) reference. **Content quality is the bar** — these pages are public legal surface.

## End condition (THE LITERAL TEXT `/goal` EVALUATES)

> ALL of the following are simultaneously true and verified by running the listed commands during the same /goal session, with rendered HTML excerpts surfaced in chat:
>
> 1. **`/about` page** at `app/about/page.tsx` exists. Contains sections (verifiable by grep for `##` headings or `<h2>` elements in rendered HTML):
>    - **What Yentl does** — one paragraph mission statement
>    - **Engines used** — names Deepgram Nova-3, Anthropic Claude Opus 4.7, Vercel AI Gateway (explicit, not "third parties")
>    - **Taxonomy source** — explicitly names "Cognitive Biases & Logical Fallacies Used by Antisemites" by Israel B. Bitton, 2024
>    - **Funding model** — placeholder OK (e.g. "Self-funded; seeking responsible partners") but section present
>    - **Known limitations** — at least 5 honest bullets (AI verdicts may be wrong, sources may be incomplete, English-only v1, etc.)
>    Renders without errors at `http://localhost:3000/about`. Test in `tests/about-page.test.tsx` verifies the page renders + key strings present.
>
> 2. **`/methodology` page** at `app/methodology/page.tsx` exists with:
>    - **Version** label (`v1`)
>    - **Decision tree** — how a claim becomes a verdict (narrative or simple diagram acceptable)
>    - **Reputation tier definitions** — high/medium/low source reputation criteria
>    - **Marker taxonomy** — link to `/taxonomy.json` + summary count
>    - **Decline-to-engage rules** — when Yentl refuses to adjudicate (links to `docs/engagement-gate.md` from sibling `yentl-compliance-docs` if it exists; otherwise prose summary)
>    - **Prompt-version log** — table or list with at least one entry: `v1 · 2026-05-17 · initial baseline`
>    Test in `tests/methodology-page.test.tsx` verifies render + section headings.
>
> 3. **`/changelog` page** at `app/changelog/page.tsx` exists (user-facing — distinct from root `CHANGELOG.md` for the dev). At least one entry: `2026-05-17 · v1 baseline · launch trust layer + accessibility · compliance foundation in progress`. Renders without errors.
>
> 4. **`/privacy` page** at `app/privacy/page.tsx` exists, naming **Deepgram + Anthropic + Vercel** as processors and containing:
>    - **Lawful basis**: GDPR Art 6(1)(a) consent + Art 9(2)(a) explicit consent for sensitive data
>    - **Retention policy**: "No audio or transcripts persisted on Yentl servers in v1; analysis is in-memory only."
>    - **Cross-border transfer mechanism**: SCCs + EU-US Data Privacy Framework (where applicable); Deepgram EU endpoint (`api.eu.deepgram.com`) for EU traffic
>    - **GDPR rights**: access, rectification, erasure, portability, restriction, objection, complaint to supervisory authority
>    - **CCPA notice**: California residents have rights under CCPA; reference Global Privacy Control signal
>    - **Quebec Law 25** acknowledgment
>    - **Contact email** (placeholder OK)
>    - **Last-updated date** (today's date or later)
>    Renders at `/privacy`. Test verifies key strings present.
>
> 5. **`/terms` page** at `app/terms/page.tsx` exists, containing:
>    - **Informational-not-advice disclaimer** (prominent — at top, bolded or in a callout)
>    - **Methodology link** to `/methodology`
>    - **No-warranty clause** (AI may be wrong)
>    - **Age limit**: 18+ (defends against COPPA actual-knowledge per research §7)
>    - **Anti-SLAPP-aware choice-of-law**: California, Texas, or New York (pick one and document why — research §7 recommends these)
>    - **Arbitration / dispute resolution** (placeholder OK; flag with `<!-- TODO: legal review -->`)
>    - **User obligations**: lawful use, no automated abuse, no scraping, no rate-limit evasion
>    Renders at `/terms`. Test verifies key strings.
>
> 6. **`/subprocessors` page** at `app/subprocessors/page.tsx` exists with a table containing rows for Deepgram, Anthropic, Vercel — columns: Purpose, Location (US default / EU optional where applicable), DPA status link (to `docs/dpa-status.md` from `yentl-this-week-actions`), Last-reviewed date. Plain-text accessible.
>
> 7. **`/taxonomy.json` route** exists EITHER as static `public/taxonomy.json` OR Route Handler at `app/taxonomy.json/route.ts` returning valid JSON. Top-level keys include `_license: "CC-BY-4.0"`, `_version: "v1"`, `_source: "Cognitive Biases & Logical Fallacies Used by Antisemites — Israel B. Bitton, 2024"`, and the 123 taxonomy entries from `lib/taxonomy/`. Test in `tests/taxonomy-route.test.ts` fetches the route (or reads the static file), parses JSON, asserts license + version + a known entry name.
>
> 8. **Working tree clean + branch synced**: `git status --porcelain` empty; commits prefixed `compliance:`; branch rebases cleanly onto `origin/main`.

## Success criteria

- [ ] (1) /about page with all required sections + test
- [ ] (2) /methodology page with v1 spec + test
- [ ] (3) /changelog page with first entry
- [ ] (4) /privacy page (GDPR + CCPA + Quebec + named processors) + test
- [ ] (5) /terms page (18+, anti-SLAPP, no-warranty) + test
- [ ] (6) /subprocessors page with vendor table
- [ ] (7) /taxonomy.json route + license + test
- [ ] (8) Clean tree + rebased

## Out of scope

- All other compliance work (sibling sub-goals + umbrella)
- Fact-check pipeline
- Brand asset modifications
- Rebrand
- Touching `app/api/deepgram/**`
- Push to `origin/main`, PR ops
- Major dep upgrades

## Context / references

- `./GOAL.md`, `./guardrails.md`, `./STATE.md`, `./decisions.log`
- **Research §7 (Regulatory) is your source of truth for /privacy and /terms content**. Read it before drafting.
- **Research §8 brand voice copy** applies where natural (especially decline-to-engage strings, error messages, AI disclosure)
- Existing taxonomy: `lib/taxonomy/` (read to understand shape for /taxonomy.json)
- `docs/dpa-status.md` from sibling `yentl-this-week-actions` — link from /subprocessors
- `docs/engagement-gate.md` from sibling `yentl-compliance-docs` — link from /methodology (if exists)

## Budget

- Max cost: $50 · Max wall-clock days: 7 · Max runs: 20 · Per-run cap: $5
