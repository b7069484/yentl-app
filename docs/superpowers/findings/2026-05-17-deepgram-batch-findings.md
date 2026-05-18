# Deepgram Batch Ingest — Findings & Implementation Plan

**Date:** 2026-05-17
**Author:** Claude (test-corpus ingest session)
**Status:** Three concrete findings from spot-checking 12 of 100 Deepgram nova-3 batch transcripts. Each has an implementation plan with file targets and test patterns.

**For:** A fresh Claude Code subagent picking up Tasks 12, 14, 16 of `docs/superpowers/plans/2026-05-11-factify-v1.md`. Read this BEFORE implementing those tasks — these findings change parts of their as-written specs.

---

## TL;DR

Test corpus ingest (yt-dlp → Deepgram nova-3 batch with `diarize=true`, `utterances=true`, `paragraphs=true`) on the first 12 of 100 videos surfaced three real problems:

1. **Diarization mis-attributes clips and intonation.** Single-speaker monologues with interjected news clips (e.g., John Oliver) return 9 detected "speakers." Real 2-speaker interviews split cleanly. Pattern: 1 dominant speaker + many minor "speakers" = monologue with interstitial audio.
2. **Proper noun transcription errors.** "Stephen Sackur" → "Stephen Sack." These propagate into web_search queries (Task 14) and degrade source-finding.
3. **Utterance-level extraction is wasteful.** Deepgram returns ~300 utterances for a 25-min interview. The plan's per-utterance extract-claims design = ~300 LLM calls per session. Paragraph-level batching cuts this 3–4×.

All three are addressable in the planned Tasks 12, 14, and 16 — but the as-written specs in `2026-05-11-factify-v1.md` don't yet account for them. Patches below.

---

## Evidence base

