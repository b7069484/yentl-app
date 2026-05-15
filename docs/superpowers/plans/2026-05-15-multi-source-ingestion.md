# Yenta · Multi-source Ingestion · Implementation Plan
**Date:** 2026-05-15 · **Branch:** `claude/sprint-1-multi-speaker-durability` (worktree `wonderful-bhabha-796897`)

## Goal

Turn Yenta from a live-mic-only app into a multi-source ingestion app supporting **mic / text doc / audio file / YouTube (captions) / generic media URL**, with a clear listening-state indicator in the body of the session view.

## Locked design decisions (from §4 of the handoff)

| # | Decision | Locked value |
|---|---|---|
| 1 | Picker location | `/session` pre-record state only. Landing CTA stays one-button → `/session`. |
| 2 | Audio replay strategy | Bulk-dump utterances after transcription completes. No 2× replay mode in v1. |
| 3 | YouTube depth | Path A (captions) only. No `yt-dlp` / no audio fallback in v1. Graceful "no captions available" message. |
| 4 | `.docx` support | Yes, via `mammoth` **client-side** (browser build). |
| 5 | File-size limits | 500 MB audio · 1 MB text. Show file size + estimated Deepgram cost **before** upload. |
| 6 | Cost authorization | Confirmed. Short clips first; full-length only after plumbing validated. |

## Locked spec answers (from §3 spec gaps)

| Topic | Locked answer |
|---|---|
| Speaker-label regex (text doc) | `^([A-Z][a-zA-Z .'\-]{1,30})\s*[:—–]\s*` at line start. Permissive; if a line doesn't match, attribute to current/last speaker. |
| Text chunking | Split on paragraph boundaries (`\n\n+`), then re-split each paragraph on sentence boundaries via `Intl.Segmenter('en', { granularity: 'sentence' })`. Feed sentences sequentially into `appendFinal()` then `onFinalUtterance()`. Existing 30s/5-utt pacer handles synthesis pacing. |
| Synthetic timestamps | ~150 wpm = ~400ms/word. `start_ms = wordsSoFar × 400`. Punctuation pauses ignored in v1. |
| Audio job lifecycle | Use Deepgram **sync mode** (await response). Their prerecorded endpoint accepts a single POST returning the full transcript when complete. Avoids polling complexity. Server function timeout extended to 5min via `export const maxDuration = 300`. For files >5min audio, this is risky — gate by file duration probe before submission (use `Audio` element metadata load on the client). |
| Bulk-load → synthesis | After bulk `appendFinal()` loop, explicitly call `runSynthesis()` once at end. Don't fight the pacer; bypass it after a bulk-load with an explicit invocation. |
| Audio length cap | 4 hours hard cap (Deepgram limit). Client-side reject with clear error before upload. |
| YouTube caption source | Raw `timedtext` endpoint: `https://www.youtube.com/api/timedtext?lang=en&v=VIDEO_ID`. Falls back to `?lang=en-US`, then auto-translated. |
| Caption timestamps | Preserve. Use `<text start="X" dur="Y">` attributes to populate `TranscriptSegment.start` / `.end`. |
| Caption language | Auto-pick English. Other languages out-of-scope for v1 (graceful "captions found but not English" message). |
| YouTube edge cases | Each failure mode (no captions, private, age-restricted, region-locked, deleted) returns a structured error: `{ ok: false, code: "NO_CAPTIONS" | "PRIVATE" | "..."}`. UI maps to friendly copy. |
| Media URL MIME detection | HEAD request → `Content-Type` check. If `application/octet-stream` or missing, fall back to URL extension parse (`.mp3`, `.m4a`, `.mp4`, etc.). Reject if neither matches. |
| Media URL length | Deepgram fetches the file. No client-side length pre-check possible (out of scope to range-probe). Accept the small wasted cost on rejected files. |
| Source picker → state graph | Picker is the pre-record body when `!startedAt`. Selecting "Mic" mounts the existing pre-record button. Selecting any other source mounts its respective ingest pane in the body. Header pill shows "Idle" until a source's ingest action fires `startSession()`. |
| `SourceChip` placement | Render in the L1 `<SynthesisCard>` header next to the brand timestamp. Tooltip on hover shows full source details. (Already exists in `components/session/chips.tsx`.) |

## Architecture

### State graph (mic path is unchanged)

```
[ landing ] → CTA → [ /session no startedAt ]
                          ↓
                  [ SourcePicker ]
                  /   |   |   |   \
              mic  text audio youtube media
                |    |    |    |     |
                ↓    ↓    ↓    ↓     ↓
        [start btn][textarea][drop+upload][url][url]
                |    |    |    |     |
   [startSession()]  |   (process)  |     |
        ↓            ↓    ↓         ↓     ↓
   [mic+WS hot]      ↓    ↓         ↓     ↓
        ↓            └──── bulk-dump ─────┘
        ↓                  ↓
        └──── HomeOverview (filling in real-time) ────┘
```

