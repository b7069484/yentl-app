# Goal: Yentl Compliance — Documentation (Group F)

**Slug**: `yentl-compliance-docs`
**Owner**: Israel B. Bitton (b7069484@gmail.com)
**Locked**: 2026-05-18
**Status**: active

> Parent sub-goal of `yentl-compliance-foundation`. Group F (DPIA + accessibility statement + engagement-gate policy spec).

---

## Objective

Three documents that must exist before public launch to satisfy regulatory + risk obligations:
- **Accessibility statement** (European Accessibility Act, in force 2025-06-28)
- **DPIA** (GDPR Art. 35 — Yentl hits 3 EDPB high-risk triggers per research §7)
- **Engagement-gate policy spec** (Top Risk #1 mitigation — defamation against identifiable private figures; spec only, runtime in fact-check pipeline goal)

## End condition (THE LITERAL TEXT `/goal` EVALUATES)

> ALL of the following are simultaneously true and verified by running the listed commands during the same /goal session, document excerpts surfaced in chat:
>
> 1. **Accessibility statement**: EITHER a dedicated page at `app/accessibility/page.tsx` OR a clearly-headed `## Accessibility` section in `app/about/page.tsx` (from sibling `yentl-compliance-trust-pages`). Required content:
>    - **Conformance level**: WCAG 2.2 AA target (current status: in-progress / conformant — match actual state of `yentl-compliance-a11y` goal)
>    - **Known limitations**: honest list. If a thing isn't yet accessible, say so with a target date. If sibling a11y goal is mid-flight, say "Audit in progress, expected complete by [date]" and link to `goals/yentl-compliance-a11y` STATE.md or similar.
>    - **Contact for accessibility issues**: email (placeholder OK)
>    - **Date of last audit**: today
>    Verifiable by grep for section headings + key strings.
>
> 2. **DPIA documented**: `docs/dpia.md` exists at the project root following EDPB April 2026 template structure. Required sections (all 8):
>    - **Scope** — what processing this DPIA covers (Yentl v1 web: browser → Deepgram → Anthropic pipeline; no persistent server-side storage)
>    - **Processing purposes** — transcription, fact-check, bias/fallacy analysis
>    - **Lawful basis** — GDPR Art 6(1)(a) consent + Art 9(2)(a) explicit consent for sensitive
>    - **Special-category data assessment** — audio may contain political/religious/health/orientation/ethnicity (Article 9); explicit consent obtained via ConsentGate
>    - **Cross-border transfer assessment** — Deepgram US (DPF + SCCs + TIA), Anthropic US (DPA + SCCs auto-incorporated in Commercial ToS Jan 1, 2026), Vercel US/global edge (DPA + SCCs); for EU users, Deepgram EU endpoint
>    - **Three EDPB high-risk triggers addressed** — (1) innovative technology (LLM fact-checking), (2) potentially large-scale special-category processing, (3) automated decision-making with potentially significant effect (FALSE verdict can affect reputation)
>    - **Mitigations** — no persistence, in-memory only, named-processor disclosure, ConsentGate, RecordingBeacon, ReportFlow, public methodology page, engagement-gate policy (link to docs/engagement-gate.md from clause 3)
>    - **Residual risk** — list what's NOT mitigated and why acceptable
>    - **Author + date** — Israel B. Bitton, [date]
>    File parses as valid markdown. Grep for each section heading confirms presence.
>
> 3. **Engagement-gate policy spec**: `docs/engagement-gate.md` exists, documenting (NOT implementing — runtime is fact-check pipeline goal):
>    - **Decision categories** (verbatim from research §4 Gate type): `ENGAGE`, `DECLINE_FRIVOLOUS`, `REFUSE_INAPPROPRIATE`
>    - **Claim quality buckets**: `verifiable`, `opinion`, `rhetorical`, `joke`, `none`
>    - **Appropriateness buckets**: `ok`, `edgy_but_engage`, `harassment_vector`, `doxxing`, `csam`, `extremism`
>    - **Hard refusals** (per research §4 "Yentl refuses silent"): private-individual harassment vector, hate/extremist/threatening, doxxing, CSAM, defamation-trap setups
>    - **Engage cautiously** (contested-but-factual matters): consensus + named dissents + confidence labeling
>    - **Public policy table** (from research §4): "Yentl engages / engages cautiously / declines / refuses (silent)" with example claim per column
>    - **Why this exists**: Top Risk #1 mitigation (defamation against identifiable private figures); references Walters v. OpenAI (Section 230 doesn't shield AI verdicts)
>    - **Implementation handoff note**: this spec is implemented in the fact-check pipeline goal as a Haiku-based pre-engagement classifier per research §4 architecture
>    Grep confirms each section.
>
> 4. **Working tree clean + branch synced**: `git status --porcelain` empty; commits prefixed `compliance:`; branch rebases cleanly onto `origin/main`.

## Success criteria

- [ ] (1) Accessibility statement (page OR section in /about) with required content
- [ ] (2) `docs/dpia.md` with all 8 sections
- [ ] (3) `docs/engagement-gate.md` with all required sections
- [ ] (4) Clean tree + rebased

## Out of scope

- All other compliance work
- Fact-check pipeline (engagement-gate runtime is there, not here)
- Brand assets
- Rebrand
- `app/api/deepgram/**`
- Main pushes, PR ops
- Major dep upgrades

## Context / references

- Research source: `.project/research/yentl-expansion-research.html` §4 (engagement gate architecture), §7 (Regulatory — GDPR Art 35 DPIA, EDPB triggers), §10 (Top Risk #1 defamation)
- EDPB DPIA template (April 2026): https://edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-dpia_en
- European Accessibility Act guidance: https://ec.europa.eu/social/main.jsp?catId=1202

## Budget

- Max cost: $20 · Max wall-clock days: 5 · Max runs: 10 · Per-run cap: $3
