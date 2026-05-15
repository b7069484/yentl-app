# Yenta · Handoff — 2026-05-15

**For:** a fresh Claude session picking up Yenta after the AST-010 v1.1 dashboard rebuild has landed.
**State:** Dashboard rebuild complete. Only the mic source works — text doc / audio file / YouTube / generic-media-URL ingestion are the next four features.
**Ball is in:** Israel's court on a few design decisions in §3 below; the rest can start immediately.

---

## TL;DR — three threads

| Thread | State | Where |
| --- | --- | --- |
| Sprint 1 backend (multi-speaker, durability, AI fixes, exports) | **Done.** From the prior session. | Branch `claude/sprint-1-multi-speaker-durability` in worktree `wonderful-bhabha-796897` · tip after rebuild `1e46939` |
| AST-010 v1.1 dashboard rebuild (Overview-first IA, L1–L4, brand) | **Done & verified.** 494/494 tests, `tsc --noEmit` clean, `pnpm build` clean, agent-browser swept at desktop + mobile across all four levels. 25 commits in this round, +25.5k LOC. | Same branch, commits `b95e3ab` → `1e46939` |
| Multi-source ingestion (text doc · audio file · YouTube · media URL) | **Not started.** Type system in `lib/types.ts` accommodates all four; UI + server routes are missing. | This handoff is the spec |

---

## What happened in the previous session (the dashboard rebuild)

Israel asked: "get it all done, all of it, I want to see a fully updated UI and UX, the full app we've devised." After locking design decisions on §13–§16 + Q1–Q21 + the 11 gap items from AST-010 v1.1, I executed a 21-task plan via subagent-driven-development. Highlights:

1. **Backend plumbing** — `/api/synthesize` route (Anthropic Opus, cached SYSTEM, AbortController), orchestrator `maybeRunSynthesis()` pacer (30s OR 5-utt), session-store `synthesis: null|warming|fresh|refreshing|error` state machine.
2. **Taxonomy enrichment** — live LLM pass against all 123 entries adding `how_to_spot[3-5]`, `further_reading` (Wikipedia + SEP), `related_canonical_ids[4-8]`, `wikipedia_slug` overrides. Audit JSON committed at `scripts/taxonomy-enrichment-proposals.json`.
3. **Brand tokens** — Yenta palette (cream/ink/amber/teal/spk-1..6) in `app/globals.css`, Newsreader serif + Inter sans via `next/font/google`, shadcn semantic tokens remapped, `.dark` block removed.
4. **Component tree** under `components/session/`:
   - `chips.tsx` — VerdictChip / MarkerChip / SpeakerChip / SourceChip / TopicChip primitives
   - `speaker-rail.tsx` — palette chips + active-speaker ring + 5-bar meter
   - `synthesis-card.tsx` — 5 states + mobile collapse with "Read Yenta's take ⌄"
   - `metric-tile.tsx` — generic tile for Claims / Markers / Speakers / Session
   - `topic-strip.tsx` + `activity-feed.tsx`
   - `home-overview.tsx` — L1 assembly, headline-chip routing
   - `filtered-list.tsx` + `claim-row.tsx` + `marker-row.tsx` + `filter-dropdown.tsx` — L2
   - `item-detail.tsx` + `claim-detail.tsx` + `marker-detail.tsx` + `lib/client/sibling-nav.ts` — L3 with ↑/↓ keyboard nav, Re-check functional, Dispute "coming soon"
   - `learn-more.tsx` + `marker-learn-more.tsx` + `claim-learn-more.tsx` + `lib/taxonomy/wiki-slug.ts` — L4
   - `session-shell.tsx` — sticky header + tabs + controls + speaker rail + dialog wiring
