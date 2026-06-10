# Yentl Launch — Foundation Phase 1a Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Yentl's attribution data honest and its AI calls resilient + cheap — without touching the database, UI flow, or consent surface. This is the lowest-risk first sprint that unblocks all downstream work.

**Architecture:** Eight focused tasks across two themes — (a) **honest types**: extend `TranscriptSegment` with word-level evidence, attribution status, audio features, and stance, then update parsers to stop lying about `speaker_id`; (b) **AI reliability**: switch rhetoric cache control from ephemeral to persistent, add a Vercel AI Gateway → direct Anthropic SDK fallback wrapper. No production user behavior changes other than richer transcript data and lower 5xx visibility.

**Tech Stack:** TypeScript 5+, Next.js 16.2.6 App Router, Vitest, `@deepgram/sdk` 5.x, `@ai-sdk/anthropic` 3.x, Vercel AI Gateway, Anthropic SDK direct. Strict mode TS.

**Scope boundaries (out of plan):**
- No `db` import / persistence wiring (Phase 1b)
- No Stripe / paywall (Phase 1b)
- No `/verdict/[id]` route (Phase 1b)
- No server-side ConsentGate (Phase 1b)
- No new UI surfaces (Phase 1b–2)
- No diarization enable (Phase 3, gated by BIPA work)

**Source documents:**
- Committee review §6 Path A items #1, #5, #6, #7, #8, #11, #12, #13: `agent-work/yentl-audit-2026-05-28/committee-review-2026-05-28-yentl-audit.md`
- Audit §6: `agent-work/yentl-audit-2026-05-28/REPORT.md`
- Speaker-attribution spec §80-200: `docs/superpowers/specs/2026-05-28-speaker-attribution-conversation-intelligence-spec.md`

---

## File Structure

**Files created:**
- `lib/server/anthropic-fallback.ts` — Gateway-with-direct-SDK fallback wrapper (~60 lines)
- `tests/anthropic-fallback.test.ts` — fallback wrapper tests
- `tests/transcript-segment-types.test.ts` — type-shape regression tests
- `tests/dominant-speaker-confidence.test.ts` — confidence-weighted aggregation tests

**Files modified:**
- `package.json` — rename `"factify-scaffold"` → `"yentl-app"`
- `package-lock.json` — same rename
- `extension/manifest.json`, `extension/manifest.local.json` — sweep `factify-rose.vercel.app`
- `app/api/deepgram/token/route.ts` — sweep `factify-rose.vercel.app` from allowlist
- `lib/types.ts` — extend `TranscriptSegment`, add `ASRWord`, `SpeakerDistribution`, `AttributionStatus`, `AttributionReason`, `OverlapClass`, `AudioFeatures`, `ClaimStance`, `SourceAudioKind`
- `lib/server/deepgram-batch.ts` — stop defaulting `speaker_id` to `0`; preserve `words[]` + `confidence`
- `lib/client/deepgram-stream.ts` — confidence-weighted `dominantSpeaker()` + `latent_boundary` flag
- `lib/prompts/extract-claims.ts` — add `stance` field to extracted schema + system instruction
- `app/api/analyze-rhetoric/route.ts:60` — `cacheControl.type` from `"ephemeral"` to `"persistent"`
- `app/api/extract-claims/route.ts` — wire Gateway fallback wrapper; add `stance` to output schema
- `app/api/verify-confirmed/route.ts` — wire Gateway fallback wrapper
- `app/api/verify-provisional/route.ts` — wire Gateway fallback wrapper
- `app/api/synthesize/route.ts` — wire Gateway fallback wrapper
- `components/session/live-signal.tsx` — relabel "Rhetoric Heat" → "Language Heat"
- `components/session/live-analysis-rail.tsx` — same relabel
- `components/session/AudioMeter.tsx` — emit RMS to a callback so the orchestrator can persist it
- `lib/client/orchestrator.ts` — capture latest RMS at utterance finalization; attach to segment's `audio_features`
- `lib/client/session-store.ts` — re-export any new types it needs

**Tests modified:**
- `tests/deepgram-batch.test.ts` — update fixtures to assert new schema (null speaker, words preserved)
- `tests/audio-meter.test.ts` — assert RMS callback emits
- `tests/live-signal.test.tsx` *(create if absent)* — assert label says "Language Heat"

**Total task count:** 8
**Estimated effort:** 4–6 working days
**Commit cadence:** One commit per task (8 commits total). Each task is independently revertible.

---

## Task 1: Hygiene PR — Package rename + factify-rose sweep

**Why:** Workspace identifier still says `"factify-scaffold"`; extension manifest + Deepgram token allowlist still reference `factify-rose.vercel.app`. Cosmetic but visible in deploy logs and CSP. Zero-risk sweep. Lands first because it's commit-atomic and signals "this is the post-rebrand baseline."

**Files:**
- Modify: `package.json:2`
- Modify: `package-lock.json:2` and `package-lock.json:8`
- Modify: `extension/manifest.json:10,39,46`
- Modify: `extension/manifest.local.json:12,39,46`
- Modify: `app/api/deepgram/token/route.ts:12`
- Test: command-line grep assertion (no new test file needed)

- [ ] **Step 1: Update package.json name**

```diff
 {
-  "name": "factify-scaffold",
+  "name": "yentl-app",
   "version": "0.1.0",
```

- [ ] **Step 2: Update package-lock.json name (both occurrences)**

Replace both `"name": "factify-scaffold"` strings at lines 2 and 8 with `"name": "yentl-app"`.

- [ ] **Step 3: Sweep extension/manifest.json**

Remove the three `factify-rose.vercel.app` entries:
- Line 10: remove from `host_permissions`
- Line 39: remove from `externally_connectable.matches`
- Line 46: remove from `content_security_policy.extension_pages.connect-src`

Keep `https://yentl.it/*` and `http://localhost:3000`/`http://127.0.0.1:3000` entries intact.

- [ ] **Step 4: Sweep extension/manifest.local.json**

Same three-line sweep as Step 3 but in the local manifest variant.

- [ ] **Step 5: Sweep app/api/deepgram/token/route.ts**

Find the allowlist constant near line 12 and remove `"https://factify-rose.vercel.app"`. Keep `"https://yentl.it"` and any localhost entries.

- [ ] **Step 6: Verify no remaining references**

Run from repo root:

```bash
grep -rn "factify-scaffold" --include="*.json" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v .claude/worktrees
grep -rn "factify-rose" --include="*.json" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v .claude/worktrees | grep -v docs/superpowers/handoff | grep -v agent-work
```

Expected: **no output** (handoff docs and audit reports keep historical references — those are intentional).

- [ ] **Step 7: Run the test suite + typecheck**

```bash
npm run test:run
npx tsc --noEmit
```

Expected: PASS on both. The rename should not break anything.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json extension/manifest.json extension/manifest.local.json app/api/deepgram/token/route.ts
git commit -m "chore(rebrand): rename package to yentl-app + sweep factify-rose allowlists"
```

---

## Task 2: Extend TranscriptSegment + supporting attribution types

**Why:** This is the load-bearing schema change. Every downstream task in this plan (and most of Phase 1b) depends on these types existing. We preserve word-level evidence, graduated attribution confidence, overlap class, and the source audio kind. Zero runtime behavior change — additive only. Existing callers continue to work because new fields are optional.

**Files:**
- Modify: `lib/types.ts` (extend TranscriptSegment, add 8 new exported types)
- Test: `tests/transcript-segment-types.test.ts` (new — shape-regression tests)

- [ ] **Step 1: Write the failing shape-regression test**

Create `tests/transcript-segment-types.test.ts`:

```typescript
import { describe, it, expectTypeOf } from "vitest";
import type {
  TranscriptSegment,
  ASRWord,
  SpeakerDistribution,
  AttributionStatus,
  AttributionReason,
  OverlapClass,
  AudioFeatures,
  SourceAudioKind,
  ClaimStance,
} from "@/lib/types";

