# Factify v1 — Post-shakeout Handoff

**Date:** 2026-05-13
**Where we are:** v1 is feature-complete and live in production at **https://yenta.vercel.app**. End-to-end pipeline (mic → Deepgram → claim extraction → web-grounded verification → bias/fallacy detection → 3-column UI → HTML report export) verified working. The first real demo to a co-founder caught two design errors and one silent-failure mode; the design errors are fixed and live, the silent-failure mode is documented for the next pickup.
**For:** a fresh Claude Code session resuming work in `/Users/israelbitton/Live FactCheck`.

> **Read order:**
> 1. This document.
> 2. [`docs/superpowers/specs/2026-05-11-factify-design.md`](../specs/2026-05-11-factify-design.md) — design spec.
> 3. [`docs/superpowers/plans/2026-05-11-factify-v1.md`](../plans/2026-05-11-factify-v1.md) — original 27-task plan (all done).
> 4. [`docs/superpowers/handoff/2026-05-11-task-12-onward.md`](2026-05-11-task-12-onward.md) — the first handoff; useful for original-author context.
> 5. `~/.claude/projects/-Users-israelbitton-Live-FactCheck/memory/MEMORY.md` — persistent memory.

---

## TL;DR

- **Product:** Factify — Next.js 16 web app. Single English speaker, browser mic → Deepgram (`nova-3`) → Claude Opus 4.7 via Vercel AI Gateway. Live claim cards + rhetoric markers. Mode A (3-col) and Mode D (presentation) layouts. HTML / Markdown / JSON exports.
- **Author/user:** Israel B. Bitton. Wrote the 2024 book whose 55-category taxonomy seeds Factify's bias/fallacy detection.
- **Repo:** `main` branch, no remote. Worktree branch `claude/jolly-kepler-076d7b` is 17 commits ahead. **Don't** add a remote unless asked.
- **Latest commit:** `6de8d6b` — "Decouple End from Export; ship HTML report as primary export format"
- **Production:** `yenta.vercel.app` (deployment ID `dpl_W2pPq…` updated 2026-05-13). Vercel Authentication is **off**; the URL is public.
- **Tests:** 26/26 passing across 7 files. `tsc --noEmit` clean.

---

## What got done since the last handoff (in order)

```
6de8d6b  Decouple End from Export; ship HTML report as primary export format
7d932a3  ClaimCard compact variant for Mode D presentation strip
51911f5  Advance rhetoric pacer on every utterance, not just claim-bearing ones
35f5c7b  Drop vercel.json — per-route maxDuration exports are authoritative
4611d00  Add vercel.json with maxDuration for AI route handlers           [reverted]
eb24ec9  Add JSON + Markdown export (TDD) and End-session dialog
b560387  Memoize MarkersPanel counts to satisfy React's snapshot guard
31c3e36  Add markers UI + 3-col Mode A and presentation Mode D layouts
7b7b301  Expose dev-only window.__factify shim for end-to-end testing
5c2b5bb  Wire claim orchestrator + 2-column session layout
5b4e…     Add ClaimCard, ClaimCardStack, SourceListItem + verdict theme
f0ddcb6  Polish session UX: visible errors, ticking clock, real landing
e580d69  Add /api/verify-confirmed with web_search tool + reputation tier
5b67015  Add /api/verify-provisional (no-tools, no citations, ~1s)
dd6bace  Add /api/extract-claims (Claude Opus 4.7, structured output)
75b8050  [main: handoff doc for Task 12+ pickup]
```

All 26 of the original v1 tasks shipped, plus four post-ship items:
- **Polish pass** (visible error UX, ticking clock, real landing, real `<title>`).
- **MarkersPanel selector fix** (React 19 `getServerSnapshot` guard).
- **Orchestrator pacing fix** (rhetoric counter now advances even on claim-less utterances).
- **Export refactor** (decouple End/Export, add HTML report as primary format).

---

## Production deploy — three things that bit us, all now fixed