5. **Integration** — `app/session/layout.tsx` owns mic + Deepgram + orchestrator lifecycle across sub-routes; `app/session/page.tsx` is a `?view=` dispatcher with pre-record state.
6. **Polish** — Space keyboard shortcut for record/pause, brand-token landing page with Y-mark hero + serif "speak truth." + amber dot at the wordmark baseline with a 2.4s looping AI-pulse glow (defined in `globals.css` `@layer components` so Tailwind v4 / Turbopack doesn't strip it).
7. **Visual checkpoint** at `.project/screenshots/v1.1-rebuild/` (17 captures across desktop + mobile, L1–L4 + landing + pre-record).

**The full list of 25 commits** ranges from `b95e3ab feat(api): synthesize route + orchestrator pacer + store field` through `1e46939 copy(brand): drop "Yiddish soul" framing from landing description`. Read `git log --oneline 8ce6cb7..HEAD` from inside the worktree for the audit trail.

---

## What's waiting on Israel

A handful of design calls before the next round starts (§3). The implementation itself can begin as soon as those land. There are no blockers from the dashboard rebuild side — `pnpm build` is clean, all tests pass, nothing's been pushed.

Also still owed from the prior round but **non-blocking for ingestion work:**
- `lib/taxonomy/book-chapters.json` — Israel-provided mapping `canonical_id → { chapter_number, chapter_title }`. L4 marker pages currently render a "Chapter mapping coming soon" placeholder. Drop the file and the chapter link in the further-reading section activates automatically.

---

## §3 · The four ingestion features

The `SessionSource` discriminated union in [`lib/types.ts:99-104`](../../lib/types.ts) already accepts all four. The store accepts the kinds; nothing in the app produces them. Live mic via Deepgram WSS is the only path that works today.

### Feature 1 — Text doc paste / upload

**Spec:** A textarea or drop-zone accepts plain text or a `.txt` / `.md` / `.docx` file. Parse → sentence-split → feed into the orchestrator as fake `TranscriptSegment`s with synthetic timestamps. No transcription cost. Single-speaker by default; offer a "split on speaker label" toggle for transcript-style input where lines start with `David:` / `Mira:`.

**Server work:** None for `.txt` / `.md` — parse client-side. For `.docx`: a small `/api/parse-docx` route using `mammoth` or similar (~50KB dep). Alternative: reject `.docx` for v1, accept only plain text.

**Client work:**
- New `components/session/source-picker.tsx` rendering the four entry points
- Drop-zone + textarea for text input
- Parser in `lib/client/text-ingest.ts` (sentence-split via `Intl.Segmenter` if available, otherwise a regex fallback)
- Feed parsed sentences into `useSession.getState().appendFinal()` then `onFinalUtterance(seg)` so the rest of the pipeline (claim extraction, rhetoric markers, synthesis) lights up the same way mic input does

**Edge cases:** empty input, huge inputs (>50k tokens — should chunk), speakerless vs labelled transcript, paragraph vs sentence segmentation.

**Effort:** 1–2 hours. **Cost:** $0 transcript + normal LLM cost on the claims/markers pipeline.

### Feature 2 — Audio file upload

**Spec:** Drop an audio file (.mp3 / .wav / .m4a / .ogg / .webm) → upload to Vercel Blob → server kicks off a Deepgram **prerecorded** (batch) transcription job → polls for completion → streams the resulting transcript + diarization back to the client → fed into orchestrator the same way live mic is.

**Server work:**
- `pnpm add @vercel/blob` (already in marketplace), `pnpm add @deepgram/sdk` if not already
- `/api/upload-audio` — issues a Vercel Blob upload URL
- `/api/transcribe-batch` — POST `{ blob_url }`, calls Deepgram prerecorded with `diarize=true&punctuate=true&utterances=true&model=nova-3`, returns a job ID
- `/api/transcribe-status/[jobId]` — polls Deepgram, returns `{ status: "queued|running|done|error", transcript? }`
- Long-poll OR Server-Sent Events for live progress; SSE is cleaner if Vercel allows it on this route

**Client work:**
- File-input + drop-zone in the source picker
- Upload progress bar (0–100%)
- Polling loop with backoff
- "Processing audio…" pre-record state replacement
- When done: replay the diarized transcript into the orchestrator at slightly faster than realtime (so synthesis fires) OR just dump it all and run claim extraction in a single sweep

**Decision needed:** *replay strategy.* Real-time replay means synthesis behaves like a live session. Bulk-load means much faster results but the synthesis only fires once at the end. My recommendation: bulk-load by default with a "replay at 2× speed" option for demos.

**Effort:** 3–4 hours. **Cost:** Deepgram prerecorded is ~$0.0043/min for nova-3 = ~$0.26 per hour of audio + Anthropic for claims/markers (variable).

### Feature 3 — YouTube URL

**Spec:** Paste a YouTube URL → server resolves the video → ingests the conversation.

**Two paths inside this feature:**
- **Path A (preferred):** Pull YouTube's own auto-captions or human-provided captions via `youtubei.js` or the unofficial timedtext endpoint. Free, fast, no Deepgram cost. Works for ~80% of YouTube videos. No speaker diarization — single-speaker output by default.
- **Path B (fallback):** When captions aren't available, extract audio with `yt-dlp` (or use a hosted service like RapidAPI's YouTube-to-MP3) → run through the audio-file pipeline (Feature 2). Costs the same as audio-file. Has diarization.