### Source-aware layout gate

`app/session/layout.tsx`'s mic-start `useEffect` gains a guard:
```ts
if (source.kind !== "mic") return;  // non-mic sources don't start the WS
```

### Listening-state body indicator

When `startedAt && transcript.length === 0 && source.kind === "mic"`:
- Render a "Listening for first words…" hero card in the HomeOverview body
- Include a live `AudioMeter` driven by the mic stream
- Skeleton hints for what will appear (1-line for claims, markers, synthesis)
- The header `LivePill` already says "Listening" — this is the body counterpart

When non-mic source is processing (e.g. audio upload), render a "Processing audio…" hero with progress bar instead.

## Tasks

Tasks are sequential. Each implementer subagent gets its task text + the contract files via the orchestrator. **Tests are required for every task.**

---

### T1 — Listening-state body indicator + mic-stream exposure

**Goal:** Body of `/session` shows a clear "Listening..." indicator while waiting for the first transcript. User no longer sees a blank page.

**Files:**
- Add: `components/session/listening-empty-state.tsx` — hero card with `AudioMeter`, pulsing dot, "Listening for first words…", skeleton rows
- Modify: `lib/client/session-store.ts` — add `micStream: MediaStream | null` + `setMicStream` action
- Modify: `app/session/layout.tsx` — call `setMicStream(mic.current.stream)` after mic starts; call `setMicStream(null)` on teardown
- Modify: `components/session/home-overview.tsx` — render `<ListeningEmptyState />` when `startedAt && transcript.length === 0 && source.kind === "mic"`

**Tests:**
- `tests/listening-empty-state.test.tsx` — renders pulsing dot, renders AudioMeter when stream provided, shows skeleton rows
- Update existing `home-overview.test.tsx` to assert the empty-state renders when transcript is empty

**Acceptance:** After clicking "Start a session", user sees a clearly active body (not blank) within 100ms, before the first transcript arrives.

---

### T2 — Source picker shell + source-aware layout gate

**Goal:** Pre-record state on `/session` becomes a 5-option picker. Mic path preserved. Other selections route to per-source panes that don't trigger the mic.

**Files:**
- Add: `components/session/source-picker.tsx` — 5-card picker (Mic / Text doc / Audio file / YouTube / Media URL). Each card has icon + title + 1-line description.
- Add: `lib/client/source-router.tsx` — small dispatcher: given `source.kind`, render the right pane. Mic uses the existing PreRecord button.
- Modify: `app/session/page.tsx` — replace inline `PreRecord` with `<SourceRouter />` when `!startedAt`. `SourceRouter` reads `source.kind` from store and dispatches.
- Modify: `app/session/layout.tsx` — guard mic-start useEffect: `if (source.kind !== "mic") return;`
- Add: `components/session/ingest-panes/` directory with stub files (one per non-mic source — placeholder content saying "Coming soon", to be filled by T3–T6):
  - `text-ingest-pane.tsx` (stub)
  - `audio-ingest-pane.tsx` (stub)
  - `youtube-ingest-pane.tsx` (stub)
  - `media-url-ingest-pane.tsx` (stub)

**Tests:**
- `tests/source-picker.test.tsx` — renders 5 cards; clicking each calls `setSource` with the right `kind`
- `tests/source-router.test.tsx` — given each source kind, renders the right pane (or PreRecord button for mic)

**Acceptance:** Visiting `/session` cold shows the 5-card picker. Clicking "Microphone" → button + start works exactly as before. Clicking any other → stub pane renders, mic does NOT start.

---

### T3 — Text doc ingest pane

**Goal:** User pastes text or drops a `.txt` / `.md` / `.docx` file → parsed → fed into orchestrator as `TranscriptSegment`s → claims/markers/synthesis pipeline fires.

**Files:**
- Replace stub: `components/session/ingest-panes/text-ingest-pane.tsx` — textarea + drag-drop zone + "Process" button + optional "Speaker labels in text" toggle
- Add: `lib/client/text-ingest.ts` — parsing + segmentation:
  - `parsePlainText(raw: string, opts: { withSpeakers: boolean }): TranscriptSegment[]`
  - `parseDocx(file: File): Promise<string>` — uses `mammoth` browser build
  - Speaker regex: `^([A-Z][a-zA-Z .'\-]{1,30})\s*[:—–]\s*`
  - Sentence split via `Intl.Segmenter('en', { granularity: 'sentence' })`
  - Synthetic timestamps: ~400ms/word
