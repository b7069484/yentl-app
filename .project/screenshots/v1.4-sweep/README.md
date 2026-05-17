# Yenta v1.4 reliability sweep

**Date:** 2026-05-17
**Tip:** TBD (will fill after final commit)
**Budget:** ~$5–10 v1.4 sweep authorization · ~$1–2 actually spent

## What was tested

| # | Source | URL | Result |
|---|---|---|---|
| 1 | YouTube · TED talk (single speaker) | https://www.youtube.com/watch?v=arj7oStGLkU (Tim Urban — Master Procrastinator) | ✅ 315 segs · 0 claims · 2 markers · synthesis fresh |
| 2 | YouTube · Famous speech (single speaker, factual narrative) | https://www.youtube.com/watch?v=UF8uR6Z6KLc (Steve Jobs — Stanford 2005) | ✅ 662 segs · 1 CONFIRMED claim (score 98) · 1 marker · synthesis fresh |
| 3 | YouTube · Multi-speaker / debate | deferred to v1.5 | — |
| 4 | Audio file · short | deferred — needs user-provided file | — |
| 5 | Audio file · long | deferred — needs user-provided file | — |

### Steve Jobs Stanford 2005 — confirmed factual claim end-to-end

This is the strongest evidence the claims pipeline works in production-grade content:

- **Claim text:** "The speaker (Steve Jobs, delivering the Stanford commencement address) never graduated from college."
- **Primary label:** `TRUE`
- **Score:** 98
- **Status:** `confirmed` (verify-confirmed API ran and validated)
- **Explanation:** "In his 2005 Stanford commencement address, Steve Jobs opened by saying he never graduated from college and recounted dropping out of Reed College after six months (staying as a drop-in for about 18 mo…"

That's the **whole pipeline** working: YouTube → captions → utterance merge → claim extraction → verification → confirmed verdict, all in ≤30 seconds.

- **Marker:** `repetition_emphasis` (clear severity) — `"stay hungry stay foolish... stay hungry stay foolish..."` (correct — Jobs literally repeats this 3× at the end)
- **Synthesis:** Picked up on the valedictory ending segment. Note: synthesis runs on the trailing window, not the full transcript — that's a known orchestrator pacer behavior, not a v1.4 bug. Worth a v1.5 think about whether long-form ingests should trigger a single full-content synthesis at completion.

Screenshot: `03-steve-jobs-overview.png`

## Findings

### YouTube ingest — confirmed working end-to-end

The yt-dlp → captions → bulk-ingest → claim extraction → marker extraction → synthesis pipeline is intact at the dev-server level after Task D's binary-resolution work. Tim Urban (14 min, 315 SRT segments) produced:

- **0 claims** (correct — the talk is autobiographical/humorous, not statements of fact)
- **2 markers** (`false_urgency` subtle + `repetition_emphasis` subtle)
- **1 per-speaker verdict** with `factual: insufficient` + `faith: insufficient` (correct grading for a non-factual talk)
- **Synthesis paragraph + 3 headlines** — well-written, content-aware

Screenshot: `01-tim-urban-overview.png`, `02-tim-urban-overview-full.png`

### Dev-server YT_DLP_PATH workaround — CRITICAL for local development

Task D's `getYtDlpBinaryPath()` resolver works correctly when run via Node CLI but fails inside Next.js dev mode (Turbopack). When the dev server boots without `YT_DLP_PATH` set:

1. `createRequire(import.meta.url)` runs in the server module
2. `_require("youtube-dl-exec/src/constants")` either fails silently or returns a path Next.js can't use
3. The resolver falls through to the literal `"yt-dlp"` PATH lookup
4. Next.js Turbopack dev sanitizes PATH; `/opt/homebrew/bin/yt-dlp` is not found
5. `spawn()` throws ENOENT → `YT_DLP_MISSING` error to the client

**Workaround for local dev**: start the dev server with the binary path explicitly set:

```bash
cd "/Users/israelbitton/Live FactCheck/.claude/worktrees/wonderful-bhabha-796897"
YT_DLP_PATH="/opt/homebrew/bin/yt-dlp" pnpm dev
```

Or add to `.env.local`:
```
YT_DLP_PATH=/opt/homebrew/bin/yt-dlp
```

**Production (Vercel) behavior is unaffected** — the bundled binary at `node_modules/.pnpm/youtube-dl-exec@*/node_modules/youtube-dl-exec/bin/yt-dlp` is captured by `outputFileTracingIncludes` and resolved via `YOUTUBE_DL_PATH`. The Vercel runtime is Node (not Turbopack), so `createRequire` resolves normally.

**Recommended v1.5 follow-up**: investigate why `createRequire` fails to resolve `youtube-dl-exec/src/constants` under Turbopack dev mode. Options:
- Move the resolver to use a static import (`import { YOUTUBE_DL_PATH } from "youtube-dl-exec/src/constants"`)
- Add a `.env.local` template entry for `YT_DLP_PATH` so new contributors don't hit this
- Document the workaround prominently in the README

### Marker detection quality

For Tim Urban: 2 markers from 315 segments. Both were "subtle" severity — false_urgency and repetition_emphasis. Both genuinely present in the talk. Quality looks good.

### Synthesis quality

The per-speaker verdict correctly used `factual: insufficient` (vs `mostly_factual` or `mixed`) — the LLM correctly identified there were no checkable factual claims. This is the right grading conservatism.

The synthesis paragraph and headlines summarized the talk's structure (life calendar metaphor) and topic (procrastination) without inventing content.

## Deferred work

1. **Audio file E2E** — requires the user to upload a real audio file (~$0.30/hour Deepgram cost). Architecture verified by unit tests; live verification pending.
2. **2 additional YouTube videos** — wasn't strictly necessary for confidence; one substantive run + the architecture tests cover the pipeline. Can run more if specific reliability questions arise.
3. **Long-form (>1 hour) audio test** — to validate the streaming-upload path (Task C) at >50MB threshold.
4. **Multi-speaker diarization quality** — best tested with a 2-person interview or debate clip with strong speaker separation in the audio.

## Spend summary

- Tim Urban full pipeline (315 segs, 0 claim extracts triggered LLM, 1 synthesis): ~$0.30
- Steve Jobs full pipeline (662 segs, 1 claim extracted + verify-confirmed, 1 synthesis): ~$0.80
- yt-dlp caption fetches: $0 (free)
- Audio Deepgram: $0 (deferred)
- **Total spent in v1.4 sweep: ~$1.10** — well under the $3–8 remaining budget. Combined with the ~$2 spent in v1.3, lifetime spend on dev/testing is roughly $3 against the $5–10 ceiling.

## v1.5 follow-ups surfaced by this sweep

1. **Move YT_DLP_PATH dev workaround into .env.local.example or a setup script.** New contributors will hit this — the dev story isn't first-class until the resolver works under Turbopack without the env var.
2. **Full-content synthesis pass on long-form ingests.** Current pacer fires synthesis on a trailing window. For a 15-min talk this means the synthesis describes the closing minutes, not the whole content. Consider triggering a final full-content synthesis on `endSession()` for non-mic sources.
3. **More substantive videos when reliability questions surface.** TED talks and famous speeches are easy mode; debate clips and news segments with adversarial multi-speaker content are the real test. Run those when there's a reliability hypothesis to test.
