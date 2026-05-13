# Factify Sprint 1 — Multi-speaker, durability, visual enrichment

**Date:** 2026-05-13
**Status:** Design — awaiting user review before plan
**Author/user:** Israel B. Bitton
**Predecessors:** [`2026-05-11-factify-design.md`](2026-05-11-factify-design.md) (v1 spec), [`../handoff/2026-05-11-task-12-onward.md`](../handoff/2026-05-11-task-12-onward.md) and [`../handoff/2026-05-13-post-v1-shakeout.md`](../handoff/2026-05-13-post-v1-shakeout.md) (v1 handoffs)
**Companion paper:** Venktesh V & Vinay Setty, *LiveFC: A System for Live Fact-Checking of Audio Streams*, WSDM '25 — informed the claim normalization, decomposition, and topic-tagging design (Sprint 2 + topic field pulled forward into Sprint 1)

---

## 1. Why this sprint

Factify v1 is live at `factify-rose.vercel.app`. A first real two-speaker demo would currently fail on three fronts: the Deepgram JWT silently expires at 10 minutes, the default `echoCancellation: true` blocks speaker-routed audio from being captured, and there is no diarization — every utterance is attributed to a single anonymous speaker. Separately, a review of three real session exports surfaced pipeline bugs (UNVERIFIABLE rendered during in-flight verification, source URL corruption, marker type mislabeling, marker dedup gaps). And the UI is text-heavy, with no visual anchors on claim cards or marker chips.

Sprint 1 makes the next demo viable. It builds the durability foundation, adds Deepgram-driven diarization with a renamable speaker UI, fixes the user-visible pipeline bugs that don't require pipeline-architecture changes, and lands a first pass of visual enrichment — preview images on claim cards from source OpenGraph metadata, and archetype-classified icons on marker chips. After Sprint 1, every later feature — pipeline-quality refit, input variety, UI rework, meta-analysis, summary PDF — operates on a stable two-speaker signal with a richer-than-text presentation.

Sprint 1 explicitly does NOT touch claim normalization, semantic dedup, quote-vs-assertion handling, decomposition, Wikipedia retrieval, audio/text/URL upload, mobile-responsive redesign, meta-analysis, or the summary PDF. Each of those has its own sprint planned in §11.

## 2. Scope summary

| Group | Items | §  |
|---|---|---|
| **Data model** | `SpeakerId`, `Speaker`, `SourcePreview`, extensions to `TranscriptSegment` / `ClaimCard` / `RhetoricMarker` / `Session`, `SessionSource` discriminated union, `Archetype` field on taxonomy | §3 |
| **Diarization** | Deepgram `diarize=true`, dominant-speaker-per-utterance, store registry, renamable header chips, color-blocked transcript, claim & marker speaker attribution, export schema updates | §4 |
| **Durability** | Proactive JWT refresh + atomic WS swap, 5-bar audio meter (DOM-mutation rAF), speakers-mode echo-cancel toggle, `vercel.json` framework pin | §5 |
| **Folded small fixes** | "Checking…" lifecycle, source URL sanitization, marker type validation against taxonomy, marker dedup tightening to `(type, excerpt)`, topic field on every claim | §6 |
| **Visual enrichment** | Server-side OG scraper + cache, async preview fetch endpoint, hero-image selection on ClaimCard, archetype-mapped lucide-react icons on MarkerChip, one-shot taxonomy archetype classifier | §7 |
| **Verification** | Two-speaker reality check, agent-browser visual verification, local-only deploy gate, three-strikes rule | §8 |

## 3. Data model changes

All additive — existing fields unchanged. New session-level fields (`speakers`, `source`) are required on freshly-emitted sessions; per-row fields (`speaker_id` on segments/claims/markers, `preview` on sources, `archetype` on taxonomy entries) are nullable or optional. There is no session re-import flow today, so previously-exported sessions remain readable as documents; they're just not re-loadable into the store. If a re-import path is added later, that work owns defensive defaulting.

### 3.1 `lib/types.ts`

```ts
// NEW
export type SpeakerId = number;          // 0, 1, 2... as Deepgram emits

export type Speaker = {
  id: SpeakerId;                          // canonical Deepgram speaker index
  label: string;                          // user-facing — default "Speaker 1", "Speaker 2", ...
};

export type SourcePreview = {
  image_url: string | null;
  image_alt: string | null;
  title: string | null;                   // og:title — often more descriptive than the LLM's title
  description: string | null;             // og:description — used as caption fallback
  fetched_at: number;                     // epoch ms — for cache TTL
};

export type SessionSource =
  | { kind: "mic" }                       // default; back-compat for sessions without source
  | { kind: "audio_file"; blob_url: string; duration_sec: number; filename: string; mime: string }
  | { kind: "text_doc"; filename: string; mime: string; byte_count: number }
  | { kind: "youtube"; video_id: string; url: string; title?: string; channel?: string; duration_sec?: number }
  | { kind: "media_url"; url: string };

// EXTENDED — speaker_id added (nullable)
export type TranscriptSegment = {
  text: string;
  start: number;
  end: number;
  is_final: boolean;
  speaker_id: SpeakerId | null;
};

// EXTENDED — speaker_id + topic added
export type ClaimCard = {
  id: string;
  claim_text: string;
  utterance_start: number;
  utterance_end: number;
  speaker_id: SpeakerId | null;
  topic: string;                          // 12-value enum (§6.5); default "Other"
  primary_label: PrimaryLabel;
  score: number;
  annotations: string[];
  explanation: string;
  status: ClaimStatus;
  sources: Source[];                      // each Source can carry an optional `preview`
};

// EXTENDED — speaker_id added
export type RhetoricMarker = {
  id: string;
  type: MarkerType;
  name: string;
  display: string;
  excerpt: string;
  speaker_id: SpeakerId | null;
  start_time: number;
  end_time: number;
  severity: MarkerSeverity;
  explanation: string;
};

// EXTENDED — preview added (optional)
export type Source = {
  url: string;
  domain: string;
  title: string;
  reputation_tier: ReputationTier;
  stance: Stance;
  excerpt?: string;
  preview?: SourcePreview;                // NEW
};

// EXTENDED — speakers registry, source provenance
export type Session = {
  title: string;
  started_at: string;
  ended_at?: string;
  transcript: TranscriptSegment[];
  claims: ClaimCard[];
  markers: RhetoricMarker[];
  speakers: Speaker[];                    // NEW — session-scoped registry
  source: SessionSource;                  // NEW — defaults to { kind: "mic" }
};
```

