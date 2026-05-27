# Yentl Committee Report - Content, Copy, Pedagogy, and Media Literacy

    **Committee member:** Naomi Emet  
    **Remit:** Content strategy, editorial voice, trust language, pedagogy, media literacy, anti-misinformation learning design.  
    **Why this name:** Naomi suggests humane presence; Emet means truth. This seat keeps Yentl truthful without becoming scolding or performatively certain.  
    **Date:** 2026-05-21  
    **Workspace:** `/Users/israelbitton/Live FactCheck`


## Evidence Inspected

- `app/page.tsx`, `components/session/source-picker.tsx`, `app/about/page.tsx`, `app/methodology/page.tsx`, `app/privacy/page.tsx`, `app/terms/page.tsx`, `docs/engagement-gate.md`.
- Prompts: `lib/prompts/extract-claims.ts`, `lib/prompts/analyze-rhetoric.ts`, `lib/prompts/verify-provisional.ts`.
- Corpora and rubric: `test-corpus/README.md`, `test-corpus/rubric.md`, `test-corpus-2/README.md`, `test-corpus-2/judgment-key.md`.
- Prior writer, study, flow, UX, security, and synthesis reports.

## Current Strengths

Yentl has a sharp product promise: live transcription, claims, sources, rhetoric markers, and source-linked review. The best copy sounds like a real companion: plain, cautious, and aware that recording other people is serious. The claim detail and marker detail surfaces can become genuine media-literacy teaching tools because they already have the raw ingredients: transcript anchor, claim text, verdict, explanation, sources, and related markers.

The corpus/rubric is a content asset, not just engineering scaffolding. It encodes the educational standards Yentl should teach: claim extraction, source quality, antisemitism/dissent distinction, goad resistance, uncertainty discipline, and fairness across viewpoints.

## Severe Gaps

The app speaks in several voices at once: polished product voice, internal QA voice, provider/engineering voice, AI-marketing voice, and legal placeholder voice. This makes Yentl feel less trustworthy than its underlying concept.

The lead browser-tab card says `Analyze a video I can play`, which undersells the feature and awkwardly centers the user's ability rather than the object of analysis. Better: `Analyze the video on this page`, `Use tab capture`, and `Keep the player open while Yentl listens, transcribes, and checks what is being said.`

Trust copy is ahead of implementation. Privacy claims no persistence and no accounts, but local saved sessions and upload paths exist. Methodology describes an engagement gate, but the runtime path sends extracted claims directly to verification. The terms page contains visible placeholders.

Pedagogically, Yentl is still verdict-first. It labels claims and markers, but it does not yet reliably teach the reasoning habit: what was said, what Yentl checked, why the evidence matters, what could change the result, and how to think about the pattern next time.

## Recommendations

Lock a voice contract: Yentl checks what is being said. It should sound plain, quick, concrete, skeptical without smugness, and transparent without naming every internal system. Use these nouns consistently: video, tab, transcript, claim, source, marker, report, session. Avoid `surfaced`, `functional sample`, `validation fixture`, `proven replay`, provider names, and raw enum labels in normal user routes.

Turn claim/marker detail into a lesson loop:

1. What was said.
2. What Yentl checked.
3. What sources show.
4. What would change this judgment.
5. How certain Yentl is.
6. What to ask next time.

Add context-integrity language before launch: asserted, denied, quoted, joked, repaired, reported, too fragmented to judge. This prevents decontextualizing speech into isolated claim cards.

Reframe the homepage from `scores every claim` to a safer promise: `flags checkable claims, gathers sources, and shows where evidence is strong, mixed, or missing`.

## Launch Blockers

Remove visible legal placeholders; add `/contact`; align privacy with actual save/upload behavior; make consent source-specific and hard; do not publish methodology claims about engagement gating until the runtime gate exists; remove internal validation language from public routes.

## Metrics And Tests

Add copy smoke tests for forbidden terms on public routes. Add comprehension tests: after seeing a claim card, users should distinguish false, mixed, insufficient backing, opinion, and outside-scope. Add human review tasks from `judgment-key.md`: harsh criticism vs antisemitism, reporting hate vs committing hate, quotation vs assertion, Holocaust denial vs discussion of denial.