Three transcripts examined in depth (all from this session's ingest):

| Video | Type | Duration | Speakers (returned) | Speakers (real) | Utterances | Paragraphs | Confidence |
|---|---|---|---|---|---|---|---|
| `solo_001` John Oliver Venezuela | Solo monologue with clips | 19.5m | **9** | 1 dominant + ~3 clip cameos | 186 | 69 | 0.998 |
| `interview_001` BBC HARDtalk | 2-speaker interview | 24.5m | **2** | 2 | 300 | 78 | 0.995 |
| `interview_002` Krishnan Guru-Murthy/Tarantino | 2-speaker interview | 8.6m | **2** | 2 | 74 | 75 | 0.995 |

**Speaker word distributions:**

```
solo_001 (Oliver):
  speaker 0: 2133 words (74%)  ← Oliver
  speaker 7: 216 words
  speaker 1: 210 words
  speaker 3: 119 words
  speaker 4: 58 words
  speaker 5: 51 words
  speaker 2: 50 words
  (+ 2 more <50 words)
  → clear 1+N pattern: one dominant voice + clip cameos

interview_001 (HARDtalk):
  speaker 1: 2472 words
  speaker 0: 1414 words
  → clean 2-speaker split

interview_002 (Krishnan):
  speaker 1: dominant
  speaker 0: secondary
  → clean 2-speaker split
```

**Utterance length distribution (interview_001):**

| Percentile | Words/utterance |
|---|---|
| p10 | 2 |
| median | 9 |
| p90 | 35 |

Median utterance = 9 words. Too small to be a meaningful unit for claim extraction.

**Smoke-test WER (`solo_005` Hans Rosling TED vs. human captions):**

| Metric | Value |
|---|---|
| WER | 10.92% |
| Reference (ground-truth) words | 1493 |
| Hypothesis (Deepgram) words | 1501 |
| Acceptance threshold (README) | ≤ 15% |

Transcription accuracy is solid. The findings below are about how downstream pipeline (Tasks 12, 14, 16) consumes Deepgram output.

---

## Finding 1 — Diarization

### Problem

Deepgram's diarization is **accurate for clean multi-speaker audio** (HARDtalk: clean 2 speakers, both substantively present) but **over-counts speakers on monologues with interstitial clips** (Oliver: 9 detected, one dominates with 74% of words and the rest are clip cameos in the 50–216 word range).

The pattern is reliable:
- **Real N-speaker content:** word distribution roughly proportional to airtime; minor speaker still has thousands of words for long-form, hundreds for shorter.
- **Monologue + clips:** strong power-law — one speaker has 60–80%+ of words, the rest each have <20%.

If the orchestrator (Task 16) trusts raw Deepgram `speaker` IDs:
- Claims will be mis-attributed (a claim made by a Vox news clip Oliver played would be tagged to a phantom "speaker 7" rather than recognized as "quoted material in Oliver's monologue").
- Bias/fallacy markers (Task 17) will think a single voice is multiple people, fragmenting the marker timeline.

### Implementation plan

**Location:** New module `lib/server/diarization.ts`. Consumed by Task 12 (extract-claims) and Task 17 (analyze-rhetoric), wired through Task 16 (orchestrator).

**Algorithm:**

```ts
// lib/server/diarization.ts
export type SpeakerProfile = {
  speakerId: number;
  wordCount: number;
  fractionOfTotal: number;
  role: "primary" | "secondary" | "clip" | "ignore";
};

export type DiarizationSummary = {
  totalSpeakers: number;
  totalWords: number;
  speakers: SpeakerProfile[];
  pattern: "solo" | "interview" | "panel" | "monologue_with_clips";
};

const PRIMARY_THRESHOLD = 0.20;   // ≥20% of words = primary speaker
const SECONDARY_THRESHOLD = 0.05; // 5-20% = secondary participant
const CLIP_THRESHOLD = 0.05;      // <5% = likely interstitial clip

export function profileSpeakers(words: Array<{ speaker: number }>): DiarizationSummary {
  const counts = new Map<number, number>();
  for (const w of words) counts.set(w.speaker, (counts.get(w.speaker) ?? 0) + 1);
  const total = words.length;

  const speakers: SpeakerProfile[] = [...counts.entries()]
    .map(([speakerId, wordCount]) => {
      const fractionOfTotal = wordCount / total;
      let role: SpeakerProfile["role"];
      if (fractionOfTotal >= PRIMARY_THRESHOLD) role = "primary";
      else if (fractionOfTotal >= SECONDARY_THRESHOLD) role = "secondary";
      else role = "clip";
      return { speakerId, wordCount, fractionOfTotal, role };
    })
    .sort((a, b) => b.wordCount - a.wordCount);

  const primaries = speakers.filter((s) => s.role === "primary");
  let pattern: DiarizationSummary["pattern"];
  if (primaries.length === 1 && speakers.length === 1) pattern = "solo";
  else if (primaries.length === 1) pattern = "monologue_with_clips";
  else if (primaries.length === 2) pattern = "interview";
  else pattern = "panel";

  return { totalSpeakers: speakers.length, totalWords: total, speakers, pattern };
}

// For mid-session: classify a single utterance's primary speaker
export function attributeUtterance(
  utterance: { words: Array<{ speaker: number }> },
  summary: DiarizationSummary
): { speakerId: number; isQuotedClip: boolean } {
  const counts = new Map<number, number>();
  for (const w of utterance.words) counts.set(w.speaker, (counts.get(w.speaker) ?? 0) + 1);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const [speakerId] = sorted[0];
  const profile = summary.speakers.find((s) => s.speakerId === speakerId);
  const isQuotedClip = profile?.role === "clip";
  return { speakerId, isQuotedClip };
}
```

**Wire into Task 16 (orchestrator):**

The orchestrator currently accepts `TranscriptSegment` (per-utterance). When it processes a final utterance, it should consult the running speaker summary:

```ts
// lib/client/orchestrator.ts — patch
import { profileSpeakers, attributeUtterance } from "@/lib/server/diarization";

// session-store needs to accumulate a speaker summary as utterances arrive
// (existing TranscriptSegment must carry the per-word speaker IDs from Deepgram)

export async function onFinalUtterance(segment: TranscriptSegment) {
  const { transcript, speakerSummary } = useSession.getState();
  const attribution = attributeUtterance(segment, speakerSummary);

  // ... existing claim-extraction logic, but pass attribution to extract-claims:
  body: JSON.stringify({
    utterance: segment.text,
    speaker_id: attribution.speakerId,
    is_quoted_clip: attribution.isQuotedClip,  // NEW
    ...
  });
}
```

**Wire into Task 12 (extract-claims):**

The prompt should know whether the utterance is from the session's primary voice or a quoted clip:

```ts
// lib/prompts/extract-claims.ts — patch SYSTEM
const SYSTEM = `...
ATTRIBUTION RULES:
- If is_quoted_clip=true: the utterance was played as a CLIP within someone else's monologue. Tag claims as quoted material, not as the session-primary speaker's assertion.
- If is_quoted_clip=false: this is the primary speaker's own assertion.
...`;
```

And add `speaker_id` and `is_quoted_clip` to the extract-claims request schema.

**Wire into session-store:**

Add `speakerSummary: DiarizationSummary` to the store, updated incrementally as utterances arrive. The store currently doesn't track per-word speaker IDs; `TranscriptSegment` needs a `words` field carrying Deepgram's word-level speaker tags.

**Test pattern:**

```bash
# After implementing:
npm run corpus:replay -- --id=solo_001  # Oliver monologue
# Expected: speakerSummary.pattern = "monologue_with_clips"
# All claims tagged with attribution.isQuotedClip when from speakers 1-8
# All Oliver claims (speaker 0) tagged isQuotedClip=false

npm run corpus:replay -- --id=interview_001  # HARDtalk
# Expected: speakerSummary.pattern = "interview"
# 2 primary speakers; no quoted-clip attributions

npm run corpus:replay -- --id=cable_005  # Question Time (5+ speakers)
# Expected: pattern = "panel"
# All speakers above 5% threshold get primary/secondary role
```

**Don't:**
- Don't try to identify speakers by NAME from audio alone. That requires a speaker-recognition model we don't have. Diarization gives us anonymous speaker IDs (0, 1, 2, ...); identifying *who* a speaker is comes from text content + session metadata.
- Don't collapse all minor speakers into "noise." A 5-min clip of a senator played within an Oliver monologue IS substantively quoted material. The `isQuotedClip` flag is for attribution, not for filtering.

---

## Finding 2 — Proper noun errors

### Problem

Deepgram nova-3 mis-transcribes proper nouns at a low but consistent rate. Observed:
- "Stephen Sackur" → "Stephen Sack" (BBC HARDtalk host)
- (Other examples likely as ingest continues — early sample only)

This will degrade Task 14 (verify-confirmed) in two ways:
1. `web_search` queries built from the claim text will search for the wrong name and return 0 results, or worse, return results about a different person.
2. The `sources` returned will be irrelevant or non-existent.

The error rate is low (transcript confidence is 99.5%+ for non-proper-noun content), so naive solutions like always-do-NER would over-engineer. The fix is to **let the LLM in Task 14 know that proper nouns may be approximate** and try fuzzy variants when web_search returns nothing.

### Implementation plan

**Location:** Patch `lib/prompts/verify-confirmed.ts` SYSTEM prompt and add a retry behavior to `app/api/verify-confirmed/route.ts`.

**Prompt patch:**

```ts
// lib/prompts/verify-confirmed.ts — patch SYSTEM
export const SYSTEM = `You are a fact-checker grounding a single claim in real sources.

The claim text comes from automatic speech-to-text and may contain TRANSCRIPTION
ERRORS — especially on proper nouns (names, organizations, places). If your
first web_search returns 0 reliable results, do not immediately conclude
UNVERIFIABLE. Try ONE follow-up search with phonetic / fuzzy variants of the
proper nouns. Common patterns:
  - Truncated surnames: "Sack" → try "Sackur"
  - Phonetic substitutions: "Nawez" → try "Nawaz"
  - Dropped diacritics: "Friedlander" → try "Friedländer"
  - Initials misread as words: "JD Vance" might be transcribed "Jaydee Vance"

After the retry, if still no reliable sources, label UNVERIFIABLE.

Use the web_search tool to find authoritative sources. Prefer Reuters, AP, AFP,
major newspapers, peer-reviewed journals, .gov, .edu. Avoid partisan blogs and
social media unless they are the original source.

(... rest of existing SYSTEM ...)`;
```

**Increase maxUses on web_search:**

The current spec (line 1701 of plan) sets `maxUses: 5`. With the retry behavior, bump to `8` to give headroom for the fuzzy retry pass.

```ts
// app/api/verify-confirmed/route.ts — patch line 1701
tools: {
  web_search: anthropic.tools.webSearch_20250305({ maxUses: 8 }),
},
```

**Optionally** (defer to v1.1 unless quality is bad): build a known-entity dictionary from the session transcript that the LLM can consult. Skip for v1 — the prompt-level fix is the 80/20.

**Test pattern:**

```bash
# Manually craft a claim with a known transcription error
curl -X POST http://localhost:3000/api/verify-confirmed \
  -H 'Content-Type: application/json' \
  -d '{"claim_text":"Stephen Sack hosts BBC HARDtalk."}' | jq

# Expected: NOT UNVERIFIABLE. The LLM should retry as "Stephen Sackur"
# and return sources from bbc.co.uk.
```

Also run against `corpus:replay --id=interview_001` once Task 14 ships — the HARDtalk transcript has the actual "Stephen Sack" error, so we get a real-world test.

**Don't:**
- Don't add a NER pre-processing step. Adds latency to the live pipeline; the prompt-level fix is cheaper.
- Don't try to correct the transcript in-place. The user's UI shows the actual transcript — silently rewriting it would be misleading. The correction only happens *inside the LLM's reasoning when searching*.

---

## Finding 3 — Utterance-level extraction is wasteful

### Problem

Deepgram returns very granular utterances (median 9 words; p10 = 2 words). The current Task 12 spec (`lib/client/orchestrator.ts` in the plan) fires `/api/extract-claims` per final utterance — meaning a 25-min interview generates ~300 LLM calls just for extraction, before any verification.

At Opus 4.7 pricing through the AI Gateway, that's a real cost concern:
- Rough math: 300 extract-claims calls × ~1500 input tokens (system + context + utterance) × $15/M = ~$6.75 per 25-min session just for extraction.
- Plus 300 deduplicated × 2 verifications (provisional + confirmed) = up to 600 more LLM calls.
- Worst case: ~$30 per active 25-min session. Not viable at scale.

**Deepgram already provides paragraphs** (we set `paragraphs=true` in ingest). For interview_001, paragraph count = 78 vs. 300 utterances — a **3.8× reduction** in extract-claims calls with no loss of granularity for downstream display (utterances are still used for transcript rendering and bias-marker excerpts).

For analyze-rhetoric (Task 17), the planned 30s/5-utterance window already does similar batching. The change is **only** to extract-claims.

### Implementation plan

**Location:** Modify `lib/client/orchestrator.ts` (Task 16), `app/api/extract-claims/route.ts` (Task 12), and the Deepgram client `lib/client/deepgram-stream.ts` (already in repo — needs to emit paragraph boundaries, not just utterances).

**Algorithm:**

```
Listen for Deepgram final utterances as before, but accumulate them into a
"paragraph buffer." Flush to /api/extract-claims when EITHER:
  1. A natural paragraph break is detected (Deepgram emits these on
     prolonged silence + topic shift; surfaced in the `paragraphs` field of
     the final response, but for STREAMING we use a proxy: silence gap > 1.5s
     OR sentence count >= 3 within the buffer),
  2. The buffer holds >= 60 words (cap on latency — we don't want fact-check
     cards to lag the speech by too long),
  3. The user pauses the session.
```

**Deepgram WebSocket detail:**

The streaming WebSocket API does NOT return the `paragraphs` field in real time — only the batch endpoint does. So in live mode we need the proxy heuristic. Test it on the corpus first: replay each cached transcript by feeding utterances one-by-one to the buffer logic and confirm the buffer flushes match Deepgram's own paragraph boundaries within ±1 utterance.

**Patches:**

```ts
// lib/client/orchestrator.ts — replace per-utterance flush with buffered flush

const SILENCE_GAP_MS = 1500;
const MIN_WORDS = 30;
const MAX_WORDS = 60;
const MAX_SENTENCES = 3;

class ParagraphBuffer {
  private utterances: TranscriptSegment[] = [];
  private lastEnd = 0;

  shouldFlush(next: TranscriptSegment): boolean {
    if (this.utterances.length === 0) return false;
    const gapMs = (next.start - this.lastEnd) * 1000;
    const wordCount = this.utterances.reduce((n, u) => n + u.text.split(/\s+/).length, 0);
    const sentenceCount = this.utterances.reduce(
      (n, u) => n + (u.text.match(/[.!?]+/g)?.length ?? 0),
      0
    );
    if (gapMs >= SILENCE_GAP_MS && wordCount >= MIN_WORDS) return true;
    if (wordCount >= MAX_WORDS) return true;
    if (sentenceCount >= MAX_SENTENCES && wordCount >= MIN_WORDS) return true;
    return false;
  }

  push(seg: TranscriptSegment) {
    this.utterances.push(seg);
    this.lastEnd = seg.end;
  }

  flush(): { text: string; start: number; end: number; utterances: TranscriptSegment[] } | null {
    if (this.utterances.length === 0) return null;
    const text = this.utterances.map((u) => u.text).join(" ");
    const result = {
      text,
      start: this.utterances[0].start,
      end: this.lastEnd,
      utterances: [...this.utterances],
    };
    this.utterances = [];
    return result;
  }
}

const buffer = new ParagraphBuffer();

export async function onFinalUtterance(segment: TranscriptSegment) {
  if (buffer.shouldFlush(segment)) {
    const para = buffer.flush();
    if (para) await extractClaimsForParagraph(para);
  }
  buffer.push(segment);
}

async function extractClaimsForParagraph(para: { text: string; start: number; end: number }) {
  const res = await fetch("/api/extract-claims", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      paragraph: para.text,
      paragraph_start: para.start,
      paragraph_end: para.end,
      context: /* preceding ~60s */,
      recent_hashes: recentClaimHashes.toArray(),
    }),
  });
  // ... rest unchanged
}
```

**Patch Task 12 prompt to receive paragraphs instead of single utterances:**

```ts
// lib/prompts/extract-claims.ts — patch userPrompt signature
export function userPrompt(args: {
  paragraph: string;
  paragraph_start: number;
  paragraph_end: number;
  context: string;
  recent_hashes: string[];
}): string {
  return `PARAGRAPH (start=${args.paragraph_start}, end=${args.paragraph_end}):
${args.paragraph}

CONTEXT (preceding ~60s):
${args.context}

RECENT_HASHES:
${args.recent_hashes.join("\n") || "(none)"}`;
}
```

The schema (`ExtractedClaim`) stays the same — claims still have `utterance_start`/`utterance_end` for UI scroll-sync, but they can range across the paragraph rather than being pinned to a single utterance.

**Edge cases:**

- **Long monologues with no silence gap** (Oliver, academic lectures): MAX_WORDS=60 caps the buffer to ~20s of speech. Don't make this much larger or the fact-check feels too laggy.
- **Rapid-fire debates with constant interjection** (Question Time, cable panels): Silence gaps may never trigger. MAX_WORDS will dominate — that's fine, we still get a 3-4× reduction in calls vs per-utterance.
- **Session start:** Need to flush the first paragraph proactively if the user pauses, not wait forever for the next utterance.

**Cost re-estimate after the fix:**

- Paragraphs per 25-min interview: ~78 (vs. 300 utterances) → 78 extract-claims calls
- At same ~1500 input tokens, $15/M → ~$1.75 per 25-min session for extraction
- Plus verifications: still gated by dedup; assume 20–30 unique claims → 40–60 verify calls
- **Total: ~$5–8 per 25-min session** — 4× cheaper than the as-written design, viable at scale.

**Test pattern:**

```bash
# Replay the cached transcripts as if streamed live and count extract-claims calls
npm run corpus:replay -- --id=interview_001 --count-only
# Expected: ~78 extract-claims calls, not 300

# Compare the claim sets between per-utterance (old) and per-paragraph (new)
# on the same transcript; recall should be within 5% (paragraph batching may
# miss claims that span paragraph boundaries — rare but possible)
```

**Don't:**
- Don't batch utterances arbitrarily by count alone (e.g., "every 5 utterances"). That breaks on rapid-fire content where 5 utterances might be 10 words total, and on long monologues where 5 utterances might be 200 words.
- Don't wait too long for silence gaps. 1.5s is the upper bound for "natural" speech pauses; longer and the cards feel laggy.
- Don't rebuild your own paragraph detection if Deepgram returns one. For batch (test-corpus) use Deepgram's `paragraphs` directly; for live (production), use the heuristic above.

---

## Pickup instructions for the implementer

1. **Read this whole document.** Especially the "Don't" sections — they encode failure modes I noticed while gathering the data.
2. **Read the existing plan sections** for Tasks 12, 14, 16 in `docs/superpowers/plans/2026-05-11-factify-v1.md` so you know what's being patched, not just what's new.
3. **Implementation order:** Finding 3 (utterance density) first because it changes the orchestrator and the extract-claims signature — and Finding 1 (diarization) plugs into the same orchestrator. Doing Finding 3 first means Finding 1's wiring slots in cleanly. Finding 2 (proper nouns) is independent and can land any time after Task 14.
4. **Use the cached transcripts** in `test-corpus/transcripts/` as test fixtures. They are real Deepgram outputs with all the warts the live pipeline will see.
5. **Verification:** the corpus harness includes `scripts/test-corpus/replay.ts` (currently a stub). Once Tasks 12, 14, 16 ship, that script becomes the regression harness for these findings. Don't claim the fixes are working until `replay.ts` runs end-to-end against the cached transcripts and the metrics line up:
   - Finding 1: `speakerSummary.pattern` matches expected per-video pattern (catalog in `test-corpus/videos.csv` `speakers` and `overlap` columns)
   - Finding 2: 0 UNVERIFIABLE labels on claims whose only error is a known proper-noun transcription
   - Finding 3: extract-claims call count per session = paragraph count, not utterance count

6. **What NOT to add to v1:** the user has explicitly preferred velocity over polish. The defer-to-v1.1 items in this doc are clearly marked. Resist the urge to add NER pre-processing, speaker-recognition models, or fancier batching heuristics. Ship the three patches above and let real-user data tell us what's next.

---

*End of report. The corpus harness is committed; cached transcripts are the regression suite. Good luck.*
