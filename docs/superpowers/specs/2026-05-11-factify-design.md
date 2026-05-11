# Factify · Design Spec

**Date:** 2026-05-11
**Status:** Brainstorm complete · ready for implementation plan
**Source:** Brainstorm session with Israel B. Bitton

---

## 1. Problem & Goal

Factify is a live fact-checking web app. It listens to someone speaking via the browser microphone, identifies factual claims in near real-time, checks them against reputable sources via live web search, and renders a scored verdict with citations. A second layer continuously analyzes the speaker's rhetoric for cognitive biases, logical fallacies, and manipulative language patterns.

**Long-term use cases:**
- **Personal listening** — news, podcasts, or interviews playing on the side; live fact-check ticker
- **Debate moderator** — display screen at in-person debates that audits speakers live
- **Conversation review** — capture a conversation, walk away with an audited transcript

**v1 goal:** prove the end-to-end pipeline with a single speaker (you) talking into the browser. `capture → transcript → claim → check → score → render`, plus a parallel bias/fallacy pass. Other audio modes layer on top once the pipeline is solid.

---

## 2. v1 Scope

**In scope**
- Single-speaker browser-mic capture (English only)
- Streaming speech-to-text
- Live transcript with claim highlights
- Hybrid C fact-check (provisional → confirmed)
- Per-claim verdict cards: score, label, annotations, sources
- Bias / fallacy / rhetoric detection layer (separate LLM call, ~30s window)
- Two UI modes: A (Two-column, default) and D (Present mode toggle)
- Single browser-tab session; JSON + Markdown export at end

**Out of scope (deferred)**
- System / tab audio capture (news playback)
- Debate mode with speaker diarization
- Uploaded audio / video files
- Non-English languages
- Reader mode (C) and Interleaved feed (B) UI modes
- Auth, multi-user, server-side persistence
- Save / resume sessions (v2 with DB)

---

## 3. Architecture Overview

```
[Browser Mic]
   │  navigator.mediaDevices.getUserMedia → MediaRecorder
   ▼
[Deepgram Streaming WebSocket]   ← direct from browser; audio never hits our backend
   │  partial + final transcript events
   ▼
[Transcript Store (React state, in-memory)]
   │  on `is_final: true`
   ▼
[POST /api/extract-claims]   ← utterance + last 30s + recent-claim hashes
   │  returns 0..N new claim objects
   ▼
[Claim Card Store]
   │  for each new claim, in parallel:
   ├──► [POST /api/verify-provisional]   ~1s   →  card status = "provisional"
   └──► [POST /api/verify-confirmed]     ~5-10s →  card status = "confirmed", citations
   │
   │  periodic: every ~30s OR every ~5 utterances
   ▼
[POST /api/analyze-rhetoric]   ← last ~60s + recent-marker hashes
   │  returns 0..N new bias/fallacy/rhetoric markers
   ▼
[Marker Store]
   ▼
[UI: Mode A (Two-column, default) | Mode D (Present, toggle)]
```

**Trust model**
- Audio: browser ↔ Deepgram only; our server never touches it
- Transcript: lives in browser memory; sent to our server for LLM calls only
- LLM calls: Next.js Route Handlers → Vercel AI SDK → Anthropic (Claude Opus 4.7)
- Sources: Anthropic's native `web_search` tool

---

## 4. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS |
| Components | shadcn/ui |
| Mic capture | Browser MediaRecorder API |
| STT | Deepgram streaming (WebSocket from browser) |
| LLM orchestration | Vercel AI SDK |
| Reasoning model | Claude Opus 4.7 (Anthropic) |
| Web search | Anthropic native `web_search` tool |
| Run mode | `npm run dev` locally → deploy to Vercel later |
| Billing | Pay-as-you-go on each provider |

**Why this combo**
- Browser → Deepgram direct keeps audio off the backend (simpler, cheaper, more private)
- AI SDK abstracts the LLM provider so Claude vs GPT-5 vs Gemini swaps don't require orchestration rewrites
- Anthropic's native `web_search` removes the need for a separate search-provider integration in v1

---

## 5. Audio Capture & Live Transcript

- Capture with `navigator.mediaDevices.getUserMedia({ audio: true })`, pass to `MediaRecorder` in a Deepgram-friendly codec (e.g., `audio/webm; codecs=opus`)
- Stream `dataavailable` chunks over a WebSocket directly to Deepgram
- Deepgram parameters:
  - model: `nova-3` (or the current best general-purpose English model at build time)
  - `language=en`, `punctuate=true`, `smart_format=true`, `interim_results=true`, `utterance_end_ms=1000`