**Server work:**
- `/api/youtube-ingest` route. Accepts `{ url }`, validates with a YouTube URL regex, resolves video metadata
- `/api/youtube-captions/[videoId]` — captions-only path
- Falls through to audio-pull if no captions
- `yt-dlp` needs to be either bundled as a binary or called via a hosted API — **decision needed** on whether to ship the binary (heavy) or use a paid third-party

**Client work:**
- URL paste input in source picker
- Thumbnail preview (fetch from YouTube's oEmbed endpoint, no API key needed)
- Captions-available indicator (Path A vs Path B)
- Same "processing" + replay flow as audio-file

**Decision needed:** *yt-dlp vs RapidAPI.* yt-dlp on Vercel Functions has cold-start + binary-size issues. RapidAPI YouTube-to-MP3 services are reliable but ~$0.001/request. My recommendation: ship Path A only for v1 (caption-only), defer Path B until users complain.

**Effort:** 4–6 hours if Path A only; +3 hours if Path B. **Cost:** $0 for Path A, ~$0.26/hr-of-audio for Path B.

### Feature 4 — Generic media URL

**Spec:** Paste any direct audio/video URL (podcast RSS, MP3, MP4) → fetch on the server → run through the audio-file pipeline (Feature 2).

**Server work:**
- `/api/media-ingest` route. Validate URL is reachable, MIME is audio/* or video/*, content-length is sane
- Stream the bytes through Deepgram's URL-input mode (Deepgram accepts a remote URL directly — no upload step needed) — *this is the cheap shortcut*

**Client work:**
- URL paste input in source picker
- Same thumbnail/preview pattern as YouTube where possible
- SSRF protection on the URL (already have `lib/server/ssrf-guard.ts` from Sprint 1 — reuse it)

**Effort:** 2–3 hours **after** Feature 2 lands (most of the work is reused). **Cost:** same as audio-file.

---

## §4 · Design decisions to surface in your first reply

Don't pre-decide these. Brief Israel on each with a bolded recommendation, then wait:

1. **Source picker location** — (a) Landing page (`/`) "Start a session" expands into 4 buttons OR (b) Pre-record state on `/session` shows the 4 buttons stacked OR (c) Both. **Rec:** (c) — the landing page's primary CTA stays "Start a session" and routes to `/session`; the pre-record state on `/session` is where the 4 source options actually live, so users who land deep-linked also see them.
2. **Audio replay strategy** (Feature 2) — bulk-load with a "replay at 2× speed for demo" toggle. **Rec:** bulk by default; replay-toggle deferred to v2.
3. **YouTube depth** — Path A only (captions) vs Path A + Path B (audio fallback). **Rec:** Path A only for v1; ship Path B when there's user demand.
4. **`.docx` support** — accept and parse with `mammoth` (~50KB dep) vs reject and only take `.txt` / `.md`. **Rec:** accept .docx. The dep is small and the use case (paste a meeting transcript) is real.
5. **File-size limits** — Vercel Blob has a 5GB cap. Deepgram has a 4-hour audio limit. Settle on a UI-visible limit (~500MB audio, ~1MB text) so the user knows before upload.
6. **Cost authorization** — testing each feature end-to-end will burn ~$5–10 in Deepgram credits across several test files. Confirm before kicking off live runs.

---

## §5 · Implementation order

Recommended sequence — each step independently testable:

1. **Source picker shell** — UI component for the 4 options, mounts in pre-record state, navigation routes to per-source upload screens. No backend yet. (~1 hr)
2. **Text doc** — simplest, validates the orchestrator-can-accept-fake-segments contract. (~2 hr)
3. **Audio file** — the heaviest. Once this works, YouTube fallback and media-URL inherit it. (~4 hr)
4. **YouTube (Path A only)** — captions-only fast path. (~3 hr)
5. **Generic media URL** — reuses Deepgram URL-input mode. (~2 hr)
6. **Source-picker landing redesign** — landing CTA expands to show the 4 options on hover or as a dropdown. (~1 hr — optional, can wait)
7. **agent-browser visual sweep** + **final commit summary** (~1 hr)

**Total: 12–14 hours.** Plus $5–10 in Deepgram + Anthropic test credits.

---

## §6 · Tear-down & keep list

### Add:
- `app/api/transcribe-batch/route.ts` (audio + YouTube fallback + media URL)
- `app/api/transcribe-status/[jobId]/route.ts` (polling)
- `app/api/parse-docx/route.ts` (if accepting .docx)
- `app/api/youtube-ingest/route.ts` (resolves video, decides Path A or B)
- `app/api/media-ingest/route.ts` (URL ingest with SSRF reuse)
- `components/session/source-picker.tsx` (4-option UI)
- `components/session/text-ingest-pane.tsx` (textarea + drop-zone for Feature 1)
- `components/session/file-ingest-pane.tsx` (drop-zone + progress bar for Features 2/3-fallback/4)
- `components/session/youtube-ingest-pane.tsx` (URL paste + preview for Feature 3)
- `lib/client/text-ingest.ts` (sentence-splitting + speaker-label detection)
- `lib/client/ingest-orchestrator.ts` (replay parsed segments into the existing orchestrator)
- `lib/server/deepgram-batch.ts` (prerecorded API wrapper)
- `lib/server/youtube-captions.ts` (caption pulling)
- Tests for each parser, the SSRF reuse on media-URL, schema tests for batch-job responses

### Keep as-is:
- Everything in the dashboard tree (it just consumes the store; doesn't care about source)
- `lib/client/orchestrator.ts` — already source-agnostic
- `lib/client/session-store.ts` — `SessionSource` already supports all four kinds
- `lib/server/ssrf-guard.ts` — reuse for media URL validation

### Don't touch:
- `lib/client/mic.ts` and `lib/client/deepgram-stream.ts` — live mic path stays untouched. Multi-source is additive.

---

## §7 · Cross-cutting concerns

**Source attribution in the UI.** Once multiple sources are real, every claim/marker should be tagged with which source it came from. The data model already supports this via `session.source`. The UI hint: a small "from YouTube" / "from audio file" badge in the L1 Overview's `<SynthesisCard>` and on each L3 detail header.

**Persistence concern resurfacing.** A session built from a 2-hour podcast is too valuable to lose on a page reload. The "no cross-session history" decision (Q17 in AST-010 v1.1) was made when sessions were mic-only and ephemeral. With multi-source, persistence becomes worth revisiting — flag this to Israel for a Sprint 3 decision.

**Cost telemetry.** Add a small Deepgram+Anthropic dollar counter to the Settings cog menu so users can see what each session cost. Or at least log it server-side for audit.

---

## §8 · Files to know (in the bhabha worktree)

| Path | What |
| --- | --- |
| `docs/superpowers/handoff/2026-05-14-ast010-design-approval-pickup.md` | The prior session's handoff — context for how we got to the v1.1 dashboard |
| `docs/superpowers/plans/2026-05-15-yenta-ui-rebuild.md` | The 21-task plan that produced the dashboard rebuild |
| `docs/superpowers/handoff/2026-05-15-multi-source-ingestion-pickup.md` | This file |
| `lib/types.ts` (lines 99–104) | `SessionSource` discriminated union — your contract |
| `lib/client/session-store.ts` | Zustand store, already accepts all source kinds via `setSource` |
| `lib/client/orchestrator.ts` | Source-agnostic claim/marker pipeline — feed it `TranscriptSegment`s and it doesn't care where they came from |
| `lib/server/ssrf-guard.ts` | SSRF protection — reuse for media URL ingest |
| `app/api/deepgram/token/route.ts` | Existing Deepgram auth — reuse the same `VERCEL_OIDC_TOKEN` env path or wire a fresh API-key env if batch differs |
| `app/session/page.tsx` | View dispatcher — will need a new pre-record sub-state for "ingesting" |
| `bold-cray-e9479f/.project/dashboard.html` | Brand dashboard — drop new wireframes for the source picker here before coding (per the visual workflow memory) |
| `bold-cray-e9479f/.project/assets/ui/v3/AST-010_responsive-design-pack.html` | Dashboard design contract (v1.1). Reference only — ingestion isn't covered |
| `.project/screenshots/v1.1-rebuild/` | 17 baseline screenshots from the dashboard rebuild |

---

## §9 · Skills the next session needs

Load these via the `Skill` tool when you start:

- `superpowers:using-superpowers` (auto-loaded at session start)
- `superpowers:brainstorming` — **mandatory before any code**. The source picker is creative work; you need to align with Israel on the 6 decisions in §4 first
- `superpowers:subagent-driven-development` — for executing the implementation plan
- `agent-browser` — mandatory before claiming any UI work done. Load via `agent-browser skills get agent-browser`
- `frontend-design:frontend-design` — for the source-picker visual design

### Skills to NOT re-litigate

- The Sprint 1 plan is closed.
- The Yenta rebrand is done.
- AST-010 v1.1 dashboard is shipped. Brand tokens, IA (L1–L4), tab navigation, headline-chip routing, URL grammar — all locked.
- Don't touch `app/page.tsx`'s headline or "speak truth." tagline. Those are signed off.

---

## §10 · Important context the next session needs

### Israel's CLAUDE.md (project-wide rules)

Lives at `/Users/israelbitton/.claude/CLAUDE.md`. Key directives:

- **Project Type Discovery first** — never assume git/code work
- **No false completion claims** — say "I changed X, please verify Y" not "this fixes it"
- **Three strikes rule** — 2 failed fix attempts → root cause analysis → new approach
- **Architecture alignment gate** — restate what we're building before coding
- **agent-browser MANDATORY** for any UI work — use it to verify rendered output
- **`.project/dashboard.html` workflow** — drop new wireframes there before coding
- **No `git push`, no `vercel deploy`** unless explicitly authorized

### Memory notes

At `/Users/israelbitton/.claude/projects/-Users-israelbitton-Live-FactCheck/memory/MEMORY.md`:

- `user_author.md` — Israel wrote a 2024 book on cognitive biases / fallacies used by antisemites
- `project_factify.md` — original product brief (when the product was called Factify)
- `project_factify_state_2026-05-13.md` — v1 deployment record at factify-rose.vercel.app
- `project_factify_rebrand_2026-05-13.md` — rebrand to Yenta
- `feedback_project_dashboard_workflow.md` — the `.project/dashboard.html` workflow rule
- `feedback_visual_companion_theme.md` — light-mode-only design

### Repo layout (three worktrees)

```
/Users/israelbitton/Live FactCheck/                                          ← main worktree, untouched
└── .claude/worktrees/
    ├── bold-cray-e9479f/      ← brand/design ecosystem · dashboard.html · AST-010 lives here (read-only for design ref)
    ├── wonderful-bhabha-796897/  ← THE CODE WORKTREE · all builds happen here · branch claude/sprint-1-multi-speaker-durability
    └── elegant-mendeleev-cf3350/ ← throwaway orchestrator worktree from the prior session (had one stray commit cherry-picked back; ignore)
```

**Work in `wonderful-bhabha-796897`. Every `git`/`pnpm` invocation must be prefixed with `cd '/Users/israelbitton/Live FactCheck/.claude/worktrees/wonderful-bhabha-796897' &&` OR use `git -C '...'` / `pnpm -C '...'`. The Bash tool resets the shell between calls — commits made without this discipline land on the wrong worktree branch and have to be cherry-picked back.** I lost a commit to this once in the prior session.

---

## §11 · Health gates at the start

Before writing any code, verify:

```bash
cd "/Users/israelbitton/Live FactCheck/.claude/worktrees/wonderful-bhabha-796897"
git branch --show-current     # → claude/sprint-1-multi-speaker-durability
git log --oneline -1          # → 1e46939 (or higher if Israel made more commits)
pnpm tsc --noEmit             # → clean
pnpm test:run                 # → 494/494 in 36 files
pnpm build                    # → 12 routes, no errors
```

If any of those fail, STOP and debug before touching anything else.

---

## §12 · Final note

The dashboard rebuild was the unblock. Multi-source ingestion is the next unblock — it's what turns Yenta from "live mic toy" into "any conversation in." After that lands, the obvious next thing is persistence (Q17 cross-session history) so a session built from a 2-hour podcast doesn't evaporate on reload.

The four features in §3 don't require redesigning the dashboard. They feed the existing pipeline. The hardest decisions are the six in §4; everything else is mechanical. Don't get sucked into rewriting the dashboard — it's done.

Sprint 1 was the foundation. v1.1 was the dashboard. Multi-source ingestion is what makes the product real.

---

## §13 · Starter prompt for the next session

Paste this into a fresh Claude Code session. The CWD doesn't matter — the prompt below sets it.

```
I'm picking up Yenta multi-source ingestion work. Read the handoff first,
verify branch state, then surface design decisions before any code moves.

HANDOFF:
/Users/israelbitton/Live FactCheck/.claude/worktrees/wonderful-bhabha-796897/docs/superpowers/handoff/2026-05-15-multi-source-ingestion-pickup.md

CWD-guard: all git + pnpm commands must run inside
/Users/israelbitton/Live FactCheck/.claude/worktrees/wonderful-bhabha-796897
(path has a space — quote it). Branch should be claude/sprint-1-multi-speaker-durability
at tip 1e46939 or higher. Verify with:
  cd "/Users/israelbitton/Live FactCheck/.claude/worktrees/wonderful-bhabha-796897" && git branch --show-current && git log --oneline -1

Also run the health gates from §11 of the handoff (tsc, tests, build)
and confirm all three pass before touching anything else.

Read CLAUDE.md (~/.claude/CLAUDE.md) and MEMORY.md
(~/.claude/projects/-Users-israelbitton-Live-FactCheck/memory/MEMORY.md)
for context. The .project/dashboard.html workflow note is non-negotiable —
any new wireframes for the source picker go there before code.

After you've read the handoff + verified health, report back with:

1. A single-paragraph restatement of what's done (dashboard), what's
   queued (the four ingestion features), and which six decisions in
   §4 of the handoff need my call.
2. Your recommendations on the six §4 decisions (the handoff has my
   suggestions in bold — agree, override, or propose alternatives).
3. Any spec gaps in §3 of the handoff you find unclear — flag them
   BEFORE I sign off, not after.
4. NO code changes yet. Wait for my reply on the six decisions and
   the implementation order in §5.

When implementation starts:
- Use superpowers:subagent-driven-development to dispatch implementers
- Load agent-browser before any UI verification
- No `git push`, no `vercel deploy` unless I explicitly say so
- Cost authorization: testing each ingestion feature end-to-end
  consumes ~$5–10 in Deepgram + Anthropic credits. Wait for my "go"
  before kicking off live transcription runs

Suggested implementation order per §5 of the handoff:
1. Source picker shell (UI only, no backend)
2. Text doc paste/upload (no Deepgram)
3. Audio file upload (Vercel Blob + Deepgram prerecorded)
4. YouTube (Path A captions only, defer Path B)
5. Generic media URL (reuses #3 plumbing)
6. agent-browser visual sweep + final summary
```

---

## §14 · Files added in this rebuild (full diff)

The 25 commits from `b95e3ab` → `1e46939` produced **84 files changed, +25,567 / -524**. Highlights:

- 22 new component files under `components/session/`
- 8 new test files under `tests/`
- 6 new API/page/route files under `app/`
- 4 new lib files under `lib/client/` and `lib/taxonomy/`
- 1 new enrichment script under `scripts/`
- 17 baseline screenshots under `.project/screenshots/v1.1-rebuild/`
- 2 new brand assets (Y-mark in `public/` and `app/icon.png`)
- 1 plan + 2 handoff docs (this one is the second)

Pure additions, no destructive removals. The retired components from Sprint 1 (`ClaimCardStack.tsx`, `MarkersPanel.tsx`, `MarkerTicker.tsx`, `SessionHeader.tsx`) are still on disk — no longer imported by `/session`, but kept until the cleanup phase. Don't be confused by their continued presence.