The first attempt to demo the production URL returned 404 / 401 everywhere. Root causes, in the order I peeled them:

1. **Wrong Vercel builder.** Framework auto-detect failed because the worktree sits below a parent `package-lock.json` (the multi-lockfile warning was the smoking gun). Vercel defaulted to `@vercel/static-build`, which only copies a `dist/` directory and emits `config.json` = `{ status:404, src:"^(?!/api).*$", dest:"/404.html" }`. Every route 404'd. **Fix:** `PATCH /v9/projects/$ID { framework: "nextjs" }` — set explicitly in the project settings. Future-proof by adding `"framework": "nextjs"` to a real `vercel.json` (deferred — wasn't strictly needed once dashboard was set).
2. **`ssoProtection` on by default.** Project shipped with `ssoProtection.deploymentType = "all_except_custom_domains"`, gating every `*.vercel.app` URL behind Vercel SSO. **Fix:** `PATCH ssoProtection: null`.
3. **Wrong `DEEPGRAM_API_KEY` in production.** The original Vercel env var was 19 chars — Deepgram keys are 40. Real value lived in `.env.local`. Endpoint failed with 403 *Insufficient permissions*. **Fix:** wipe all `DEEPGRAM_API_KEY` env records via the Vercel API, re-upload the correct 40-char Member-role key via API (not CLI — `vercel env add` from stdin silently mis-captures values).