### 3.2 Taxonomy archetype field

`lib/taxonomy/types.ts`:

```ts
export type Archetype =
  | "appeal_to" | "dismissal" | "generalization" | "redirection"
  | "fear" | "authority" | "emotion" | "vagueness" | "repetition"
  | "false_binary" | "false_causation" | "in_group" | "framing"
  | "burden" | "identity" | "unknown";

export type TaxonomyEntry = {
  canonical_id: string;
  type: MarkerType;
  display: string;
  definition?: string;
  archetype: Archetype;                   // NEW — required after one-time population (§7.5)
};
```

### 3.3 Rationale

- **Nullable `speaker_id`** — diarization can fail for short fragments, the dev-only `window.__factify.onFinalUtterance` shim doesn't carry speaker info, and back-compat with pre-Sprint-1 exports.
- **Required `topic` with "Other" fallback** — clean schema for downstream consumers (Sprint 6's PDF crosstabs); free to add now while extract-claims prompt is already being edited.
- **`speakers` at Session level, not per-segment** — single source of truth for labels; renaming "Speaker 1" → "Israel" updates one entry, not thousands of segments/claims/markers.
- **`SessionSource` as a discriminated union** — every UI surface and exporter branches cleanly on `kind`. Sprint 1 only uses `{ kind: "mic" }`; Sprints 3-4 light up the other variants.
- **`Archetype` field on taxonomy** — abstraction layer between marker identity and rendered icon. Lucide icons today, bespoke illustrations later, with zero MarkerChip changes when the upgrade lands.

## 4. Diarization wiring

### 4.1 Deepgram client — `lib/client/deepgram-stream.ts`

Add `diarize=true` to the streaming query string:

```ts
const params = new URLSearchParams({
  model: "nova-3",
  language: "en",
  punctuate: "true",
  smart_format: "true",
  interim_results: "true",
  utterance_end_ms: "1000",
  diarize: "true",                         // NEW
});
```

`onmessage` parses `channel.alternatives[0].words[]` for per-word `speaker` tags. Derive one `speaker_id` per final utterance as the dominant (mode) speaker across that utterance's words:

```ts
type Word = { word: string; start: number; end: number; speaker?: number };

function dominantSpeaker(words: Word[]): number | null {
  if (!words || words.length === 0) return null;
  const counts = new Map<number, number>();
  for (const w of words) {
    if (typeof w.speaker !== "number") continue;
    counts.set(w.speaker, (counts.get(w.speaker) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  return [...counts.entries()].reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}
```

**Implementation note**: confirm the Deepgram nova-3 response shape against current Deepgram docs (https://developers.deepgram.com) before finalizing the parser. The exact field name on word objects is the brittle bit.

### 4.2 Store — `lib/client/session-store.ts`

Added state and actions:

```ts
speakers: Speaker[];                       // initially []
source: SessionSource;                     // initially { kind: "mic" }

ensureSpeaker: (id: SpeakerId) => void;    // idempotent — pushes { id, label: `Speaker ${id+1}` } if absent
renameSpeaker: (id: SpeakerId, label: string) => void;  // trimmed; empty → reverts to default
```

`appendFinal(segment)` calls `ensureSpeaker(segment.speaker_id)` before appending if `speaker_id !== null`. `startSession()` resets `speakers: []`. `reset()` likewise.

### 4.3 Orchestrator — `lib/client/orchestrator.ts`

**Claim attribution**: in `onFinalUtterance(segment)`, when constructing the new `ClaimCard`, set `speaker_id: segment.speaker_id`. No prompt change — extract-claims doesn't need to know about speakers.

**Marker attribution**: after `runRhetoric` receives markers from the API, for each marker, find transcript segments whose `[start, end]` overlaps `[marker.start_time, marker.end_time]`. If all overlapping segments share one `speaker_id`, set `marker.speaker_id` to that. Mixed = null.

```ts
function attributeMarker(
  m: Omit<RhetoricMarker, "id">,
  transcript: TranscriptSegment[],
): SpeakerId | null {
  const overlapping = transcript.filter(
    (s) => s.end >= m.start_time && s.start <= m.end_time && s.speaker_id !== null,
  );
  if (overlapping.length === 0) return null;
  const ids = new Set(overlapping.map((s) => s.speaker_id!));
  return ids.size === 1 ? overlapping[0].speaker_id : null;
}
```

### 4.4 Transcript visual — `components/session/TranscriptView.tsx`

Reshape from one flowing paragraph into speaker blocks. Group consecutive same-speaker segments; break on speaker change with a labelled header.

Color palette (light-theme — solid 600-tones on white, per [`memory/feedback_visual_companion_theme.md`](../../../.claude/projects/-Users-israelbitton-Live-FactCheck/memory/feedback_visual_companion_theme.md)):

```ts
const SPEAKER_PALETTE = [
  { dot: "bg-sky-600",     label: "text-sky-700",     border: "border-sky-500" },
  { dot: "bg-fuchsia-600", label: "text-fuchsia-700", border: "border-fuchsia-500" },
  { dot: "bg-amber-600",   label: "text-amber-700",   border: "border-amber-500" },
  { dot: "bg-emerald-600", label: "text-emerald-700", border: "border-emerald-500" },
  { dot: "bg-violet-600",  label: "text-violet-700",  border: "border-violet-500" },
  { dot: "bg-rose-600",    label: "text-rose-700",    border: "border-rose-500" },
  { dot: "bg-cyan-600",    label: "text-cyan-700",    border: "border-cyan-500" },
  { dot: "bg-lime-600",    label: "text-lime-700",    border: "border-lime-500" },
];
// indexed by speaker_id % 8
```

Each block: a `border-l-2 border-${color}` on the left edge, a small uppercase label chip at the top (`SPEAKER 1` or renamed), then the segments. Claim highlighting (`HIGHLIGHT_TONE` from existing code) still applies inline within each block — speaker color is the LEFT BORDER only, no background tint, so it composes cleanly with the claim-verdict background tones.

**Single-speaker sessions**: when `speakers.length <= 1`, render as today — no border rule, no label chip. Avoids visual noise for monologues.

### 4.5 Header rename UI — `components/session/SessionHeader.tsx`

A new row of speaker chips, rendered between the timer block and the action buttons, only when `speakers.length >= 2`. Each chip: colored dot from palette + label.

Click chip → label becomes an inline `<input>` prefilled with current value. Enter saves via `renameSpeaker`; Escape reverts; blur saves. Max length 24; empty value reverts to default `Speaker N+1`.

Mobile / narrow header: chips wrap to a second row beneath the timer (Sprint 5's responsive pass will tighten this further; `flex-wrap` is enough for Sprint 1).

### 4.6 ClaimCard / MarkerChip speaker badges

When `speaker_id !== null`, both render a small badge in their header next to the verdict pill / type label: colored dot + speaker label (looked up from store's `speakers[]`). Click is a no-op for v1 (Sprint 5 wires this to filter-by-speaker).

### 4.7 Exporter updates — `lib/export/{json,markdown,report}.ts`

- **JSON**: includes `speakers[]`, `source`, and `speaker_id` on every segment / claim / marker (naturally — already serializing the full session state)
- **Markdown**: transcript prefixed `[Speaker 1]` or `[Israel]`; claim entries get a `— Speaker 1` line above the explanation; marker entries similar
- **HTML report**: a "Speakers" table near the top (only renders when ≥ 2 speakers) with colored dot + label; transcript section renders speaker blocks visually similar to the in-app view; claim/marker entries get speaker tag inline

### 4.8 Documented limitations (not bugs — Sprint 1 boundary)

| Limitation | What it means | Fix horizon |
|---|---|---|
| Per-word dominant-speaker → one ID per utterance | Brief overlap within an utterance collapses to the louder voice | Sprint 6 — meta-analysis can use word-level data |
| Deepgram mid-session re-IDing | Long silence → "Speaker 1" returns as "Speaker 3" | Sprint 1 hedge — user renames both to "Israel"; downstream aggregation uses label, not id |
| 3+ speakers | Data model handles N; UI tested only with 2 | Sprint 5 — UI rework verifies 3-speaker layouts |
| Visual overlap representation | Two-people-at-once not distinguished from sequential turns | Sprint 6 |

### 4.9 Tests

- `tests/diarization.test.ts` (NEW) — `dominantSpeaker` mode logic; `attributeMarker` overlap rules
- `tests/session-store.test.ts` (NEW) — `ensureSpeaker` idempotency, `renameSpeaker` correctness, `startSession` resets registry

## 5. Durability wiring

### 5.1 JWT refresh + atomic WS swap

**Token endpoint** — `app/api/deepgram/token/route.ts` and `lib/server/deepgram.ts`:

Return shape extends from `{ key }` to `{ key, expires_at }`, where `expires_at` is epoch ms when this token dies. Computed server-side as `Date.now() + grantResponse.expires_in * 1000`.

**Browser flow** — `lib/client/deepgram-stream.ts`:

```
fetchToken() → openSocket(key1) → attach handlers
    ↓
scheduleRefresh at expires_at - 30s
    ↓
fetchToken() → openSocket(key2)
    ↓
atomically swap: `ws` ref → socket2 (one variable assignment)
    ↓
setTimeout 1500ms → close socket1 (drain in-flight results)
    ↓
scheduleRefresh again
```

Both sockets briefly open at swap; duplicate `onmessage` results during the drain window are caught by existing claim-hash dedup ([`lib/dedup.ts`](../../lib/dedup.ts)). `send(chunk)` reads the current `ws` ref each call. On error or refresh failure, bubble to `events.onError(e)` — the page already surfaces error banners.

`close()` clears the refresh timer first to prevent post-close refresh attempts.

**Out-of-scope for Sprint 1**: reactive reconnect on transient network drops. If the WS closes for non-JWT reasons, error banner fires; user clicks Record to restart. Auto-reconnect-with-backoff is v1.1.

### 5.2 Audio-level meter

A 5-bar VU indicator next to the REC dot. New component `components/session/AudioMeter.tsx`, embedded in `SessionHeader`. Wired by passing the active `MediaStream` from `page.tsx` to the header as a prop.

Implementation:
- `AudioContext` + `AnalyserNode` reading `getByteTimeDomainData`
- RMS over `frequencyBinCount` samples per `requestAnimationFrame` tick
- **Direct DOM style mutation via refs** — no React `setState` per frame. The 5 `<span>` elements are mounted once with `useRef`; the rAF loop mutates `style.opacity` / `style.background` per ref. Standard high-frequency-animation pattern; avoids reconciliation churn.
- Thresholds: bars light at `level >= [0.05, 0.10, 0.18, 0.30, 0.45]`; calibrated against a real two-speaker recording during implementation
- AudioContext closes on unmount and on session stop

### 5.3 Speakers-mode (echo-cancel) toggle

**Mic helper** — `lib/client/mic.ts`:

```ts
export async function startMic(
  onChunk: (chunk: Blob) => void,
  opts: { speakersMode?: boolean } = {},
): Promise<MicHandle> {
  const speakersMode = opts.speakersMode ?? false;
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: speakersMode
      ? { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      : { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  // ... rest unchanged
}
```

**Toggle UI** in `SessionHeader.tsx`: a small button between the mode switcher and Record:

> `🔊 Speakers mode` (off by default)

Tooltip: *"Off: your voice only. On: also captures audio playing through this device's speakers — useful for testing with recorded conversations."*

**Mid-session toggle behavior**: Changing the toggle while recording requires restarting the MediaStream (Chrome's `getUserMedia` constraints can't be updated on an open stream). The page tears down + restarts the mic and the Deepgram socket silently. ~300ms transcript gap; one final utterance may be lost. Acceptable — toggle is set once before a demo.

**Store state**:

```ts
speakersMode: boolean;                     // session-scoped; default false; never persisted
setSpeakersMode: (b: boolean) => void;
```

Always defaults to off on every new session including reload — dangerous-by-default avoidance (you don't want speakers mode accidentally on during a real conversation, picking up YouTube playing in another tab).

### 5.4 `vercel.json` framework pin

New file at repo root:

```json
{
  "framework": "nextjs"
}
```

That's it. No `functions` glob — per the prior session's hard-learned lesson, App Router paths didn't match. Per-route `maxDuration` exports stay authoritative.

Committed in this sprint. Sprint 1 doesn't deploy; `vercel.json` exists in the repo so when deploy DOES happen (after user signs off), framework detection cannot drift.

### 5.5 Tests

- `tests/audio-meter.test.ts` (NEW) — RMS math against synthetic PCM buffers
- `tests/mic.test.ts` (NEW) — `speakersMode: true` produces all-flags-off constraint shape; `false` produces all-flags-on
- `tests/deepgram-token-shape.test.ts` (NEW) — `{ key, expires_at }` schema sanity from the token route
- WS refresh logic: integration-tested via the live session page; stubbing WebSocket is high-effort low-value

## 6. Folded small fixes

### 6.1 "Checking…" lifecycle — `components/session/ClaimCard.tsx`

Root cause: `lib/client/orchestrator.ts:63-67` initializes every new card with `primary_label: "UNVERIFIABLE", score: 0, status: "checking"`. `ClaimCard.tsx:42` unconditionally renders `{verdict.short}` and `{score}` — the UNVERIFIABLE pill appears immediately.

Fix is local to `ClaimCard.tsx`:

```tsx
const isPending =
  card.status === "checking" ||
  (card.status === "provisional" && card.primary_label === "UNVERIFIABLE");

// While pending: render the "Checking sources…" pill from StatusPill, hide verdict pill,
// hide score, show skeleton lines for explanation.
// Once confirmed (any label, including UNVERIFIABLE), show verdict pill + score normally.
```

Why also gate on `provisional + UNVERIFIABLE`: the no-tools provisional pass returns UNVERIFIABLE when it can't classify confidently. Showing that as terminal is exactly the user-observed bug. Confirmed (web-search-grounded) is the only path that can settle on UNVERIFIABLE legitimately.

No data model change. No prompt change.

### 6.2 Source URL sanitization — `app/api/verify-confirmed/route.ts`

`SourceSchema` uses `z.string().url()`, but malformed URLs like `https://www.cbsnews.com/...','domain':'cbsnews.com)` are technically parseable (`'`, `,` are valid pathname chars) so Zod waves them through. Real fix uses `web_search` authoritative citation URLs directly (Sprint 3 territory). Sprint 1 sanitizes the LLM-emitted ones.

Add a post-validation filter in the route:

```ts
function isCorruptUrl(url: string, domain: string): boolean {
  if (url.includes("','") || url.includes('":"') || url.includes("','domain'")) return true;
  try {
    const u = new URL(url);
    if (!domain) return false;
    return !u.hostname.endsWith(domain);   // hostname must end with the declared domain
  } catch {
    return true;
  }
}

const cleanSources = enriched.sources.filter(
  (s) => !isCorruptUrl(s.url, s.domain),
);
```

Corrupt sources drop silently. If all drop, the card shows zero sources — the existing UI handles that (verdict label remains useful).

Test: `tests/source-sanitize.test.ts` (NEW) — uses the corrupted URLs from session exports as fixtures.

### 6.3 Marker type validation against taxonomy — `lib/client/orchestrator.ts`

In `runRhetoric`, before the dedup loop:

```ts
import { getEntry } from "@/lib/taxonomy";

for (const m of markers) {
  const entry = getEntry(m.name);
  if (!entry) continue;                    // unknown canonical_id — drop the marker
  if (m.type !== entry.type) m.type = entry.type;       // silently correct
  if (m.display !== entry.display) m.display = entry.display;  // silently correct
  // ... existing dedup logic continues below
}
```

Taxonomy is the single source of truth for `(type, display)`. LLM freedom: `(name, excerpt, severity, start_time, end_time, explanation)` only. Catches the user-observed `[BIAS] Innuendo` class of error.

### 6.4 Marker dedup tightening — `lib/client/orchestrator.ts`

Current key (`orchestrator.ts:124`): `hashClaim(\`${m.name}::${m.excerpt}\`)`. Same excerpt with slightly different `name` slips through (the user observed three markers on `"his conclusion was something weird going on here"`: Appeal to Authority, Vagueness, Innuendo).

Change to `hashClaim(\`${m.type}::${m.excerpt}\`)`. Within the 40-item rolling window, at most one marker per (type, excerpt) — so at most 3 markers per quote (one fallacy + one bias + one rhetoric), which is the legitimate ceiling.

Tradeoff: legitimate multi-fallacy single-quote cases collapse to one. Acceptable — the explanation field names the specific device, and breadth > depth-per-quote at this scale.

Test: extend `tests/dedup.test.ts` with type-collapses-name cases.

### 6.5 Topic field on claims — `lib/prompts/extract-claims.ts`

Schema add:

```ts
const TOPIC = z.enum([
  "Politics", "Defense", "Economy", "Society",
  "Immigration", "Healthcare", "Climate",
  "Science", "Law", "History", "Culture", "Other",
]);

export const ExtractedClaim = z.object({
  claim_text: z.string().min(3),
  utterance_start: z.number(),
  utterance_end: z.number(),
  topic: TOPIC,
});
```

12 values — LiveFC's 7 (paper §2.3) plus Science / History / Culture / Society / Other for broader coverage.

System prompt addition: *"Tag each claim with a topic from: Politics, Defense, Economy, Society, Immigration, Healthcare, Climate, Science, Law, History, Culture, Other. Use 'Other' when none fit."*

Orchestrator passes LLM's `topic` through to `ClaimCard.topic`. ClaimCard renders a small uppercase topic chip in its header next to the verdict pill (e.g., `POLITICS · TRUE · 92`).

Invisible to v1 UX but unlocks: sort/filter by topic in Sprint 5, speaker×topic crosstab in Sprint 7's PDF, meta-analysis subject identification in Sprint 6.

Test: `tests/extract-claims-schema.test.ts` (NEW) — schema round-trip, "Other" fallback when LLM emits unknown topic.

## 7. Visual enrichment

### 7.1 Server-side OG metadata scraper — `lib/server/og-fetch.ts` (NEW)

No `cheerio` dep. Regex against the first 64KB of `<head>`.

```ts
const previewCache = new Map<string, SourcePreview>();   // in-memory LRU, capped at 500

export async function fetchPreview(url: string): Promise<SourcePreview | null> {
  const cached = previewCache.get(url);
  if (cached && Date.now() - cached.fetched_at < 7 * 24 * 3600 * 1000) return cached;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FactifyBot/1.0; +https://factify-rose.vercel.app)",
        "Accept": "text/html,application/xhtml+xml;q=0.9",
      },
      signal: AbortSignal.timeout(5_000),
      redirect: "follow",
    });
    if (!res.ok) return null;

    // Stream-read only the first 64 KB
    const reader = res.body?.getReader();
    if (!reader) return null;
    let html = "";
    let total = 0;
    while (total < 64 * 1024) {
      const { value, done } = await reader.read();
      if (done) break;
      html += new TextDecoder().decode(value);
      total += value.length;
      if (html.includes("</head>")) break;
    }
    void reader.cancel();

    const meta = (prop: string): string | null => {
      const re = new RegExp(
        `<meta\\s+(?:property|name)=["']${prop}["']\\s+content=["']([^"']+)["']`,
        "i",
      );
      const m = html.match(re);
      return m ? decodeHtmlEntities(m[1]) : null;
    };

    const preview: SourcePreview = {
      image_url: absolutize(meta("og:image") ?? meta("twitter:image"), url),
      image_alt: meta("og:image:alt") ?? meta("twitter:image:alt"),
      title: meta("og:title") ?? meta("twitter:title"),
      description: meta("og:description") ?? meta("twitter:description"),
      fetched_at: Date.now(),
    };

    if (!preview.image_url && !preview.title && !preview.description) return null;
    previewCache.set(url, preview);
    return preview;
  } catch {
    return null;
  }
}
```

`decodeHtmlEntities` and `absolutize` are small helpers in the same module (entity decode for `&amp;` etc.; absolutize for protocol-relative / root-relative `og:image` paths).

### 7.2 Async preview endpoint — `app/api/source-preview/route.ts` (NEW)

```
POST /api/source-preview
Body:     { urls: string[] }
Response: { previews: Record<string, SourcePreview | null> }
```

Fires all fetches in `Promise.allSettled` with the 5s per-fetch timeout. Returns within ~7s with whatever resolved.

### 7.3 Orchestrator wiring

In `verifyConfirmed`, after the existing `updateClaim` with the verified data:

```ts
useSession.getState().updateClaim(id, { ...data, status: "confirmed" });
void fetchAndApplyPreviews(id, data.sources);     // fire-and-forget; updates card again when previews land
```

`fetchAndApplyPreviews` posts source URLs to `/api/source-preview`, then patches each `Source.preview` field via another `updateClaim`. The card flashes verdict + sources first, image fades in 2-5s later.

### 7.4 Hero image selection — ClaimCard

```ts
function pickHero(card: ClaimCard): SourcePreview | null {
  if (card.sources.length === 0) return null;
  const expectedStance: Stance | null =
    card.primary_label === "TRUE" || card.primary_label === "MOSTLY_TRUE" ? "supports" :
    card.primary_label === "FALSE" || card.primary_label === "MISLEADING" || card.primary_label === "OMISSION" ? "contradicts" :
    null;

  const tierRank = (t: ReputationTier) => (t === "high" ? 2 : t === "mid" ? 1 : 0);

  const sorted = [...card.sources].sort((a, b) => {
    const t = tierRank(b.reputation_tier) - tierRank(a.reputation_tier);
    if (t !== 0) return t;
    if (expectedStance) {
      const s = (b.stance === expectedStance ? 1 : 0) - (a.stance === expectedStance ? 1 : 0);
      if (s !== 0) return s;
    }
    return 0;
  });

  for (const s of sorted) if (s.preview?.image_url) return s.preview;
  return null;
}
```

Hierarchy: highest reputation tier wins → within tier, prefer stance matching verdict → first available image. For UNVERIFIABLE / OPINION, just highest-reputation.

### 7.5 Rendering in ClaimCard

```tsx
{hero?.image_url && !compact && (
  <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-border/60">
    <Image
      src={hero.image_url}
      alt={hero.image_alt ?? hero.title ?? "Source preview"}
      fill
      unoptimized
      className="object-cover"
    />
    {(hero.title || hero.description) && (
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent p-2.5">
        {hero.title && (
          <p className="text-[12px] font-medium leading-tight text-white line-clamp-2">{hero.title}</p>
        )}
      </div>
    )}
  </div>
)}
```

- `unoptimized` skips Vercel's image optimizer — avoids `next.config.ts` `remotePatterns` allowlist for arbitrary domains coming out of `web_search`. Thumbnail-sized previews are fine without optimization.
- Compact variant (Mode D presentation strip): no hero image, cards stay tight.

### 7.6 Marker archetype icons

Archetype catalog (~15 categories) in `lib/taxonomy/archetypes.ts`:

```ts
import {
  Megaphone, XCircle, GitBranch, ArrowRightLeft, AlertTriangle,
  Crown, HeartHandshake, CloudFog, Repeat, Split, Zap,
  Users, Filter, Scale, Fingerprint,
} from "lucide-react";

export const ARCHETYPE_ICONS = {
  appeal_to: Megaphone,
  dismissal: XCircle,
  generalization: GitBranch,
  redirection: ArrowRightLeft,
  fear: AlertTriangle,
  authority: Crown,
  emotion: HeartHandshake,
  vagueness: CloudFog,
  repetition: Repeat,
  false_binary: Split,
  false_causation: Zap,
  in_group: Users,
  framing: Filter,
  burden: Scale,
  identity: Fingerprint,
  unknown: undefined,
} as const;
```

### 7.7 Populating the archetype field

One-shot script `scripts/tag-archetypes.ts`. Feeds the full taxonomy (123 entries) to Claude Opus 4.7 via the AI Gateway with the archetype catalog and asks for an archetype per entry. Writes back to `lib/taxonomy/book-entries.json` (the 55 book entries) and patches `lib/taxonomy/extras.ts` (the 68 hand-coded entries) via a deterministic generator.

Israel reviews and overrides any obvious misclassifications. Velocity: ~30 min of human time for 123 entries (the user IS the domain expert).

### 7.8 MarkerChip rendering

```tsx
const entry = getEntry(marker.name);
const Icon = ARCHETYPE_ICONS[entry?.archetype ?? "unknown"];

return (
  <div className="...">
    {Icon && <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />}
    <span className="text-[10px] uppercase tracking-wider">{entry?.type}</span>
    <span>{marker.display}</span>
    {/* severity badge */}
  </div>
);
```

Icons are subtle — a visual anchor next to the type label, not the whole identity.

### 7.9 Upgrade path

When custom illustrations are designed later: swap `ARCHETYPE_ICONS` values from lucide components to `<Image src={...}>`. Zero changes to MarkerChip / taxonomy data / orchestrator.

### 7.10 Tests

- `tests/og-fetch.test.ts` (NEW) — regex parsing against fixture HTML, `absolutize` correctness, 64 KB cap, timeout behavior
- `tests/hero-selection.test.ts` (NEW) — `pickHero` priority logic across reputation tiers and verdict stances
- `tests/taxonomy.test.ts` — extend to assert every entry has a valid `archetype`

## 8. Verification strategy

### 8.1 Acceptance gate ("works locally" = all pass)

| # | Check | Verification |
|---|---|---|
| D1 | ≥15-min two-speaker conversation runs without transcript stalling; JWT refresh fires silently at ~9:30 | Visible in browser DevTools: second `/api/deepgram/token` POST |
| D2 | Audio meter tracks each speaker's amplitude | Visual + agent-browser screenshot |
| D3 | Speakers-mode toggle off: playing the Tucker monologue export through speakers transcribes | Live test with laptop speakers |
| D4 | `vercel.json` exists at repo root with `{"framework":"nextjs"}` and is committed | `cat vercel.json` + `git log --diff-filter=A -- vercel.json` |
| B1 | Two speakers get distinct `speaker_id`s in every utterance | `window.__factify.session.getState().transcript` — non-null IDs toggling 0/1 |
| B2 | Transcript visually distinguishes speakers with colored border + label chip | Visual + agent-browser screenshot |
| B3 | Header chips rename → labels update everywhere | Click Speaker 1 chip, type "Israel", Enter — transcript, claim badges, marker badges all flip |
| B4 | Claims and markers carry `speaker_id` matching their originating utterance | Store inspection: card whose `utterance_start` is in Speaker 1's range has `speaker_id: 0` |
| F1 | No claim card ever shows "UNVERIFIABLE · 50" while still resolving | Live test on moon-landing fixture; in-flight cards read "Checking sources…" only |
| F2 | No card has a corrupted source URL like `','domain':'X.com)` | Spot-check any export |
| F3 | No marker has type mismatched with its taxonomy entry's canonical type | Spot-check markers panel + JSON export |
| F4 | Within rolling window, no two markers share `(type, excerpt)` | Tucker fixture replay — previously triple-flagged passages now resolve to one per (type, excerpt) |
| F5 | Every claim card has a `topic` field; UI renders a topic chip | Visual + JSON export check |
| V1 | Claim cards display preview images at top when any source has OG data | Moon-landing fixture: NASA card shows NASA preview |
| V2 | When all sources fail OG fetch or lack OG image, card renders cleanly without gap | Use a fixture with PDF-only / gov-only sources |
| V3 | Every marker chip shows an archetype icon | Visual — Appeal to Authority → Crown, Innuendo → CloudFog, etc. |
| V4 | Archetype taxonomy covers all 123 entries | `node -e "require('./lib/taxonomy').ALL.every(e => e.archetype)"` returns true |

### 8.2 Methodology

- **Two-speaker reality check is mandatory.** Dev shim (`window.__factify.onFinalUtterance`) is fine for claim/marker logic tightening, but diarization, audio meter, JWT refresh, and speakers-mode toggle require a real microphone and a real second voice. Synthetic injection cannot prove these work.
- **Agent-browser is mandatory for visual claims** per [`CLAUDE.md`](../../../.claude/CLAUDE.md). Before claiming any UI change works, the implementer drives `agent-browser` against `localhost:3001`, takes a screenshot, and describes the rendered result vs. intent.
- **No production deploy this sprint.** All verification on `localhost:3001`. Once the user signs off after their own two-speaker run, *then* `vercel deploy --prod` is discussed. Never preemptive.
- **`npx tsc --noEmit && npm run test:run` clean before each commit.** Existing 26 tests pass plus new tests added.
- **Three-strikes rule** ([`CLAUDE.md`](../../../.claude/CLAUDE.md)): if any acceptance check fails twice with surgical fix attempts, stop, write root-cause analysis, propose a different approach.

### 8.3 Local-only hard rule (captured here for the implementation plan to inherit)

- **No `git push`** unless the user explicitly says "push it"
- **No `vercel deploy` / `vercel --prod`** unless the user explicitly authorizes
- **No overwrites of `factify-rose.vercel.app`** in any form
- All work happens in this worktree (or a fresh worktree off `claude/jolly-kepler-076d7b` — see §10)
- **Spec commits within the worktree are fine** — they're not pushed, not deployed
- When user wants to ship after their verification, the implementer drafts the deploy command and ASKS before executing

## 9. Operational pre-flight (before the executor writes any code)

1. **Worktree base alignment.** The current worktree `wonderful-bhabha-796897` sits at the older Task-12 handoff state — 17 commits behind `claude/jolly-kepler-076d7b` (production). The executor must either rebase this worktree onto `jolly-kepler-076d7b`, or create a fresh worktree off `jolly-kepler-076d7b`. This is the first plan task.
2. **Environment confirmation.** `.env.local` has `VERCEL_OIDC_TOKEN` (refresh with `vercel env pull .env.local --yes` if stale), `DEEPGRAM_API_KEY` (40-char Member-role), `DEEPGRAM_PROJECT_ID`. Verify `npm run dev` starts cleanly on `PORT=3001` and `/session` reaches "Listening" state with the existing code before any Sprint 1 changes.
3. **agent-browser readiness.** `agent-browser skills get agent-browser` is loaded before any UI-touching task.

## 10. Constraints (locked, executor must honor)

- **AI Gateway routing:** `export const opus = "anthropic/claude-opus-4.7" as const` (plain string with dots; no `anthropic(...)` wrap; no `ANTHROPIC_API_KEY` references; post-tool-use hook will reject violations)
- **AI SDK v6:** `generateText({ output: Output.object({ schema }) })` — no `generateObject`
- **web_search tool import:** `import { anthropic } from "@ai-sdk/anthropic"` for `anthropic.tools.webSearch_20260209({ maxUses: 5 })` only
- **En-dashes in prompts:** `score (0–100)` is U+2013, not ASCII hyphen — hooks flag the latter as a model-slug-uses-hyphens false positive
- **Tailwind v4:** config lives in `globals.css` `@theme {}` — no `tailwind.config.ts`
- **shadcn style:** `radix-nova` (set in `components.json`) — don't switch
- **Path alias:** `@/lib/...`, `@/components/...`
- **Dev shim:** `window.__factify = { session, onFinalUtterance }` exposed when `NODE_ENV !== "production"`; dead-code-eliminated in prod
- **Zustand selectors returning fresh object literals** trip React 19's `getServerSnapshot` cache — memoize via `useMemo` or split selectors (`MarkersPanel` hit this in v1)
- **`vercel.json`** is allowed in this sprint, but ONLY `{ "framework": "nextjs" }` — no `functions` glob

## 11. Out-of-scope (explicit roadmap)

These are NOT bugs and NOT gaps in Sprint 1. Each has a planned home.

| Item | Sprint |
|---|---|
| Claim normalization at extraction (co-ref resolution — paper §2.3) | 2 |
| Semantic dedup before verify-confirmed | 2 |
| Quote-vs-assertion handling at extraction | 2 |
| Claim decomposition into verification questions (paper §2.4) | 2 |
| Audio file upload (Deepgram pre-recorded) | 3 |
| Text document upload (.txt, .md, .docx, .pdf) | 3 |
| Direct media URL ingest | 3 |
| YouTube via captions (`youtube-transcript` + iframe embed) | 4 |
| Expandable / collapsible claim cards | 5 |
| Mobile-first responsive layout (vertical + horizontal) | 5 |
| Sort claims by verdict | 5 |
| 3-speaker UI validation | 5 |
| Meta-analysis agent (paragraph-level: subject, arguments, coherence, cogency, good-faith, psycholinguistic metrics) | 6 |
| Summary prose + truthfulness rating + good-faith rating + speaker×topic crosstabs in PDF | 7 |
| YouTube/social audio extraction (Vercel Sandbox or AssemblyAI) | 8 (optional) |
| Wikipedia / Snopes / Semantic Scholar direct retrieval (paper §2.4) | 9 (optional) |
| `/api/healthz`, pre-deploy CI gate, Sentry on server + client | Ops sprint |
| Reactive WS reconnect on non-JWT closes | v1.1 polish |
| Authenticated session storage / user accounts | Future (auth/marketplace integrations) |
| Shareable read-only `/s/<id>` URLs | Future (paired with persistence + auth) |
| Custom-illustrated marker icons (replacing lucide archetypes) | Design sprint, post Sprint 5 |
| ID-level speaker merging (when Deepgram re-IDs the same person mid-session) | v1.2 |

## 12. Success criterion (one sentence)

A 15-minute, two-speaker conversation produces a stable, visually-attributed transcript with image-illustrated claim cards and icon-decorated rhetoric markers — verified by the user on `localhost:3001`, with no production deploy until that verification passes.

---

## Appendix A — Test inventory after Sprint 1

| File | Coverage |
|---|---|
| `tests/dedup.test.ts` (existing) | Claim & marker hash dedup; extended with type-collapses-name cases |
| `tests/reputation.test.ts` (existing) | Domain → reputation tier classifier |
| `tests/taxonomy.test.ts` (existing) | Taxonomy loading; extended to assert archetype field on every entry |
| `tests/setup.ts` (existing) | jest-dom matchers |
| `tests/smoke.test.ts` (existing) | 1+1=2 placeholder — replace at convenience |
| `tests/export/json.test.ts` (existing) | JSON export shape — extends naturally with new fields |
| `tests/export/markdown.test.ts` (existing) | Markdown export — extend with speaker-prefix cases |
| `tests/export/report.test.ts` (existing) | HTML report — extend with speakers-table fixture |
| `tests/diarization.test.ts` (NEW) | `dominantSpeaker` mode logic; `attributeMarker` overlap rules |
| `tests/session-store.test.ts` (NEW) | `ensureSpeaker` idempotency, `renameSpeaker`, registry reset |
| `tests/audio-meter.test.ts` (NEW) | RMS math against synthetic PCM |
| `tests/mic.test.ts` (NEW) | `speakersMode` flag → getUserMedia constraint mapping |
| `tests/deepgram-token-shape.test.ts` (NEW) | `{ key, expires_at }` schema sanity |
| `tests/source-sanitize.test.ts` (NEW) | Corrupt URL detection fixtures |
| `tests/extract-claims-schema.test.ts` (NEW) | Topic enum round-trip; "Other" fallback |
| `tests/og-fetch.test.ts` (NEW) | OG regex parsing; `absolutize`; 64KB cap; timeout |
| `tests/hero-selection.test.ts` (NEW) | `pickHero` priority across reputation tiers + verdict stances |

Expected total after Sprint 1: ~38 tests across 15 files (up from 26 / 7).

## Appendix B — File touch inventory

**New files:**
- `lib/server/og-fetch.ts`
- `app/api/source-preview/route.ts`
- `lib/taxonomy/archetypes.ts`
- `components/session/AudioMeter.tsx`
- `scripts/tag-archetypes.ts`
- `vercel.json`
- The 8 new test files listed in Appendix A

**Modified files:**
- `lib/types.ts` — type extensions
- `lib/client/session-store.ts` — speakers, source, speakersMode state + actions
- `lib/client/deepgram-stream.ts` — diarize flag, dominant speaker derivation, JWT refresh, atomic WS swap
- `lib/client/mic.ts` — speakersMode option
- `lib/client/orchestrator.ts` — speaker attribution on claims & markers, marker type validation, dedup key change, preview fetch trigger
- `lib/server/deepgram.ts` — `expires_at` in token response
- `lib/prompts/extract-claims.ts` — topic enum + prompt addition
- `lib/taxonomy/index.ts`, `lib/taxonomy/extras.ts`, `lib/taxonomy/book-entries.json` — archetype field populated via the one-shot script
- `app/api/deepgram/token/route.ts` — surface `expires_at`
- `app/api/verify-confirmed/route.ts` — URL sanitization filter
- `app/page.tsx` — `SessionSource.kind === "mic"` initialization (one-line, default behavior)
- `app/session/page.tsx` — pass `MediaStream` to header for `AudioMeter`
- `components/session/SessionHeader.tsx` — speaker chip row, speakers-mode toggle, AudioMeter slot
- `components/session/TranscriptView.tsx` — speaker block layout + palette
- `components/session/ClaimCard.tsx` — `isPending` rendering rule, topic chip, speaker badge, hero image
- `components/session/MarkerChip.tsx` — archetype icon, speaker badge
- `lib/export/json.ts` — speakers + source serialization
- `lib/export/markdown.ts` — speaker prefixes
- `lib/export/report.ts` — speakers table, per-segment speaker styling, per-claim/marker speaker tags

## Appendix C — Reference paper takeaways applied to Sprint 1

From Venktesh V & Vinay Setty, *LiveFC* (WSDM '25):

| Paper section | Applied to | Sprint |
|---|---|---|
| §2.2 — Overlap-aware online diarization (diart + pyannote) | Sprint 1's diarization design uses Deepgram's diarize=true; paper's `τ_active` / `Δ_new` are managed-service blackbox here, but the paper's explanation of permutation-invariance justifies our renamable-labels hedge | 1 |
| §2.3 — Topic assignment | Topic enum on every claim | 1 |
| §2.3 — Claim normalization (co-reference resolution) | Pipeline quality refit | 2 |
| §2.4 — Claim decomposition into verification questions | Pipeline quality refit | 2 |
| §2.4 — Multi-source evidence retrieval (Wikipedia, Snopes, Semantic Scholar) | Wikipedia direct sub-project | 9 (optional) |
| §3 — Speaker × supported/disputed crosstabs | Summary PDF anchor stat | 7 |

What the paper does NOT do that remains Factify's moat: rhetoric / bias / fallacy detection driven by Israel's book's 55-category taxonomy + 68 extras. The analytical lens is unclaimed territory; this sprint maintains it.