- Events:
  - **Interim** transcript → render in muted gray (overwrites previous interim)
  - **`is_final: true`** → commit utterance to transcript store; fire claim-extraction call
- **Auth:** browser receives a short-lived Deepgram token from `POST /api/deepgram/token`. The long-lived key never leaves the server.

---

## 6. Claim Extraction (Cadence D — utterance-triggered, sliding context, server-side dedup)

**Trigger:** Deepgram `is_final: true` per utterance.

**Endpoint:** `POST /api/extract-claims`
**Input:** `{ utterance, last_30s_context, recent_claim_hashes }`
**Output:** `{ claims: ClaimExtract[] }` — array of zero or more

```ts
type ClaimExtract = {
  claim_text: string;
  utterance_start: number;  // seconds since session start
  utterance_end: number;
};
```

**Prompt shape (sketch):**
> "Below is the most recent utterance and the last ~30s of transcript for context. Extract any new factual claims being made — statements verifiable against external sources. Skip opinions, hypotheticals, predictions, and questions. The user has already returned the claims listed under RECENT_HASHES; do not return those or rephrasings of them. If none, return an empty array."

**Dedup**
- Server-side, per session
- Hash each returned claim text (lowercase, stripped); keep last ~20 in a per-session ring
- Pass the recent set to the LLM each call

**Cost levers (later, not v1):** minimum utterance length, batch short utterances, longer dedup TTL

---

## 7. Source & Check Strategy (Hybrid C — provisional → confirmed)

Two-stage check per claim:

### Stage 1 — Provisional (`POST /api/verify-provisional`)
- Claude Opus 4.7, **no tools**
- Knowledge-only verdict (no sources cited)
- ~1s latency
- Card appears with `status: "provisional"`

### Stage 2 — Confirmed (`POST /api/verify-confirmed`)
- Claude Opus 4.7 with `web_search` tool enabled
- Reads top results; verdict, score, annotations, and sources are grounded in them
- ~5–10s latency
- Card transitions to `status: "confirmed"` — fields may change

**Important prompt invariant:** the provisional pass MUST NOT cite specific sources (no URLs, no domains). Only the confirmed pass produces citations. This avoids hallucinated sources lingering in the UI.

**Failure mode:** if `web_search` returns no reliable sources, the confirmed pass downgrades the verdict to `UNVERIFIABLE` rather than leaving a stale provisional.