Other infra changes that landed in the same pass:
- Vercel CLI upgraded `53.1.1 → 53.4.0` (didn't fix the framework issue but kept us off old code).
- Per-route `export const maxDuration` exports are now authoritative (`vercel.json` glob patterns fought App Router paths and lost).

---

## Active known issues (priority order)

These are real and will hit the user in real demos. They're documented in priority order — the first one is biting *right now*.

1. **Deepgram JWT silently expires after 10 min.** No mid-session refresh, no WS reconnect, no UI signal. Symptom: header shows "Listening" but transcript stops updating. The user hit this mid-co-founder-demo. The handoff doc has been flagging this as v1.1 work since day one; it's now blocking.
   **Fix:** in `lib/client/deepgram-stream.ts`, track expiry, fetch a fresh token before the WS dies, open a new WS, swap the recorder's destination. Or simpler interim: when `ws.onclose` fires unexpectedly, surface the existing error banner so the user knows recording died.
2. **`getUserMedia({ audio: true })` uses default `echoCancellation: true`.** Means the mic won't pick up audio playing through the same machine's speakers — Chrome filters speaker-origin sound out before Deepgram sees it. User tried demoing by playing the test paragraph through speakers and got silent transcription.
   **Fix options:** add a "Playing audio through speakers" toggle that constructs `getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })`. Or ship a separate "Capture tab audio" mode using `getDisplayMedia({ audio: true })`.
3. **No audio-level meter in the header.** When transcription silently fails, there's no visible signal that audio is even reaching the page. Add a tiny live VU meter next to the REC dot — turns silent failure into obvious failure.
4. **`vercel.json` was dropped to avoid a glob-pattern fight.** Per-route `maxDuration` exports work, but the framework setting is *dashboard-only*. If someone re-creates the project or unlinks, the framework regression returns. **Fix:** add `vercel.json` with `{ "framework": "nextjs" }` (no `functions` glob — that's what broke earlier).
5. **Test paragraph for demos** lives in chat memory, not the repo. Should be added as `docs/test-scripts/paragraph-1.md` so anyone resuming can find it.

Pre-existing deferred gaps (still real, lower priority):
- No fetch timeout on `/api/deepgram/token` (5s `AbortSignal.timeout()` would help).
- No retry/backoff on AI Gateway calls.
- `tests/smoke.test.ts` tests `1+1=2`; replace with a real `render` + assertion.

---

## Environment & auth

The user (Israel) has done all the infrastructure setup. **Don't redo any of this:**

- **Vercel project:** `b7069484-gmailcoms-projects/factify` (`prj_uVDwPwN3ykn5A56LhnmDRReeUtn8`). `.vercel/project.json` is gitignored; it's present in the worktree (copied from main during the first deploy session).
- **`framework: "nextjs"`** is set via project settings (API PATCH). Don't trust auto-detection.
- **`ssoProtection: null`** — production URL is public.
- **AI Gateway** is enabled. Auth via `VERCEL_OIDC_TOKEN` (auto-read by `@ai-sdk/gateway`). **NEVER reference `ANTHROPIC_API_KEY`** — the post-tool-use validation hook will reject it.
- **`.env.local`** contains:
  - `VERCEL_OIDC_TOKEN` (~24h TTL; refresh with `vercel env pull .env.local --yes`)
  - `DEEPGRAM_API_KEY` (40-char Member-role key)
  - `DEEPGRAM_PROJECT_ID`
- **Production env vars:** `DEEPGRAM_API_KEY` (40 chars, Member role) + `DEEPGRAM_PROJECT_ID` set in `production`. AI Gateway auth via Vercel OIDC, no manual key.
- **Anthropic Console:** `web_search` tool is **enabled** in the privacy settings — verified by live `/api/verify-confirmed` returning sources during the Nobel test.

---

## File layout (current)

```
/Users/israelbitton/Live FactCheck/
├── .env.local                                # gitignored
├── .vercel/project.json                      # gitignored
├── app/
│   ├── api/
│   │   ├── analyze-rhetoric/route.ts         # Claude Opus, taxonomy-constrained
│   │   ├── deepgram/token/route.ts           # JWT mint via auth.v1.tokens.grant
│   │   ├── extract-claims/route.ts           # structured output via Output.object
│   │   ├── verify-confirmed/route.ts         # web_search + server-side reputation enrichment
│   │   └── verify-provisional/route.ts       # no tools, no citations, ~1s
│   ├── globals.css                           # Tailwind v4 @theme
│   ├── layout.tsx                            # Factify metadata
│   ├── page.tsx                              # editorial landing
│   └── session/page.tsx                      # all the session wiring + Mode A/D + dialogs
├── components/
│   ├── session/
│   │   ├── ClaimCard.tsx                     # verdict-themed; has `compact` for Mode D
│   │   ├── ClaimCardStack.tsx                # animated stack with empty state
│   │   ├── EndSessionDialog.tsx              # just confirms ending, no exports
│   │   ├── ExportDialog.tsx                  # 3-format picker; Report HTML is primary
│   │   ├── MarkerChip.tsx                    # has "What is this?" disclosure → taxonomy
│   │   ├── MarkersPanel.tsx                  # memoized counts, type breakdown summary
│   │   ├── MarkerTicker.tsx                  # bottom-of-Mode-D ticker
│   │   ├── SessionHeader.tsx                 # REC pill, ticking clock, Export, End
│   │   └── TranscriptView.tsx                # supports compact + present variants, claim highlights
│   └── ui/                                   # shadcn radix-nova: badge, button, card, dialog, scroll-area, separator
├── docs/superpowers/
│   ├── handoff/
│   │   ├── 2026-05-11-task-12-onward.md      # original handoff
│   │   └── 2026-05-13-post-v1-shakeout.md    # this file
│   ├── plans/2026-05-11-factify-v1.md
│   └── specs/2026-05-11-factify-design.md
├── lib/
│   ├── client/
│   │   ├── deepgram-stream.ts                # browser WS (bearer subprotocol for JWTs)
│   │   ├── mic.ts                            # MediaRecorder wrapper; NO echo-cancel toggle yet
│   │   ├── orchestrator.ts                   # final utterance → extract → verify; rhetoric pacer at top
│   │   ├── session-store.ts                  # Zustand + dev-only window shim
│   │   └── verdict-theme.ts                  # central VERDICT/REPUTATION/STANCE palette
│   ├── export/
│   │   ├── json.ts                           # raw serialization + duration_seconds
│   │   ├── markdown.ts                       # plain-text section dump
│   │   └── report.ts                         # self-contained HTML report (primary export)
│   ├── prompts/
│   │   ├── analyze-rhetoric.ts               # taxonomy hints + marker schema
│   │   ├── extract-claims.ts                 # claim extraction schema + SYSTEM
│   │   ├── verify-confirmed.ts               # source schema + web_search prompt
│   │   └── verify-provisional.ts             # LABEL enum + no-citations prompt
│   ├── server/
│   │   ├── anthropic.ts                      # gateway model slug constant
│   │   └── deepgram.ts                       # token-minting helper
│   ├── taxonomy/                             # 123 entries: book/55 + extras/68
│   ├── dedup.ts                              # hashClaim + RecentSet FIFO
│   ├── reputation.ts                         # domain → high/mid/low classifier
│   ├── types.ts                              # ClaimCard, RhetoricMarker, Source, Session, …
│   └── utils.ts                              # shadcn cn helper
├── tests/
│   ├── dedup.test.ts
│   ├── export/
│   │   ├── json.test.ts
│   │   ├── markdown.test.ts
│   │   └── report.test.ts                    # HTML escaping coverage included
│   ├── reputation.test.ts
│   ├── setup.ts
│   ├── smoke.test.ts                         # still 1+1=2 — replace someday
│   └── taxonomy.test.ts
├── next.config.ts
├── package.json
└── vitest.config.ts
```

**26 tests, 7 files, all passing.**

---

## Critical conventions (don't forget — the hooks will yell if you do)

1. **Gateway routing uses a plain string.** `export const opus = "anthropic/claude-opus-4.7" as const`. Never wrap with `anthropic(...)`. Never hyphenate model versions. Never reference `ANTHROPIC_API_KEY`.
2. **AI SDK v6.** Use `generateText({ output: Output.object({ schema }) })` and destructure `const { output } = await ...`. `generateObject` is gone.
3. **`web_search` import.** `import { anthropic } from "@ai-sdk/anthropic"` is ONLY for `anthropic.tools.webSearch_20260209({ maxUses: 5 })`. The current dated helper is `webSearch_20260209` (verified in `node_modules/@ai-sdk/anthropic/dist/index.d.mts`); the older `20250305` also still exists.
4. **En-dash / em-dash inside prompts.** `score (0–100)` is U+2013, not ASCII hyphen. The validation hook flags `(0-100)` as a "model slug uses hyphens" false positive. Don't normalize.
5. **Path alias.** Use `@/lib/...`, `@/components/...`. tsconfig is set up.
6. **shadcn style is `radix-nova`** (set in `components.json`). Don't switch back to default.
7. **Tailwind v4.** Config lives in `globals.css` `@theme {}` — there is no `tailwind.config.ts`.
8. **Dev shim.** `window.__factify = { session: useSession, onFinalUtterance }` is exposed when `NODE_ENV !== "production"` for browser-driven testing without a real mic. Production builds dead-code-eliminate it.
9. **Zustand selector that returns a fresh object literal** trips React 19's `getServerSnapshot` cache guard. Memoize via `useMemo` or split into multiple selectors. MarkersPanel hit this; the pattern will hit again.

---

## Recommended next moves (the grand plan)

### Phase 2 — Durability (the user's biggest current pain)
**Do this first.** Without it, every demo is a coin flip.
- **Deepgram JWT refresh + WS auto-reconnect.** Track expiry, refresh ~30s before, swap WS, surface error if refresh fails. Issue #1 above.
- **Audio-level meter** in the header. Tiny inline SVG or canvas reading from an `AudioContext.createAnalyser()`. Turns silent failure into visible failure.
- **"Playing audio through speakers" toggle** in the header that constructs `getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })`. Issue #2.
- **`vercel.json` with `framework: "nextjs"`** so the dashboard setting isn't the only safety net. Issue #4.
- **`/api/healthz`** route: token mint + 50-token LLM ping. Hook to a Cron + external pinger.
- **Pre-deploy CI gate** that hits `/api/healthz` against the preview URL before promoting.
- **Sentry** on both server route handlers and the client orchestrator.

### Phase 3 — Persistence + sharing
Sessions vanish on tab close. Add Neon Postgres via Vercel Marketplace, a session-history view, and shareable read-only `/s/<id>` URLs. Biggest single unlock.

### Phase 4 — Input variety
Mic-only is the real-use bottleneck. Add: paste text, upload audio/video (Deepgram pre-recorded), YouTube/podcast URL ingest. Cover the cases where what you actually want to analyze is on someone else's recording.

### Phase 5 — Author's lens
Toggle that switches marker taxonomy to your book's 55 categories with full definitions + examples + cross-references surfaced in a side panel. Factify becomes the interactive companion to the book.

### Phase 6 — Per-card drill-down
Click a claim → modal with full source list, dissenting sources flagged, confidence breakdown, on-demand "why misleading" deeper LLM call. Verdict pill → defensible argument.

---

## Subagent-driven development discipline

The first handoff established this pattern. Use it for non-trivial tasks. For tiny tweaks the parent did inline; that's fine. Defaults:
- **Haiku 4.5** for verbatim-copy / mechanical / pure-logic-TDD tasks.
- **Sonnet 4.6** for SDK research, integration, debugging, UI judgment calls.
- **Spec reviewer** + **code quality reviewer** after each implementer dispatch — both cheap on Haiku unless surface warrants Sonnet.
- One implementer at a time, never parallel.
- Never skip reviews even on small surfaces.

---

## How to resume — quickstart

1. `cd "/Users/israelbitton/Live FactCheck"` (NOT the worktree — the worktree was for the v1 build push).
2. Read this handoff. Read memory `MEMORY.md`.
3. Verify prod is alive: `curl -sI https://yenta.vercel.app/` → 200.
4. Verify token mint: `curl -s -X POST https://yenta.vercel.app/api/deepgram/token | jq -r .key | head -c 30; echo` → starts with `eyJ...`.
5. Pick the first move from Phase 2 (Deepgram JWT refresh is the biggest user pain).
6. If touching code: `npx tsc --noEmit && npm run test:run` before commit.
7. Deploy: `vercel deploy --prod` from a worktree with `.vercel/project.json` present.

For local dev: `PORT=3001 npm run dev` (assume the user's main checkout is using 3000). `.env.local` must be present.

For browser verification: `agent-browser skills get agent-browser`, then drive against `http://localhost:3001` or `https://yenta.vercel.app`. The dev-only `window.__factify` shim lets you inject synthetic utterances without a real mic — see how the previous session used it.

---

## What NOT to do

- Don't add a git remote or push without explicit user request.
- Don't re-add `vercel.json` with a `functions` glob — the App Router paths don't match. Per-route `maxDuration` exports are the way.
- Don't re-introduce `ANTHROPIC_API_KEY` references.
- Don't use `generateObject` (gone in AI SDK v6).
- Don't replace en-dashes in prompt strings with ASCII hyphens.
- Don't couple End with Export again. End just ends. Export is its own button.
- Don't make JSON the default download. The HTML report is the user-facing artifact; Markdown is a secondary plain-text option; JSON is for developers.
- Don't dispatch multiple implementer subagents in parallel.
- Don't polish the brainstorming workspace at `.superpowers/`. User has called this out twice.

---

## Open questions to surface when resuming

- Is the next session going to be a polish/durability sprint (Phase 2), or jump straight to persistence (Phase 3) for sharable session URLs? Recommend Phase 2 first.
- Once durability lands, does the user want a public marketing surface (current landing) or a private-only "log in to see your sessions" mode?
- Phase 5 (book lens) is the differentiator — at what point is it worth pulling forward?

---

*End of handoff. The next session has everything it needs to continue. Good luck.*