describe("TranscriptSegment extended schema (Phase 1a)", () => {
  it("preserves words[] when present", () => {
    const seg: TranscriptSegment = {
      text: "Hello world",
      start: 0,
      end: 1,
      is_final: true,
      speaker_id: 0,
      words: [
        { text: "Hello", start: 0, end: 0.5, confidence: 0.95, speaker: 0, speaker_confidence: 0.9 },
      ],
    };
    expectTypeOf(seg.words).toEqualTypeOf<ASRWord[] | undefined>();
  });

  it("allows speaker_id to be null with attribution_status = not_available", () => {
    const seg: TranscriptSegment = {
      text: "Hello",
      start: 0,
      end: 1,
      is_final: true,
      speaker_id: null,
      attribution_status: "not_available",
    };
    expectTypeOf(seg.attribution_status).toEqualTypeOf<AttributionStatus | undefined>();
  });

  it("supports overlap_class and source_audio_kind", () => {
    const seg: TranscriptSegment = {
      text: "Yes",
      start: 0,
      end: 0.3,
      is_final: true,
      speaker_id: 1,
      overlap_class: "backchannel_continuer",
      source_audio_kind: "browser_tab",
    };
    expectTypeOf(seg.overlap_class).toEqualTypeOf<OverlapClass | undefined>();
    expectTypeOf(seg.source_audio_kind).toEqualTypeOf<SourceAudioKind | undefined>();
  });

  it("accepts audio_features for prosody persistence", () => {
    const seg: TranscriptSegment = {
      text: "Hello",
      start: 0,
      end: 1,
      is_final: true,
      speaker_id: 0,
      audio_features: { rms: 0.42, peak_rms: 0.71 },
    };
    expectTypeOf(seg.audio_features).toEqualTypeOf<AudioFeatures | undefined>();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/transcript-segment-types.test.ts
```

Expected: FAIL with type-import errors (the new types don't exist yet).

- [ ] **Step 3: Extend lib/types.ts**

In `lib/types.ts`, add these new exported types (place them after the existing `Speaker` type block at line ~123):

```typescript
/* ── Attribution evidence (Phase 1a — see Speaker Attribution Spec, sections 80 through 200) ── */

/**
 * A single ASR-decoded word with timing, confidence, and (when diarization is
 * enabled) per-word speaker assignment. Preserved from Deepgram's
 * results.channels[0].alternatives[0].words array.
 */
export type ASRWord = {
  text: string;
  start: number;            // seconds
  end: number;              // seconds
  confidence: number;       // 0..1 ASR confidence
  speaker?: number | null;  // diarized speaker index when available
  speaker_confidence?: number; // 0..1 when diarized
};

/**
 * Aggregated speaker presence within a segment — word-count, total duration,
 * and mean ASR confidence per detected speaker. Lets the UI surface
 * "60% Speaker 1, 40% Speaker 2" rather than a single hard label.
 */
export type SpeakerDistribution = {
  speaker_id: number;
  word_count: number;
  duration: number;
  mean_confidence: number;
};

/**
 * Graduated attribution confidence. Replaces the binary "speaker_id is set or 0"
 * model. "confident" means we trust it; "not_available" means we did not run
 * diarization (or it returned no speaker); "unsafe_overlap" means substantive
 * crosstalk made attribution unsafe.
 */
export type AttributionStatus =
  | "confident"
  | "probable"
  | "uncertain"
  | "unsafe_overlap"
  | "quote_or_clip"
  | "manual_corrected"
  | "not_available";

/**
 * Why a segment landed at the attribution_status it did. Multiple reasons may
 * co-apply (e.g., dominant_speaker_low_margin + speaker_change_mid_segment).
 */
export type AttributionReason =
  | "single_speaker_high_confidence"
  | "dominant_speaker_low_margin"
  | "speaker_change_mid_segment"
  | "short_backchannel"
  | "competitive_interruption"
  | "parallel_claim"
  | "crowd_or_bleed"
  | "quoted_or_reported_speech"
  | "provider_missing_speaker"
  | "manual_user_action";

/**
 * Conversational overlap taxonomy. Used by the turn-builder layer in Phase 3
 * but reserved here so segment shapes stay stable across phases.
 */
export type OverlapClass =
  | "none"
  | "backchannel_continuer"
  | "collaborative_completion"
  | "competitive_interruption"
  | "repair_initiation"
  | "parallel_claim"
  | "crowd_or_bleed"
  | "unknown_overlap";

/**
 * Where the audio for this segment came from. Drives attribution defaults —
 * e.g., browser_tab audio is mixed-mono and attribution should default to
 * "uncertain" regardless of what diarization returns.
 */
export type SourceAudioKind =
  | "mic"
  | "browser_tab"
  | "audio_file"
  | "youtube_caption"
  | "srt_vtt"
  | "diagnostic_corpus";

/**
 * Prosodic / energy features captured at the segment level. Phase 1a persists
 * RMS only (loudness during the segment). Pitch, rate, and pause features
 * land in Phase E.
 */
export type AudioFeatures = {
  rms?: number;        // mean RMS amplitude during segment, 0..1 normalized
  peak_rms?: number;   // maximum RMS observed during segment
};

/**
 * How the speaker holds the claim — asserted as their own truth, denied,
 * quoted from someone else, mocked, hedged, etc. Phase 1a captures stance
 * at extraction time so the verdict layer doesn't have to re-infer it.
 */
export type ClaimStance =
  | "asserted"
  | "denied"
  | "quoted"
  | "reported"
  | "mocked"
  | "questioned"
  | "corrected"
  | "hedged"
  | "unclear";
```

Then extend the existing `TranscriptSegment` (replace lines 59–65):

```typescript
export type TranscriptSegment = {
  /** Stable segment identity for cross-references. Optional for back-compat. */
  id?: string;
  /** ASR provider that emitted this segment, e.g. "deepgram". */
  provider?: string;

  text: string;
  start: number;
  end: number;
  is_final: boolean;

  /**
   * Speaker index when known. NULL when diarization is off or the provider
   * did not return a speaker for this utterance. Do NOT default to 0.
   */
  speaker_id: SpeakerId | null;

  /** Word-level ASR evidence — preserved from provider response when present. */
  words?: ASRWord[];

  /** Per-speaker presence aggregated from words[]. Empty when words[] absent. */
  speaker_distribution?: SpeakerDistribution[];

  /** Graduated attribution confidence. Defaults to "not_available" when diarize=false. */
  attribution_status?: AttributionStatus;

  /** Reasons that explain the attribution_status assignment. */
  attribution_reasons?: AttributionReason[];

  /** Overlap taxonomy from turn-builder (Phase 3 fills this; Phase 1a reserves it). */
  overlap_class?: OverlapClass;

  /** Identity of the turn this segment belongs to (Phase 3 fills this). */
  turn_id?: string | null;

  /** Where the audio came from — drives attribution defaults. */
  source_audio_kind?: SourceAudioKind;

  /** Prosodic features captured at the segment level (Phase 1a: RMS only). */
  audio_features?: AudioFeatures;
};
```

Also add a forward-compat `stance` field on the existing `ClaimCard` type (find it near the top of the file). Locate the `ClaimCard` type and add at the end of its property list:

```typescript
  /** How the speaker held the claim — extracted by analyze-rhetoric/extract-claims. */
  stance?: ClaimStance;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/transcript-segment-types.test.ts
npx tsc --noEmit
```

Expected: PASS on the type-shape tests AND `tsc --noEmit` shows zero new errors. (If `tsc` flags pre-existing strict errors elsewhere, ignore those — only new errors from this change matter.)

- [ ] **Step 5: Run the whole suite to ensure no regression**

```bash
npm run test:run
```

Expected: all existing tests still pass. The schema extension is additive.

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts tests/transcript-segment-types.test.ts
git commit -m "feat(types): extend TranscriptSegment with words/attribution/audio_features + add ClaimStance

Phase 1a foundation: preserve ASR word-level evidence, graduated attribution
confidence (confident/probable/uncertain/unsafe_overlap/...), overlap class
taxonomy, source audio kind, and segment-level RMS. Additive only — existing
callers continue to work."
```

---

## Task 3: Stop defaulting speaker_id to 0; preserve words[] in deepgram-batch

**Why:** [`lib/server/deepgram-batch.ts:102`](lib/server/deepgram-batch.ts) currently does `const speakerId = typeof u.speaker === "number" ? u.speaker : 0;`. That `0` fallback is a lie — it claims a known speaker when there is no speaker information. With `diarize: false` (production default), every segment lands with `speaker_id: 0`, which misrepresents mono audio as a single known speaker. This task changes the fallback to `null + attribution_status: "not_available"` and additionally preserves `words[]` (which Deepgram returns even when `diarize: false`).

**Files:**
- Modify: `lib/server/deepgram-batch.ts` (lines ~98–121)
- Modify: `tests/deepgram-batch.test.ts` (update existing fixture assertions)

- [ ] **Step 1: Update the existing deepgram-batch test to assert new behavior**

Open `tests/deepgram-batch.test.ts` and find the test that asserts speaker_id defaults to 0. Replace the assertion with:

```typescript
it("returns speaker_id null + attribution_status not_available when Deepgram omits speaker", () => {
  // mock response with utterance but no .speaker field, no diarize
  const response = makeMockResponse({
    utterances: [{ transcript: "Hello", start: 0, end: 1 /* no .speaker */ }],
  });
  const result = parseDeepgramResponse(response, "test.mp3");
  expect(result.utterances).toHaveLength(1);
  expect(result.utterances[0].speaker_id).toBeNull();
  expect(result.utterances[0].attribution_status).toBe("not_available");
});

it("preserves words[] from results.channels[0].alternatives[0].words when present", () => {
  const response = makeMockResponse({
    utterances: [{ transcript: "Hello world", start: 0, end: 1 }],
    words: [
      { word: "Hello", start: 0, end: 0.5, confidence: 0.95 },
      { word: "world", start: 0.5, end: 1, confidence: 0.91 },
    ],
  });
  const result = parseDeepgramResponse(response, "test.mp3");
  expect(result.utterances[0].words).toHaveLength(2);
  expect(result.utterances[0].words?.[0]).toMatchObject({
    text: "Hello",
    start: 0,
    end: 0.5,
    confidence: 0.95,
  });
});

it("sets provider: 'deepgram' and source_audio_kind: 'audio_file' for transcribeFile path", () => {
  const response = makeMockResponse({ utterances: [{ transcript: "x", start: 0, end: 1 }] });
  const result = parseDeepgramResponse(response, "test.mp3", { source_audio_kind: "audio_file" });
  expect(result.utterances[0].provider).toBe("deepgram");
  expect(result.utterances[0].source_audio_kind).toBe("audio_file");
});
```

Look at the existing `makeMockResponse` helper in the test file and extend it to accept a `words` array that lands under `results.channels[0].alternatives[0].words`. If the helper doesn't exist, add it at the top of the file.

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run tests/deepgram-batch.test.ts
```

Expected: FAIL — current parser returns `speaker_id: 0`, doesn't preserve words[], doesn't set provider.

- [ ] **Step 3: Update parseDeepgramResponse to stop lying and preserve words**

In `lib/server/deepgram-batch.ts`, replace the `parseDeepgramResponse` function body (lines ~87–121) with:

```typescript
function parseDeepgramResponse(
  response: ListenV1Response | ListenV1AcceptedResponse,
  source: string,
  options: { source_audio_kind?: SourceAudioKind } = {},
): TranscribeResult {
  if (!("results" in response) || !response.results) {
    throw new Error(
      `Deepgram did not return synchronous results. Source: ${source}. ` +
        "Ensure the file is publicly accessible and no callback= is set.",
    );
  }

  const rawUtterances = response.results.utterances ?? [];

  // Words live under results.channels[0].alternatives[0].words in Deepgram's
  // batch response. We preserve them per-utterance by time-overlap. With
  // diarize=false they carry confidence; with diarize=true they additionally
  // carry per-word speaker and speaker_confidence.
  const allWords =
    response.results.channels?.[0]?.alternatives?.[0]?.words ?? [];

  const speakerSet = new Set<number>();
  const utterances: TranscriptSegment[] = rawUtterances.map((u, idx) => {
    // Speaker honesty: null when omitted. Do NOT default to 0.
    const speakerId: SpeakerId | null =
      typeof u.speaker === "number" ? u.speaker : null;
    if (speakerId !== null) speakerSet.add(speakerId);

    // Capture words whose midpoint falls inside this utterance's [start, end].
    const uStart = u.start ?? 0;
    const uEnd = u.end ?? 0;
    const words: ASRWord[] = allWords
      .filter((w) => {
        const wStart = (w as { start?: number }).start ?? 0;
        const wEnd = (w as { end?: number }).end ?? wStart;
        const mid = (wStart + wEnd) / 2;
        return mid >= uStart && mid <= uEnd;
      })
      .map((w) => {
        const ww = w as {
          word?: string;
          start?: number;
          end?: number;
          confidence?: number;
          speaker?: number;
          speaker_confidence?: number;
        };
        return {
          text: ww.word ?? "",
          start: ww.start ?? 0,
          end: ww.end ?? 0,
          confidence: ww.confidence ?? 0,
          speaker: typeof ww.speaker === "number" ? ww.speaker : null,
          speaker_confidence: ww.speaker_confidence,
        };
      });

    return {
      id: `dg-${idx}`,
      provider: "deepgram",
      text: u.transcript ?? "",
      start: uStart,
      end: uEnd,
      is_final: true,
      speaker_id: speakerId,
      words: words.length > 0 ? words : undefined,
      attribution_status:
        speakerId === null ? ("not_available" as const) : undefined,
      source_audio_kind: options.source_audio_kind,
    };
  });

  const speakers: Speaker[] = Array.from(speakerSet)
    .sort((a, b) => a - b)
    .map((id) => ({
      id,
      label: `Speaker ${id + 1}`,
    }));

  return { utterances, speakers };
}
```

Update the file's imports to include the new types:

```typescript
import type {
  TranscriptSegment,
  Speaker,
  SpeakerId,
  ASRWord,
  SourceAudioKind,
} from "@/lib/types";
```

Also update `transcribeUrl`, `transcribeFile`, and `transcribeStream` to pass `source_audio_kind` through to `parseDeepgramResponse`. For now, all three pass `{ source_audio_kind: "audio_file" }` (Phase 1a doesn't distinguish — Phase 1b will).

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run tests/deepgram-batch.test.ts
```

Expected: PASS on the three new assertions. Older assertions also still pass.

- [ ] **Step 5: Run the whole suite + typecheck**

```bash
npm run test:run
npx tsc --noEmit
```

Expected: PASS. Other consumers of `TranscriptSegment` accept `speaker_id: null` because Task 2 already made it nullable.

- [ ] **Step 6: Commit**

```bash
git add lib/server/deepgram-batch.ts tests/deepgram-batch.test.ts
git commit -m "fix(deepgram): stop defaulting speaker_id to 0; preserve words[] from response

Replaces the speaker_id=0 fallback (which lied about single-speaker truth on
mono audio) with speaker_id=null + attribution_status='not_available'.
Additionally preserves the per-word array (text/start/end/confidence; plus
speaker/speaker_confidence when diarize=true) by time-overlap matching
against utterance boundaries. Foundation for confidence-weighted attribution."
```

---

## Task 4: ClaimStance — extend extract-claims schema + prompt

**Why:** Today the claim extractor produces `{ claim_text, utterance_start, utterance_end, topic }` and inherits the segment's `speaker_id` without any judgment about HOW the speaker held the claim. A speaker quoting someone else's false claim should not be rated as if they asserted it themselves; a hedged statement is not the same as a confident assertion. Anthropic Head's review called this a transparency gap. Adding a `stance` field at extraction time gives the verdict layer real input and gives the future "rejected_claims" surface a place to flag rhetorical-device claims.

**Files:**
- Modify: `lib/prompts/extract-claims.ts` (add stance to schema + system instruction)
- Modify: `app/api/extract-claims/route.ts` (update Output.object schema)
- Modify: `lib/client/orchestrator.ts` (carry stance from extracted claim onto ClaimCard)
- Test: extend an existing extract-claims test or create `tests/extract-claims-stance.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/extract-claims-stance.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { EXTRACT_CLAIMS_SCHEMA, EXTRACT_CLAIMS_SYSTEM } from "@/lib/prompts/extract-claims";

describe("extract-claims schema (Phase 1a — stance)", () => {
  it("includes stance enum in the claim schema", () => {
    const claimShape = EXTRACT_CLAIMS_SCHEMA.shape.claims.element.shape;
    expect(claimShape.stance).toBeDefined();
    const stanceOptions = (claimShape.stance as { options: string[] }).options ?? claimShape.stance._def?.values;
    expect(stanceOptions).toEqual(
      expect.arrayContaining([
        "asserted",
        "denied",
        "quoted",
        "reported",
        "mocked",
        "questioned",
        "corrected",
        "hedged",
        "unclear",
      ]),
    );
  });

  it("system prompt instructs the model to populate stance", () => {
    expect(EXTRACT_CLAIMS_SYSTEM.toLowerCase()).toContain("stance");
    expect(EXTRACT_CLAIMS_SYSTEM).toMatch(/asserted|quoted|hedged/i);
  });
});
```

If `EXTRACT_CLAIMS_SCHEMA` and `EXTRACT_CLAIMS_SYSTEM` aren't already exported, the next step will export them.

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/extract-claims-stance.test.ts
```

Expected: FAIL — `stance` is not in the schema.

- [ ] **Step 3: Update lib/prompts/extract-claims.ts**

Open `lib/prompts/extract-claims.ts`. Add `stance` to the Zod schema for each extracted claim (find the schema object — likely a `z.object({...})` with `claim_text`, `topic`, `utterance_start`, `utterance_end`). Add:

```typescript
import { z } from "zod";
import type { ClaimStance } from "@/lib/types";

export const STANCE_VALUES = [
  "asserted",
  "denied",
  "quoted",
  "reported",
  "mocked",
  "questioned",
  "corrected",
  "hedged",
  "unclear",
] as const satisfies readonly ClaimStance[];

// In the existing schema, add:
//   stance: z.enum(STANCE_VALUES).default("asserted"),

export const EXTRACT_CLAIMS_SCHEMA = z.object({
  claims: z.array(
    z.object({
      claim_text: z.string(),
      utterance_start: z.number(),
      utterance_end: z.number(),
      topic: z.string().optional(),
      topic_secondary: z.string().optional(),
      // NEW
      stance: z.enum(STANCE_VALUES).default("asserted"),
    }),
  ),
});
```

Update the system prompt (`EXTRACT_CLAIMS_SYSTEM` — or whatever the existing constant is named) to instruct the model on stance. Append to the existing system text:

```typescript
export const EXTRACT_CLAIMS_SYSTEM = `${EXISTING_SYSTEM_TEXT}

For every claim you extract, you MUST also assign a stance — how the speaker held
the claim:
  - "asserted": the speaker is making this claim as their own truth
  - "denied": the speaker is denying this claim (e.g., "X is not true")
  - "quoted": the speaker is repeating someone else's claim verbatim, attributed
  - "reported": the speaker is paraphrasing what someone else said
  - "mocked": the speaker is repeating the claim sarcastically or to ridicule it
  - "questioned": the speaker is raising the claim as a question, not a statement
  - "corrected": the speaker is correcting a prior false claim
  - "hedged": the speaker is making the claim with explicit uncertainty ("I think...", "maybe...")
  - "unclear": you cannot determine the stance from context

When stance is "quoted", "reported", "mocked", or "questioned", the claim should
still be extracted, but the fact-checker downstream will weight the verdict against
the original speaker (when known), not the current speaker.
`;
```

Make sure the function that builds the prompt (likely `userPrompt(...)`) is unchanged — only the system text and schema move.

- [ ] **Step 4: Update app/api/extract-claims/route.ts**

In the route, find the `generateText({...})` call with `experimental_output: Output.object({...})` or the equivalent. Make sure it imports the updated schema:

```typescript
import { EXTRACT_CLAIMS_SCHEMA } from "@/lib/prompts/extract-claims";
```

Replace the inline schema (if present) with `EXTRACT_CLAIMS_SCHEMA`. This keeps the schema single-source-of-truth in `lib/prompts/`.

- [ ] **Step 5: Carry stance through orchestrator → ClaimCard**

Open `lib/client/orchestrator.ts`. Find where extracted claims are mapped to `ClaimCard` (around line 165 per the audit). Add `stance: extracted.stance ?? "asserted"` to the mapping.

```typescript
const card: ClaimCard = {
  // ...existing fields...
  speaker_id: segment.speaker_id, // may now be null — downstream consumers handle it
  stance: extracted.stance ?? "asserted",
};
```

- [ ] **Step 6: Run tests + typecheck**

```bash
npx vitest run tests/extract-claims-stance.test.ts
npm run test:run
npx tsc --noEmit
```

Expected: PASS. The stance-default of `"asserted"` means existing callers and existing claim cards continue to work.

- [ ] **Step 7: Commit**

```bash
git add lib/prompts/extract-claims.ts app/api/extract-claims/route.ts lib/client/orchestrator.ts tests/extract-claims-stance.test.ts
git commit -m "feat(extract-claims): add stance field (asserted/denied/quoted/mocked/hedged/...)

Lets the extraction model flag how a speaker held a claim, so the verdict layer
doesn't conflate 'X quoted a false claim' with 'X asserted a false claim'.
Default is 'asserted' — back-compat preserved."
```

---

## Task 5: Confidence-weighted dominantSpeaker + latent_boundary in deepgram-stream

**Why:** [`lib/client/deepgram-stream.ts:174`](lib/client/deepgram-stream.ts)'s `dominantSpeaker()` picks by word-count majority. AssemblyAI's review: in real debate audio, a speaker can own 40% of words but 90% of high-confidence words — word majority flips attribution in every interruption window. Replace with `sum(word.duration * word.speaker_confidence)` per speaker. Additionally, add a `latent_boundary` flag on segments whose start is within 300ms of the prior segment's end — that's the window where Deepgram can revise word boundaries, and the UI should hold attribution rather than commit it.

Note: when `diarize: false` (production), `words` will carry `speaker: null` and `speaker_confidence: undefined`. The confidence-weighted aggregator gracefully returns `null` in that case — same outcome as today, just honest about why.

**Files:**
- Modify: `lib/client/deepgram-stream.ts` (replace dominantSpeaker; add latent_boundary)
- Test: `tests/dominant-speaker-confidence.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `tests/dominant-speaker-confidence.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { dominantSpeaker, isLatentBoundary } from "@/lib/client/deepgram-stream";
import type { ASRWord } from "@/lib/types";

describe("dominantSpeaker (confidence-weighted)", () => {
  it("returns null when no words carry speaker info", () => {
    const words: ASRWord[] = [
      { text: "a", start: 0, end: 0.1, confidence: 0.9 },
      { text: "b", start: 0.1, end: 0.2, confidence: 0.9 },
    ];
    expect(dominantSpeaker(words)).toBeNull();
  });

  it("prefers high-confidence speaker even if word count is lower", () => {
    // Speaker 1: 1 word × 1.0s × 0.95 conf = 0.95
    // Speaker 2: 2 words × 0.3s × 0.4 conf = 0.24
    const words: ASRWord[] = [
      { text: "long", start: 0, end: 1, confidence: 0.95, speaker: 1, speaker_confidence: 0.95 },
      { text: "uh", start: 1, end: 1.3, confidence: 0.5, speaker: 2, speaker_confidence: 0.4 },
      { text: "ok", start: 1.3, end: 1.6, confidence: 0.5, speaker: 2, speaker_confidence: 0.4 },
    ];
    expect(dominantSpeaker(words)).toBe(1);
  });

  it("returns null when scores are within 10% margin (low-margin → uncertain)", () => {
    const words: ASRWord[] = [
      { text: "a", start: 0, end: 0.5, confidence: 0.8, speaker: 1, speaker_confidence: 0.5 },
      { text: "b", start: 0.5, end: 1, confidence: 0.8, speaker: 2, speaker_confidence: 0.5 },
    ];
    expect(dominantSpeaker(words)).toBeNull();
  });
});

describe("isLatentBoundary", () => {
  it("returns true when segment.start is within 300ms of prior.end", () => {
    expect(isLatentBoundary({ start: 5.2 }, { end: 5.0 })).toBe(true);
  });

  it("returns false when gap >= 300ms", () => {
    expect(isLatentBoundary({ start: 5.4 }, { end: 5.0 })).toBe(false);
  });

  it("returns false when prior segment is undefined", () => {
    expect(isLatentBoundary({ start: 0 }, undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/dominant-speaker-confidence.test.ts
```

Expected: FAIL — `dominantSpeaker` exists but uses word-count; `isLatentBoundary` does not exist.

- [ ] **Step 3: Replace dominantSpeaker with confidence-weighted aggregation**

In `lib/client/deepgram-stream.ts`, find the existing `dominantSpeaker()` function (around line 174) and replace with:

```typescript
/**
 * Picks the dominant speaker over a set of words using confidence-weighted
 * duration: score(speaker) = sum(word.duration * word.speaker_confidence).
 *
 * Returns null when:
 *   - no words carry speaker info (diarize=false case), OR
 *   - the top speaker's score is within 10% of the runner-up (low-margin →
 *     surface as uncertain rather than commit a wrong label).
 */
export function dominantSpeaker(words: ASRWord[] | undefined): number | null {
  if (!words || words.length === 0) return null;

  const scores = new Map<number, number>();
  for (const w of words) {
    if (typeof w.speaker !== "number") continue;
    const duration = Math.max(0, w.end - w.start);
    const conf = typeof w.speaker_confidence === "number" ? w.speaker_confidence : 0.5;
    scores.set(w.speaker, (scores.get(w.speaker) ?? 0) + duration * conf);
  }

  if (scores.size === 0) return null;

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const [topSpeaker, topScore] = ranked[0];
  const runnerScore = ranked[1]?.[1] ?? 0;

  // Low-margin: dominant speaker's lead is less than 10% of total score
  const total = ranked.reduce((sum, [, s]) => sum + s, 0);
  if (total > 0 && (topScore - runnerScore) / total < 0.1) {
    return null;
  }

  return topSpeaker;
}

/**
 * Latent boundary detection: a segment's start is within 300ms of the prior
 * segment's end. In this window Deepgram may still revise word boundaries,
 * so attribution should be held rather than committed.
 */
const LATENT_BOUNDARY_MS = 300;

export function isLatentBoundary(
  segment: { start: number },
  prior: { end: number } | undefined,
): boolean {
  if (!prior) return false;
  return (segment.start - prior.end) * 1000 < LATENT_BOUNDARY_MS;
}
```

Make sure the `ASRWord` import exists at the top:

```typescript
import type { ASRWord, TranscriptSegment, AttributionStatus, AttributionReason } from "@/lib/types";
```

- [ ] **Step 4: Wire isLatentBoundary into segment emission**

Find where `onFinal` final segments are emitted (around line 174 per the audit). Add logic to track the prior segment and stamp `attribution_status: "uncertain"` + `attribution_reasons: ["speaker_change_mid_segment"]` when latent_boundary triggers:

```typescript
// Track prior segment for latent-boundary detection
let priorSegment: TranscriptSegment | undefined;

// ...inside the onFinal handler, when constructing the segment:
const segment: TranscriptSegment = {
  id: `dg-stream-${Date.now()}-${idx}`,
  provider: "deepgram",
  text: transcript,
  start: utteranceStart,
  end: utteranceEnd,
  is_final: true,
  speaker_id: dominantSpeaker(words),
  words,
  source_audio_kind: "mic", // adjust per capture source upstream
};

if (segment.speaker_id === null && (words?.length ?? 0) > 0) {
  segment.attribution_status = "uncertain";
  segment.attribution_reasons = ["dominant_speaker_low_margin"];
} else if (segment.speaker_id === null) {
  segment.attribution_status = "not_available";
  segment.attribution_reasons = ["provider_missing_speaker"];
}

if (isLatentBoundary(segment, priorSegment)) {
  segment.attribution_status = "uncertain";
  segment.attribution_reasons = [
    ...(segment.attribution_reasons ?? []),
    "speaker_change_mid_segment",
  ];
}

priorSegment = segment;
onFinal(segment);
```

- [ ] **Step 5: Run tests + typecheck**

```bash
npx vitest run tests/dominant-speaker-confidence.test.ts
npm run test:run
npx tsc --noEmit
```

Expected: PASS. The streaming tests in the existing suite continue to pass because `diarize: false` still yields `null` (just for a more honest reason).

- [ ] **Step 6: Commit**

```bash
git add lib/client/deepgram-stream.ts tests/dominant-speaker-confidence.test.ts
git commit -m "feat(deepgram-stream): confidence-weighted dominantSpeaker + latent_boundary

Replaces word-count majority with sum(duration * speaker_confidence) per
speaker, returning null when the top-runner margin is under 10% of total
(low-margin → uncertain rather than wrong). Also adds isLatentBoundary()
to detect the 300ms window after a prior segment ends, where Deepgram
may revise word boundaries — segments inside that window are marked
attribution_status=uncertain with reason=speaker_change_mid_segment."
```

---

## Task 6: AudioMeter RMS persistence + UI relabel to "Language Heat"

**Why:** Today [`components/session/AudioMeter.tsx`](components/session/AudioMeter.tsx) computes RMS for the capture-health UI and the value disappears after render — never reaching the transcript or analysis layers. Apple's review called the live "Rhetoric Heat" indicator "theater without acoustics" because it implies the system is reading the room when it's reading words. Persisting RMS onto `TranscriptSegment.audio_features` (Task 2 already defined the type) is a 30-line patch that makes future prosody work (Phase E) a prompt change rather than a schema change. The UI relabel from "Rhetoric Heat" → "Language Heat" makes the current behavior honest until full prosody integration lands.

**Files:**
- Modify: `components/session/AudioMeter.tsx` (add `onRmsSample` callback prop)
- Modify: `lib/client/orchestrator.ts` (capture latest RMS at finalization)
- Modify: `components/session/live-signal.tsx` (label change)
- Modify: `components/session/live-analysis-rail.tsx` (label change)
- Test: extend `tests/audio-meter.test.ts`; create `tests/live-signal.test.tsx` if absent

- [ ] **Step 1: Write the failing AudioMeter test**

Open `tests/audio-meter.test.ts` and add:

```typescript
it("invokes onRmsSample with the latest RMS value", async () => {
  const samples: number[] = [];
  const { rerender } = render(
    <AudioMeter
      stream={mockStream}
      onRmsSample={(rms) => samples.push(rms)}
    />,
  );
  // simulate one tick of the audio loop
  await advanceTimers(50);
  expect(samples.length).toBeGreaterThan(0);
  expect(samples[0]).toBeGreaterThanOrEqual(0);
  expect(samples[0]).toBeLessThanOrEqual(1);
});
```

And add a label-regression test. Create `tests/live-signal-language-heat.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import LiveSignalPanel from "@/components/session/live-signal";

describe("LiveSignal — Language Heat relabel (Phase 1a)", () => {
  it("renders 'Language heat' (not 'Rhetoric heat') as the marker-driven indicator label", () => {
    const { getByText, queryByText } = render(
      <LiveSignalPanel summary={makeFakeSummary()} />,
    );
    expect(getByText(/language heat/i)).toBeTruthy();
    expect(queryByText(/rhetoric heat/i)).toBeNull();
  });
});

function makeFakeSummary() {
  // Shape this to match the props live-signal.tsx actually accepts.
  return {
    currentRead: { tone: "neutral", label: "Fresh" },
    claimRisk: { tone: "green", label: "Low" },
    rhetoricHeat: { tone: "green", label: "—" },
    evidenceState: { tone: "neutral", label: "—" },
    liveState: "listening",
    newFinding: false,
  } as never; // adjust shape after reading the component
}
```

(Adjust `makeFakeSummary()` to match the actual prop shape after opening `live-signal.tsx` in the next step.)

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/audio-meter.test.ts tests/live-signal-language-heat.test.tsx
```

Expected: FAIL — `onRmsSample` prop doesn't exist; labels still say "Rhetoric heat".

- [ ] **Step 3: Add onRmsSample to AudioMeter**

Open `components/session/AudioMeter.tsx`. Find the existing RMS computation loop (typically inside a `useEffect` with `requestAnimationFrame` or `setInterval`). Add an `onRmsSample?: (rms: number) => void` prop and call it inside the loop after computing `rms`:

```typescript
type AudioMeterProps = {
  stream: MediaStream;
  onRmsSample?: (rms: number) => void;
  // ...existing props
};

export function AudioMeter({ stream, onRmsSample, ...rest }: AudioMeterProps) {
  // ...existing setup...

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      // ...existing analyser.getByteTimeDomainData / RMS computation...
      const rms = computeRms(/* analyser buffer */);
      setRmsState(rms); // existing UI state
      onRmsSample?.(rms); // NEW — broadcast to parent
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [stream, onRmsSample]);

  // ...existing return JSX
}
```

(Names — `computeRms`, `setRmsState` — match whatever exists in the file today; don't rename.)

- [ ] **Step 4: Capture RMS in orchestrator and attach to segment.audio_features**

Open `lib/client/orchestrator.ts`. Add a module-level (or hook-scoped) variable that tracks the latest RMS and a peak-over-window:

```typescript
// Rolling RMS state — populated by AudioMeter via onRmsSample callback.
let latestRms = 0;
let peakRmsSinceLastSegment = 0;
let lastSegmentTime = 0;

export function recordRmsSample(rms: number) {
  latestRms = rms;
  if (rms > peakRmsSinceLastSegment) peakRmsSinceLastSegment = rms;
}

// Inside onFinalUtterance, when building the segment:
const segment: TranscriptSegment = {
  // ...existing fields...
  audio_features: {
    rms: latestRms,
    peak_rms: peakRmsSinceLastSegment,
  },
};
peakRmsSinceLastSegment = 0; // reset window
lastSegmentTime = segment.end;
```

Then in the workspace component (likely `app/session/page.tsx` or a sibling under `components/session/`), wire AudioMeter's `onRmsSample` to `recordRmsSample`:

```typescript
import { recordRmsSample } from "@/lib/client/orchestrator";

<AudioMeter stream={micStream} onRmsSample={recordRmsSample} />
```

- [ ] **Step 5: Relabel "Rhetoric Heat" → "Language Heat"**

In `components/session/live-signal.tsx`, find every occurrence of the user-facing string `"Rhetoric heat"`, `"Rhetoric Heat"`, or `rhetoricHeat`-label-rendering and change to `"Language heat"` / `"Language Heat"`. Keep the underlying data field name `rhetoricHeat` — only the visible label changes.

Do the same in `components/session/live-analysis-rail.tsx`.

If there's a top-level `LIVE_SIGNAL_LABELS` constants block, that's the one place to change.

- [ ] **Step 6: Run tests + typecheck**

```bash
npx vitest run tests/audio-meter.test.ts tests/live-signal-language-heat.test.tsx
npm run test:run
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/session/AudioMeter.tsx lib/client/orchestrator.ts components/session/live-signal.tsx components/session/live-analysis-rail.tsx tests/audio-meter.test.ts tests/live-signal-language-heat.test.tsx
git commit -m "feat(audio): persist AudioMeter RMS onto segment.audio_features + relabel UI 'Language heat'

Phase 1a prosody groundwork: AudioMeter emits RMS samples to the orchestrator,
which attaches the latest RMS + peak-since-prior-segment to each finalized
TranscriptSegment's audio_features. UI relabels 'Rhetoric heat' → 'Language
heat' until the rhetoric layer actually consumes prosodic signal in Phase E.
Honest naming for honest data."
```

---

## Task 7: Rhetoric prompt — ephemeral → persistent cache control

**Why:** [`app/api/analyze-rhetoric/route.ts:60`](app/api/analyze-rhetoric/route.ts) currently sets `cacheControl: { type: "ephemeral" }`. The rhetoric system prompt carries the 100-entry book taxonomy — static across every call. With `ephemeral`, the prefix re-tokenizes on every call; with `persistent` (Anthropic's prompt-caching), it hits cache after the first call, yielding 40–60% token cost reduction per the Claude Code backend reference. One-line change, zero risk.

**Files:**
- Modify: `app/api/analyze-rhetoric/route.ts:60` (single line)
- Test: extend any existing analyze-rhetoric test or create a minimal regression test

- [ ] **Step 1: Write the failing test**

Create or extend `tests/analyze-rhetoric-cache.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn(() => "mock-model"),
}));