- Add: `lib/client/ingest-orchestrator.ts` — `bulkIngest(segments: TranscriptSegment[]): Promise<void>` — calls `startSession()` if not started, then `appendFinal(seg) + onFinalUtterance(seg)` per segment, then `runSynthesis()` once at end
- Add dep: `pnpm add mammoth` (~50KB browser build)
- Modify: `package.json` (will be touched by pnpm add)

**Tests:**
- `tests/text-ingest.test.ts`:
  - Plain text: 3 sentences → 3 segments with monotonic timestamps
  - Speaker labels enabled: `David: hi.\nMira: hello.` → 2 segments with distinct speaker_ids
  - Speaker labels disabled: same input → 2 segments all speaker_id=0
  - .docx file: parse via mammoth, returns expected text (use a tiny fixture .docx)
  - Empty input → []
  - Huge input (10k sentences) → all segments produced, timestamps monotonic
- `tests/ingest-orchestrator.test.ts`:
  - Calls `startSession` once, `appendFinal` per segment, `runSynthesis` once at end
- `tests/text-ingest-pane.test.tsx`:
  - Renders textarea, drop zone, toggle, button
  - Clicking "Process" with text in textarea calls `bulkIngest`
  - Dropping a .txt file populates textarea
  - Dropping a .docx file calls `parseDocx` then populates textarea

**Acceptance:** User pastes a 3-paragraph transcript, clicks Process, sees session start, claims+markers appear in real time, synthesis renders at end. No Deepgram cost.

---

### T4 — Audio file ingest pane (Vercel Blob + Deepgram prerecorded)

**Goal:** User drops an audio file → uploaded to Vercel Blob → server transcribes via Deepgram prerecorded → bulk-dumps utterances into orchestrator with diarization.

**Files:**
- Replace stub: `components/session/ingest-panes/audio-ingest-pane.tsx` — drop zone + file metadata preview (duration probe via `<audio>` element) + estimated cost line + upload-progress bar + "Processing..." state
- Add: `app/api/upload-audio/route.ts` — issues a Vercel Blob upload URL (client-direct upload pattern)
- Add: `app/api/transcribe-batch/route.ts` — POST `{ blob_url, duration_sec }` → Deepgram prerecorded sync call → returns `{ utterances: TranscriptSegment[], speakers: Speaker[] }`. `export const runtime = "nodejs"` and `export const maxDuration = 300`.
- Add: `lib/server/deepgram-batch.ts` — wrapper around Deepgram prerecorded SDK call. Params: `{ url: string }` → returns parsed `TranscriptSegment[]` with `speaker_id` populated from diarization.
- Modify: `lib/client/ingest-orchestrator.ts` — already done in T3; reuse.
- Add dep: `pnpm add @vercel/blob`

**Env requirement:** `BLOB_READ_WRITE_TOKEN` (issued by `vercel link` + `vercel env pull`; will note this in summary).

**Tests:**
- `tests/deepgram-batch.test.ts` — mocks `@deepgram/sdk`, verifies it maps utterances → TranscriptSegment[] correctly (speaker_id present, timestamps preserved)
- `tests/audio-ingest-pane.test.tsx` — render, file drop, progress bar shows, cost estimate displays. Mocks fetch for upload + transcribe.
- `tests/api/upload-audio.test.ts` — POST returns `{ uploadUrl }`. Reject if no file
- `tests/api/transcribe-batch.test.ts` — POST returns `{ utterances }`. Reject if no blob_url. Mocks Deepgram

**Acceptance:** User drops a 30-second clip, sees file size + cost estimate, clicks Process, sees progress → processing → results. Diarized speakers render. Bulk synthesis fires once at end.

---

### T5 — YouTube Path A ingest pane (captions only)

**Goal:** User pastes a YouTube URL → server resolves video → fetches captions → bulk-dumps. Free, fast, single-speaker.

**Files:**
- Replace stub: `components/session/ingest-panes/youtube-ingest-pane.tsx` — URL input + thumbnail preview (via oEmbed) + "Fetch captions" button + processing state + clear failure messages
- Add: `app/api/youtube-ingest/route.ts` — POST `{ url }` → returns `{ video_id, title, channel, duration_sec, transcript_segments }` or `{ error: { code, message } }`
- Add: `lib/server/youtube-captions.ts`:
  - `parseYouTubeUrl(url: string): string | null` — extracts video_id from various URL forms
  - `fetchCaptions(videoId: string): Promise<TranscriptSegment[]>` — calls timedtext endpoint, parses XML, returns segments with preserved timestamps
  - Error codes: `INVALID_URL`, `NO_CAPTIONS`, `PRIVATE`, `AGE_RESTRICTED`, `NOT_ENGLISH`