**Source reputability tiers** (assigned at render time from the source's domain):
- **High** — Reuters, AP, AFP, major newspapers, peer-reviewed journals, `.gov`, `.edu`
- **Mid** — established outlets, well-cited industry sources
- **Low** — partisan blogs, social media, anonymous sources

Tier is shown as a badge on every citation. Not hard-filtered — the user sees the spread.

---

## 8. Verdict Schema

```ts
type ClaimCard = {
  id: string;                                 // ulid
  claim_text: string;
  utterance_start: number;                    // seconds since session start
  utterance_end: number;
  primary_label:
    | "TRUE" | "MOSTLY_TRUE" | "PARTIAL" | "MISLEADING"
    | "OMISSION" | "FALSE" | "UNVERIFIABLE" | "OPINION";
  score: number;                              // 0-100 factual
  annotations: string[];                      // free-form chips (e.g., "cherry-picked timeframe")
  explanation: string;                        // 1-3 sentences
  status: "checking" | "provisional" | "confirmed";
  sources: Source[];                          // empty for provisional
};

type Source = {
  url: string;
  domain: string;
  title: string;
  reputation_tier: "high" | "mid" | "low";
  stance: "supports" | "contradicts" | "mixed";
  excerpt?: string;
};
```

`OPINION` cards are deemphasized (gray) in the UI — they don't get a numeric score and don't trigger `verify-confirmed`.

---

## 9. Bias / Fallacy Detection Layer (Cadence C — separate call, longer window)

**Trigger:** every ~30s OR every ~5 utterances, whichever comes first.

**Endpoint:** `POST /api/analyze-rhetoric`
**Input:** `{ last_60s_transcript, recent_marker_hashes, taxonomy_ids }`
**Output:** `{ markers: RhetoricMarker[] }`

```ts
type RhetoricMarker = {
  id: string;
  type: "fallacy" | "bias" | "rhetoric";
  name: string;                  // canonical id from taxonomy (§10)
  display: string;               // human label
  excerpt: string;               // verbatim quote from transcript
  start_time: number;
  end_time: number;
  severity: "subtle" | "clear" | "blatant";
  explanation: string;           // 1-3 sentences
};
```

**Prompt shape (sketch):**
> "Analyze the transcript window for cognitive biases, logical fallacies, and rhetorical patterns. You may ONLY use names from the supplied taxonomy. Quote a verbatim excerpt for each marker. Use severity = 'subtle' | 'clear' | 'blatant'. The user has recently surfaced the markers under RECENT_HASHES — do not return those or near-duplicates."

**Dedup:** same approach as claims — per-session marker hashes.

**Display**
- Mode A: lower-right "Markers" panel; clicking a marker highlights the excerpt in the transcript
- Mode D: bottom ticker; markers slide in as they emerge, colored by severity

---

## 10. Bias / Fallacy / Rhetoric Taxonomy (v1)

The v1 taxonomy is seeded from Israel B. Bitton's *An Illustrated Guide to Debunking Jew-Hatred: 55 Common Cognitive Biases and Logical Fallacies Used by Antisemites* (smartBOOKsmart, 2024), plus additional commonly-recognized categories, plus a rhetorical-patterns layer.

**For the 55 book entries, definitions and examples in the bias/fallacy LLM prompt MUST come directly from the PDF** (`~/Desktop/Antisemitism/critical thinking about antisemitism.pdf`). The implementation plan should include a step that ingests the PDF and emits a JSON manifest mapping each canonical id to `{ display, definition, example }`.

**Total: 123 categories. All enabled in v1. Editing happens in app Settings later (not in v1).**

### §I — Cognitive Biases (51)

**Chapter 1 — Decision-Making & Information Processing Biases** *(from book)*
- `anchoring_bias` — Anchoring Bias
- `attentional_bias` — Attentional Bias
- `group_attribution_error` — Group Attribution Error
- `groupthink` — Groupthink
- `status_quo_bias` — Status Quo Bias

**Chapter 2 — Behavioral, Perceptual & Egocentric Biases** *(from book)*
- `dunning_kruger` — Dunning-Kruger Effect
- `focusing_effect` — Focusing Effect
- `framing_effect` — Framing Effect
- `hostile_attribution_bias` — Hostile Attribution Bias
- `negativity_bias` — Negativity Bias
- `priming` — Priming

**Chapter 3 — Belief & Probability Biases** *(from book)*
- `availability_heuristic` — Availability Heuristic
- `confirmation_bias` — Confirmation Bias
- `illusion_of_control` — Illusion of Control
- `neglect_of_probability` — Neglect of Probability
- `wishful_thinking` — Wishful Thinking

**Chapter 4 — Social Biases** *(from book)*
- `bandwagon_effect` — Bandwagon Effect
- `herd_mentality` — Herd Mentality
- `in_out_group_bias` — In-Group / Out-Group Bias
- `stereotyping` — Stereotyping

**Chapter 5 — Memory Biases** *(from book)*
- `false_memory` — False Memory
- `misinformation_effect` — Misinformation Effect
- `rosy_retrospection` — Rosy Retrospection

**Additional commonly-recognized cognitive biases** *(not in book)*
- `halo_effect` · `horn_effect` · `hindsight_bias` · `backfire_effect` · `belief_perseverance`
- `illusory_truth_effect` *(repetition feels true)* · `continued_influence_effect` *(debunked info still sticks)*
- `loss_aversion` · `endowment_effect` · `survivorship_bias` · `selection_bias` · `base_rate_neglect`
- `conjunction_fallacy_bias` *(Linda problem)* · `gamblers_fallacy_bias`
- `authority_bias` · `mere_exposure_effect` · `false_consensus_effect` · `just_world_hypothesis`
- `self_serving_bias` · `fundamental_attribution_error` · `naive_realism` · `bias_blind_spot`
- `outcome_bias` · `optimism_bias` · `affect_heuristic` · `representativeness_heuristic`
- `spotlight_effect` · `curse_of_knowledge`

### §II — Logical Fallacies (57)

**Chapter 1 — Relevance & Distraction Fallacies** *(from book)*
- `ad_hominem` · `non_sequitur` · `red_herring` · `straw_man`

**Chapter 2 — Deficiency in Evidence Fallacies** *(from book)*
- `anecdotal_fallacy` · `appeal_to_ignorance` · `burden_of_proof` · `cherry_picking`
- `circular_reasoning` · `false_analogy` · `false_cause` · `hasty_generalization`
- `proof_by_assertion` · `slippery_slope` · `sweeping_generalization`

**Chapter 3 — False Dilemma Fallacies** *(from book)*
- `excluded_middle` · `false_dilemma` · `sunk_cost` · `zero_sum`

**Chapter 4 — Manipulation Fallacies** *(from book)*
- `ambiguity_fallacy` · `appeal_to_authority` · `appeal_to_complexity` · `appeal_to_emotion`
- `appeal_to_fear` · `appeal_to_nature` · `appeal_to_pity` · `appeal_to_poverty`
- `appeal_to_purity` · `appeal_to_tradition` · `equivocation` · `moving_the_goalposts`
- `reductive_fallacy`

**Additional commonly-recognized fallacies** *(not in book)*
- `tu_quoque` *(whataboutism)* · `no_true_scotsman` · `composition_fallacy` · `division_fallacy`
- `genetic_fallacy` · `loaded_question` *(complex question)* · `begging_the_question`
- `appeal_to_popularity` *(bandwagon fallacy)* · `appeal_to_consequences`
- `texas_sharpshooter` · `gish_gallop` · `galileo_gambit`
- `argument_from_incredulity` · `argument_from_silence` · `middle_ground_fallacy`
- `special_pleading` · `fallacy_fallacy` · `continuum_fallacy` · `single_cause_fallacy`
- `is_ought_fallacy` · `reification_fallacy` · `plurium_interrogationum` · `ad_lapidem`
- `stolen_concept` · `etymological_fallacy`

### §III — Rhetorical Patterns (15) *(not in book)*

- `loaded_language` · `weasel_words` · `false_urgency` · `absolutism` · `vagueness`
- `glittering_generalities` · `dog_whistles` · `innuendo` · `repetition_emphasis`
- `pejorative_framing` · `euphemism` · `dysphemism` · `imprecise_quantifiers`
- `hedge_words` · `code_words`

---

## 11. UI Design

Two layouts, one data model. User toggles between them with a single button in the header.

### Mode A — Two-column (default)
- **Left:** TranscriptView with inline claim highlights
- **Right:** ClaimCard stack
- **Lower-right:** Markers panel (bias / fallacy / rhetoric chips)
- Click a transcript highlight → scroll/focus the corresponding card
- Click a card → scroll the transcript to its anchor
- Click a marker → highlight its excerpt in the transcript

### Mode D — Present (debate display, toggle)
- Full-width TranscriptView, larger typography
- Horizontal ClaimCard strip below
- Bottom ticker for bias/fallacy markers, severity-colored
- Tuned for readability at distance

### Shared components
- `SessionHeader` — REC indicator, timer, session title (editable), mode toggle, mic on/off, "End session" button
- `TranscriptView` — auto-scrolling, finalized text in normal color, interim text in gray
- `ClaimHighlight` — inline span, color reflects label
- `ClaimCard` — label badge, score number, annotation chips, explanation, source list (grouped by stance), status indicator
- `SourceListItem` — domain, title, reputation-tier badge, stance icon, external-link arrow
- `MarkerChip` — type / display / severity / click → highlight excerpt
- `EndSessionDialog` — confirms, then exports JSON + Markdown

### Color semantics
- TRUE / MOSTLY_TRUE → green `#16a34a`
- PARTIAL → amber `#f59e0b`
- MISLEADING / OMISSION → orange `#ea580c`
- FALSE → red `#dc2626`
- UNVERIFIABLE → gray `#6b7280`
- OPINION → muted gray (deemphasized)
- Marker severity: subtle / clear / blatant → gray / amber / red

---

## 12. Session Management

- **Lifetime:** one session per browser tab; state lives in React (no server-side persistence)
- **Identity:** optional free-form title (default = ISO timestamp)
- **New session** clears state; confirmation if a session is active
- **End session** exports both formats (JSON + Markdown) as browser downloads
- **No auth, no multi-user, no save / resume** — deferred to v2

### Export — JSON shape
```json
{
  "title": "...",
  "started_at": "ISO8601",
  "ended_at":   "ISO8601",
  "duration_seconds": 1234,
  "transcript": [{ "text": "...", "start": 0, "end": 4.2 }],
  "claims":  [/* ClaimCard[] */],
  "markers": [/* RhetoricMarker[] */]
}
```

### Export — Markdown shape
- Header: title, dates, duration
- Transcript section: paragraphs of finalized text with `[CLAIM]` and `[MARKER]` excerpts inlined
- Claims section: grouped by `primary_label`, each with score, explanation, citations
- Markers section: grouped by `type` (fallacy / bias / rhetoric), each with excerpt, severity, explanation

---

## 13. API Surface (Next.js Route Handlers)

| Route | Purpose |
|---|---|
| `POST /api/deepgram/token` | Mint a short-lived Deepgram token for the browser |
| `POST /api/extract-claims` | Per-utterance: return new claims (with dedup) |
| `POST /api/verify-provisional` | Stage 1: knowledge-only verdict per claim |
| `POST /api/verify-confirmed` | Stage 2: web_search-grounded verdict per claim |
| `POST /api/analyze-rhetoric` | Periodic: return new bias / fallacy / rhetoric markers |

All POST routes accept the relevant dedup-hash list and return only net-new items.

---

## 14. Environment Variables

| Var | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Claude Opus 4.7 + `web_search` |
| `DEEPGRAM_API_KEY` | Long-lived; only used server-side to mint browser tokens |

---

## 15. Acceptance Criteria

The v1 build is done when:

1. User opens the app at `localhost:3000` and clicks **Start session**.
2. Browser prompts for mic permission; on grant, the REC indicator starts and the timer counts up.
3. User speaks. Within ~1s, finalized text appears in the transcript with correct punctuation.
4. When the user makes a checkable factual claim, within ~2s a **provisional** claim card appears in the right pane (Mode A) with a label, score, and explanation — *no sources cited*.
5. Within ~5–10s, the card transitions to **confirmed** with citations returned by `web_search`. The verdict, score, or annotations may change.
6. Each citation shows domain + reputation tier + stance + external link.
7. Claim highlights in the transcript are clickable and scroll-sync with their card; clicking a card scrolls the transcript to the matching anchor.
8. If the user makes a rhetorical move (cherry-picking, generalization, fear appeal, etc.), within ~30s a marker chip appears in the Markers panel; clicking it highlights the corresponding excerpt in the transcript.
9. Toggling **Present mode** reflows to Mode D (big transcript, horizontal card strip, bottom marker ticker).
10. **End session** downloads both a `.json` and a `.md` file containing the full session data.
11. The bias/fallacy taxonomy lives in a single canonical list; adding a new entry requires only editing that list (no scattered duplication).
12. The 55 book entries use the book's definitions and examples (ingested from the PDF) in the bias/fallacy prompt.

---

## 16. Risks & Open Questions

- **Latency under load.** Can Claude Opus 4.7 + `web_search` stay under ~10s per claim consistently? Need a watchdog that downgrades to UNVERIFIABLE if confirmation runs too long.
- **Hallucinated sources in provisional.** Mitigation is in §7 — the provisional prompt must forbid citations. Verify this at integration time.
- **`web_search` availability and rate limits.** Confirm at build time; if it rate-limits, fallback path is Tavily via AI SDK tools.
- **Deepgram token TTL.** Need to balance long-session safety vs. token expiration mid-session. Auto-refresh on expiry.
- **Dedup is text-hash-based.** Will miss semantically duplicate claims phrased differently. v1 OK; semantic dedup is a v2 polish.
- **MediaRecorder ↔ Deepgram audio format.** Confirm Opus encoding streams cleanly with no decode hiccups.
- **"What is a checkable factual claim?"** The extraction prompt needs explicit handling of: hedged claims ("some say…"), counterfactuals, hypotheticals, predictions, normative statements. v1: skip hypotheticals/predictions/normative; flag hedged claims via `annotations`.
- **Reputation-tier classifier.** Domain → tier mapping. v1 = a curated static list (high/mid/low) + heuristics (`.gov`, `.edu`); unknowns default to `mid`. v2 may use an LLM call or a dedicated classifier.

---

## 17. Implementation Roadmap (preview — the plan-phase will refine)

1. Project scaffold (Next.js 16, Tailwind, shadcn/ui, env config)
2. Deepgram token endpoint + browser mic capture + live transcript view
3. `extract-claims` endpoint + dedup + first claim cards (no verification yet)
4. `verify-provisional` endpoint + card "provisional" state
5. `verify-confirmed` endpoint (with `web_search`) + card transition + source UI
6. `analyze-rhetoric` endpoint + Markers panel
7. Mode A polish + interactions (highlight ↔ card ↔ marker)
8. Mode D layout + toggle
9. Export (JSON + Markdown)
10. PDF → taxonomy manifest ingestion step (so the book's definitions feed the prompt)
11. Production deploy to Vercel + env var configuration
12. End-to-end test against the acceptance criteria (§15)

---

*End of design spec.*