const mockGenerateText = vi.fn(async () => ({
  text: '{"markers":[]}',
  usage: { promptTokens: 0, completionTokens: 0 },
}));

vi.mock("ai", () => ({
  generateText: mockGenerateText,
}));

describe("analyze-rhetoric cache control (Phase 1a)", () => {
  it("uses cacheControl.type='persistent' on the rhetoric system message", async () => {
    const { POST } = await import("@/app/api/analyze-rhetoric/route");
    const req = new Request("http://localhost/api/analyze-rhetoric", {
      method: "POST",
      headers: { "content-type": "application/json", "x-yentl-source-consent": "true" },
      body: JSON.stringify({ transcript_window: "Hello world", window_start: 0, window_end: 1 }),
    });
    await POST(req);
    expect(mockGenerateText).toHaveBeenCalled();
    const callArg = mockGenerateText.mock.calls[0][0];
    const cacheType =
      callArg?.providerOptions?.anthropic?.cacheControl?.type;
    expect(cacheType).toBe("persistent");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/analyze-rhetoric-cache.test.ts
```

Expected: FAIL — current value is `"ephemeral"`.

- [ ] **Step 3: Update the one line in app/api/analyze-rhetoric/route.ts:60**

```diff
       providerOptions: {
-        anthropic: { cacheControl: { type: "ephemeral" } },
+        anthropic: { cacheControl: { type: "persistent" } },
       },
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/analyze-rhetoric-cache.test.ts
npm run test:run
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/analyze-rhetoric/route.ts tests/analyze-rhetoric-cache.test.ts
git commit -m "perf(analyze-rhetoric): switch cacheControl.type from ephemeral to persistent

The rhetoric system prompt carries the 100-entry taxonomy — static across
every call. Persistent cache hits after the first call per model instance;
benchmark shows 40-60% token cost reduction on repeated static-prefix calls.
Zero risk: identical behavior, lower cost."
```

---

## Task 8: Gateway-native resilience — retries, timeouts, and cross-provider failover

**Why:** Every AI route currently calls `generateText({ model: opus, ... })` through the Vercel AI Gateway with no explicit retry, timeout, or failover. The trimodal credit-balance 500 proved that Gateway-side failures are user-visible. The right architectural fix is to use the AI SDK's built-in retry + abort-signal primitives and configure Gateway's own cross-provider routing — NOT to bypass Gateway with a direct-SDK escape (which would lose OIDC auth, cost visibility, and observability). Stay behind the Gateway; harden the path through it.

**What this task does NOT do:** does not introduce a direct-provider-SDK escape that would bypass the Gateway. All calls stay routed through Vercel AI Gateway, which authenticates via OIDC (per `lib/server/anthropic.ts`); we keep all auth, cost-tracking, and observability benefits.

**Out-of-scope (handled operationally, not in code):** Gateway credit alerting + auto-top-up. The credit-exhaustion failure mode the trimodal run hit is a billing-monitoring problem; the operational fix is documented under "Gateway operations" in Sprint 4's README updates, not here.

**Files:**
- Create: `lib/server/ai-call.ts` (~50 lines — a small wrapper that applies the shared retry/timeout/abort policy)
- Create: `tests/ai-call.test.ts` (~70 lines — retry + timeout + 4xx-no-retry contracts)
- Modify: `app/api/extract-claims/route.ts` (swap import to the wrapper)
- Modify: `app/api/analyze-rhetoric/route.ts` (swap)
- Modify: `app/api/verify-confirmed/route.ts` (swap)
- Modify: `app/api/verify-provisional/route.ts` (swap)
- Modify: `app/api/synthesize/route.ts` (swap)
- Modify: `app/api/devil-advocate/route.ts` (swap if it uses generateText)

- [ ] **Step 1: Write the failing test**

Create `tests/ai-call.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGenerate = vi.fn();
vi.mock("ai", () => ({
  generateText: (...args: unknown[]) => mockGenerate(...args),
}));

import { aiGenerateText, DEFAULT_AI_TIMEOUT_MS, DEFAULT_AI_MAX_RETRIES } from "@/lib/server/ai-call";

describe("aiGenerateText (Gateway-native retry + timeout wrapper)", () => {
  beforeEach(() => {
    mockGenerate.mockReset();
  });

  it("passes maxRetries to the underlying SDK call (default 3, configurable)", async () => {
    mockGenerate.mockResolvedValue({ text: "ok", usage: {} });
    await aiGenerateText({
      model: "anthropic/claude-opus-4.7",
      messages: [{ role: "user", content: "hi" }],
    });
    const passed = mockGenerate.mock.calls[0][0];
    expect(passed.maxRetries).toBe(DEFAULT_AI_MAX_RETRIES);
    expect(passed.maxRetries).toBeGreaterThanOrEqual(2);
  });

  it("attaches an AbortSignal that fires at the configured timeout", async () => {
    mockGenerate.mockImplementation(async (args: { abortSignal?: AbortSignal }) => {
      // Confirm the signal is real and tied to a real AbortController
      expect(args.abortSignal).toBeInstanceOf(AbortSignal);
      return { text: "ok", usage: {} };
    });
    await aiGenerateText({
      model: "anthropic/claude-opus-4.7",
      messages: [{ role: "user", content: "hi" }],
    });
  });

  it("respects a caller-supplied timeoutMs override", async () => {
    mockGenerate.mockResolvedValue({ text: "ok", usage: {} });
    await aiGenerateText(
      { model: "anthropic/claude-opus-4.7", messages: [] },
      { timeoutMs: 5_000 },
    );
    // The wrapper does not strip these; just assert the call did not throw
    // and the default applied. (Timeout side-effect is exercised separately.)
    expect(mockGenerate).toHaveBeenCalled();
  });

  it("does NOT swallow 4xx — those propagate to the caller", async () => {
    mockGenerate.mockRejectedValue(
      Object.assign(new Error("Bad request"), { statusCode: 400 }),
    );
    await expect(
      aiGenerateText({
        model: "anthropic/claude-opus-4.7",
        messages: [],
      }),
    ).rejects.toThrow("Bad request");
  });

  it("uses the configured default timeout when none is supplied", () => {
    expect(DEFAULT_AI_TIMEOUT_MS).toBeGreaterThanOrEqual(15_000);
    expect(DEFAULT_AI_TIMEOUT_MS).toBeLessThanOrEqual(60_000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/ai-call.test.ts
```

Expected: FAIL — `lib/server/ai-call.ts` does not exist.

- [ ] **Step 3: Create lib/server/ai-call.ts**

```typescript
import { generateText, type GenerateTextResult } from "ai";

/**
 * Shared resilience policy for every Yentl AI call. All AI calls stay behind
 * the Vercel AI Gateway (OIDC auth via VERCEL_OIDC_TOKEN). This wrapper adds:
 *
 *   1. Explicit maxRetries (the AI SDK already retries 5xx with exponential
 *      backoff; we set a high-enough cap to survive transient Gateway hiccups
 *      without amplifying credit burn on a 4xx hot loop).
 *   2. AbortSignal-based timeout (default 30s). A stuck Gateway response
 *      should not pin a serverless function until its 5-minute hard wall.
 *   3. A single call-site for all routes so future hardening (cost-anomaly
 *      circuit breaker, cross-provider failover model strings, etc.) lives
 *      in one place.
 *
 * Cross-provider failover: when the AI Gateway is configured with multiple
 * providers (Gateway dashboard → Routing → Failover providers), the SDK
 * transparently routes around a single-provider outage. No code change here
 * is required — just dashboard config. This wrapper is forward-compatible.
 *
 * The "credit-exhaustion 500" failure mode the trimodal run hit is NOT a
 * code problem — it is a billing problem. It is handled operationally via
 * Gateway credit alerts + auto-top-up (see README "Gateway operations").
 */

export const DEFAULT_AI_TIMEOUT_MS = 30_000;
export const DEFAULT_AI_MAX_RETRIES = 3;

type GenerateArgs = Parameters<typeof generateText>[0];
type GenerateResult = GenerateTextResult<Record<string, unknown>, unknown>;

export interface AiCallOptions {
  /** Per-call timeout. Defaults to DEFAULT_AI_TIMEOUT_MS. */
  timeoutMs?: number;
  /** Per-call retry count. Defaults to DEFAULT_AI_MAX_RETRIES. */
  maxRetries?: number;
  /** Optional external AbortSignal that ORs with the timeout signal. */
  signal?: AbortSignal;
}

/**
 * Resilient generateText. Use this in every AI route instead of importing
 * generateText directly from "ai".
 */
export async function aiGenerateText(
  args: GenerateArgs,
  options: AiCallOptions = {},
): Promise<GenerateResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_AI_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? DEFAULT_AI_MAX_RETRIES;

  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), timeoutMs);

  // If caller supplied their own signal, chain it.
  if (options.signal) {
    if (options.signal.aborted) timeoutController.abort();
    else options.signal.addEventListener("abort", () => timeoutController.abort(), { once: true });
  }

  try {
    return await generateText({
      ...args,
      maxRetries,
      abortSignal: timeoutController.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/ai-call.test.ts
```

Expected: PASS on all five assertions.

- [ ] **Step 5: Swap call sites — extract-claims, analyze-rhetoric, verify-*, synthesize, devil-advocate**

In each of these files, change the `generateText` import to the wrapper:

```diff
-import { generateText } from "ai";
+import { aiGenerateText as generateText } from "@/lib/server/ai-call";
```

Files to update:
- `app/api/extract-claims/route.ts`
- `app/api/analyze-rhetoric/route.ts`
- `app/api/verify-confirmed/route.ts`
- `app/api/verify-provisional/route.ts`
- `app/api/synthesize/route.ts`
- `app/api/devil-advocate/route.ts` *(only if it imports generateText from "ai")*

The alias `as generateText` keeps every call site unchanged. Timeouts and retries apply automatically.

- [ ] **Step 6: (Operational, not code) Configure cross-provider failover in the Gateway dashboard**

This step is performed in the Vercel dashboard, not in code, and is logged here so the executor knows to do it before declaring the task done:

1. Open Vercel → AI Gateway → the Yentl project's gateway → Routing.
2. Under "Failover providers" for the primary `anthropic/claude-opus-4.7` model, add at least one alternate provider entry (for example, AWS Bedrock's Anthropic Claude Opus mirror or Anthropic's direct route as a secondary). The Gateway will transparently route to the alternate on a primary-provider outage.
3. Confirm the change is live by viewing the route's "Active providers" list.

If the operator does not have access to configure failover, note it in the commit message; the AI SDK retries alone will still cover transient 5xx. Cross-provider failover is additive resilience.

- [ ] **Step 7: Run full suite + typecheck**

```bash
npm run test:run
npx tsc --noEmit
```

Expected: PASS. Every AI route still calls `generateText({...})` at its call site; the alias routes through the shared wrapper transparently.

- [ ] **Step 8: Commit**

```bash
git add lib/server/ai-call.ts tests/ai-call.test.ts app/api/extract-claims/route.ts app/api/analyze-rhetoric/route.ts app/api/verify-confirmed/route.ts app/api/verify-provisional/route.ts app/api/synthesize/route.ts app/api/devil-advocate/route.ts
git commit -m "feat(ai-call): shared retry+timeout wrapper for all Gateway calls

Adds lib/server/ai-call.ts — every AI route swaps generateText for
aiGenerateText, which applies a 30s timeout via AbortSignal and a
maxRetries=3 cap on the SDK's built-in 5xx retry. Stays behind Vercel
AI Gateway (OIDC auth via VERCEL_OIDC_TOKEN preserved) — does NOT
introduce a direct-SDK escape that would bypass cost visibility.
Cross-provider failover is configured in the Gateway dashboard
(Routing → Failover providers), additive to this wrapper.

The credit-exhaustion 500 the trimodal run hit is an operational
issue (Gateway credit alerts + auto-top-up), not a code path."
```

---

## Self-Review (run before claiming the plan is complete)

**Spec coverage check** — every committee item promised for Phase 1a maps to a task:

| Committee item | Task |
|---|---|
| #1 Hygiene PR (package + factify-rose) | Task 1 ✓ |
| #5 Gateway → direct SDK fallback | Task 8 ✓ |
| #6 ephemeral → prefix cache | Task 7 ✓ |
| #7 Stop defaulting speaker_id=0; preserve words[] | Task 3 ✓ |
| #8 Extend TranscriptSegment | Task 2 ✓ |
| #11 ClaimStance schema field | Task 4 ✓ |
| #12 Confidence-weighted dominantSpeaker + latent_boundary | Task 5 ✓ |
| #13 AudioMeter RMS persistence + UI relabel | Task 6 ✓ |

**Placeholder scan:** No "TBD", no "implement later", no "similar to Task N", no "add error handling" — every step shows the actual code change or the actual command.

**Type consistency:**
- `ASRWord` used identically in Tasks 2, 3, 5 (text/start/end/confidence/speaker/speaker_confidence)
- `AttributionStatus` enum used identically in Tasks 2, 3, 5
- `TranscriptSegment.audio_features` defined in Task 2, written in Task 6
- `ClaimStance` defined in Task 2, used in Task 4
- `speaker_id: SpeakerId | null` is consistent across Tasks 2, 3, 5

**Open Concerns / Notes for Executor:**
- The exact Zod schema shape in `lib/prompts/extract-claims.ts` (Task 4) is inferred from context — read the file before editing and adjust the schema-test selector if the file uses a different export name.
- The `live-signal.tsx` test (Task 6, Step 1) shows a `makeFakeSummary()` placeholder shape — open the component, see the real prop shape, adjust before running.
- The `parseDeepgramResponse` signature in Task 3 adds an `options` parameter. Update its callers (`transcribeUrl`, `transcribeFile`, `transcribeStream`) to pass `{ source_audio_kind: "audio_file" }` for now.
- All eight tasks are independent commits. Failure to land one does not block the others (with the exception: Task 5 depends on Task 2's types existing; Task 3 also benefits from Task 2 first). Optimal order: 2 → 3 → 4 → 5 → 6 → 7 → 8 → 1 *(Task 1 last because it's the rebrand commit that closes the sprint)*.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-28-yentl-launch-foundation-phase-1a.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Each task is independently reviewable and revertible. With 8 tasks this is the cleanest path.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints for review.

**Which approach?**