- Add: `lib/server/youtube-oembed.ts` — small wrapper around YouTube oEmbed (no API key needed): `https://www.youtube.com/oembed?url=...`

**Tests:**
- `tests/youtube-url-parse.test.ts` — youtube.com/watch?v=X, youtu.be/X, m.youtube.com/watch?v=X, shorts URL, embed URL, invalid → null
- `tests/youtube-captions.test.ts` — mock fetch, parse fixture timedtext XML → TranscriptSegment[]
- `tests/api/youtube-ingest.test.ts` — happy path + each error code
- `tests/youtube-ingest-pane.test.tsx` — URL input, thumbnail render on paste, error states

**Acceptance:** User pastes a captioned YouTube URL (e.g. a TED talk), sees thumbnail, clicks Fetch, sees claims populate from the caption transcript. Bad URLs surface friendly errors.

---

### T6 — Generic media URL ingest pane (Deepgram URL-input mode)

**Goal:** User pastes a direct audio/video URL → server validates with SSRF guard → Deepgram fetches and transcribes directly → bulk-dumps.

**Files:**
- Replace stub: `components/session/ingest-panes/media-url-ingest-pane.tsx` — URL input + HEAD validation feedback + "Process" button + processing state
- Add: `app/api/media-ingest/route.ts` — POST `{ url }` → validates SSRF → HEAD-checks MIME → calls Deepgram with URL → returns `{ utterances, speakers }`
- Add: `lib/server/ssrf-guard.ts` — `assertSafeUrl(url: string)` throws on:
  - non-http(s) protocols
  - private IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16, fc00::/7, fe80::/10, ::1)
  - DNS rebinding (resolve hostname → check IP isn't private)
  - Localhost variants
- Add: `lib/server/media-mime.ts` — `checkMediaMime(url: string): Promise<{ ok: boolean; mime?: string; reason?: string }>` — HEAD request, check Content-Type; if `application/octet-stream` or missing, parse from URL extension
- Modify: `lib/server/deepgram-batch.ts` from T4 — already accepts `{ url }`, reuse

**Tests:**
- `tests/ssrf-guard.test.ts` — accepts public URLs, rejects each private range, rejects file:// / ftp://, rejects localhost variants
- `tests/media-mime.test.ts` — accepts audio/mpeg, audio/mp4, video/mp4. Falls back to extension. Rejects text/html
- `tests/api/media-ingest.test.ts` — happy path with mocked Deepgram, SSRF rejection, MIME rejection
- `tests/media-url-ingest-pane.test.tsx` — URL input, validate-on-blur, error states

**Acceptance:** User pastes a podcast MP3 URL, sees validation passes, clicks Process, sees transcript come in. Local URLs / private IPs blocked.

---

### T7 — agent-browser visual sweep + screenshots + commit summary

**Goal:** Verify all 5 source paths render correctly. Capture screenshots into `.project/screenshots/v1.2-ingestion/`.

Done by controller (me), not a subagent. Captures:
- `/session` with picker visible (desktop + mobile)
- Each pane individually (5 captures × 2 viewports)
- Listening-state body indicator (mic source, post-start, transcript-empty)
- Each pane after successful ingest (transcript populated, claims rolling in)
- Error states for YouTube (no-captions URL)

Final commit summary captures: total commits, files added, test count delta, screenshots.

---

## Health gates (run between every task)

```bash
cd "/Users/israelbitton/Live FactCheck/.claude/worktrees/wonderful-bhabha-796897"
pnpm tsc --noEmit
pnpm test:run
pnpm build
```

If any fail: STOP, debug, fix before next task.

## Cost ceiling for testing

| Test type | Estimated cost |
|---|---|
| Mic test | $0 |
| Text doc test | $0 Deepgram + ~$0.10 Anthropic |
| Audio file: 30s clip plumbing | $0.002 Deepgram + ~$0.10 Anthropic |
| Audio file: 2min real test | $0.009 Deepgram + ~$0.30 Anthropic |
| YouTube: 1 captioned video | $0 Deepgram + ~$0.30 Anthropic |
| Media URL: 30s remote MP3 | $0.002 Deepgram + ~$0.10 Anthropic |
| **Total max** | ~$1.40 |

Well under the $5–10 budget.

## Not in this plan (deferred)

- YouTube Path B (yt-dlp audio fallback) — Q3 deferred
- 2× replay mode for audio — Q2 deferred
- Persistence / cross-session history — Sprint 3 concern, flagged in handoff §7
- Cost telemetry counter in Settings — handoff §7, defer to v1.3
- `book-chapters.json` — non-blocking, Israel-owned
- Source attribution badges in L3 details — handoff §7. `SourceChip` already exists; just need to wire it in L3 headers. Will fold into T7 if time permits, else defer.
