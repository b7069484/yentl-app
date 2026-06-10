# Yentl — Full-Stack Audit
**Date:** 2026-05-28
**Auditor:** Reb Faivele (Claude Opus 4.7, 1M-context)
**Repo root:** `/Users/israelbitton/Live FactCheck`
**Worktree:** `claude/nostalgic-hamilton-a92578`
**Scope:** version state, UI consistency, under-the-hood wiring, trimodal evaluation findings, recommended fix path.

This audit reconciles four parallel investigations (architecture/branches, UI consistency, backend pipeline, trimodal eval + speaker-attribution research) plus targeted verification queries I ran to catch agent hallucinations. Every claim below is grounded with `file:line` references so Reb Yisroel can navigate directly to source.

---

## 0. Bottom Line

Yentl has matured from Factify v1 (mid-May 2026) into a production-shaped Yentl v5 with a serious tech stack (Next.js 16.2.6, React 19.2.4, Clerk + Neon + Drizzle, Anthropic Opus 4.7 via Vercel AI Gateway, Deepgram Nova-3). The brand is locked, the trust surfaces are real, the consent UI is implemented, and 27 of 28 compliance clauses landed in a single marathon Run 1.

**But under the hood, the analytical pipeline has a structural problem that the trimodal test made unignorable: Yentl can read words but cannot reliably tell who said them.** Production runs Deepgram with `diarize: false` in both streaming and batch paths. The batch parser silently defaults missing speakers to `0`, masquerading multi-speaker mono audio as a single speaker. The stream parser lands `speaker_id: null` on every final segment because `dominantSpeaker()` requires word-level speaker data that isn't being captured. Claim extraction then inherits whatever broken speaker the segment carried. Rhetoric markers are inferred post-hoc via time overlap with no speaker context sent to the model. The live "heat" pulse is purely transcript-language-driven — the `AudioMeter` component computes RMS but its output is thrown away after the UI renders it. Yentl is, today, half-deaf to the room.

The good news: a serious spec (`docs/superpowers/specs/2026-05-28-speaker-attribution-conversation-intelligence-spec.md`) and an 8-phase plan (`docs/superpowers/plans/2026-05-28-speaker-attribution-conversation-intelligence-plan.md`) already exist for the foundational fix, and Phase 1 is narrow and low-risk. The bad news: AI Act Article 50 binds on 2026-08-02 (about nine weeks from this audit), and the verdict surface, paywall surface, prosody integration, and BIPA-compliant voiceprint flow are all still missing.

**Five things to internalize:**

1. **Speaker attribution is the load-bearing problem.** Wrong speaker → wrong claim ownership → wrong markers → wrong "this person was wrong". Fix this before any other analytical refinement.
2. **The compliance scaffold is real and largely shipped.** ConsentGate, RecordingBeacon, trust pages, GDPR consent records, accessibility baseline, DPA documentation — all on main.
3. **Verdict, paywall, and prosody are gaps disguised as scope.** Components exist for verdict (`components/verdict/VerdictCard.tsx`, `ReportFlow.tsx`) and they are wired through `synthesis-card.tsx`, but there's no standalone verdict route and no shareable verdict URL. Paywall (V3.11) is referenced in commit history but the component does not exist on main. Prosody features (RMS, pitch, rate, pauses, overlap) are computed nowhere.
4. **There are eight goal scaffolds, not three.** The 28-clause compliance-foundation was split into five parallel sub-goals (a11y, ai-transparency, docs, trust-pages, verdict-scaffold). The hardening-pass (14 clauses) has not started.
5. **Hygiene leftovers carry signal.** `package.json` still names the workspace `"factify-scaffold"`. The Chrome extension still allow-lists `factify-rose.vercel.app`. `window.__factify` is preserved as a legacy alias by intent. These aren't shipping bugs, but they hint that the rebrand sweep is incomplete in places that matter (extension manifest, Deepgram token allowlist).

---

## 1. The Version Arc (the story so far)

To know where Yentl is, we need to see where it came from. Recovered from commit history, handoff docs, and `.goals/` state files.

### Phase 1: Factify v1 (2026-05-11 → 2026-05-13)
- **Spec:** [`2026-05-11-factify-design.md`](docs/superpowers/specs/2026-05-11-factify-design.md), [`2026-05-11-factify-v1.md`](docs/superpowers/plans/2026-05-11-factify-v1.md)
- v1 was the original live fact-check + bias/fallacy app, taxonomy seeded from Reb Yisroel's 2024 book on 55 cognitive biases/fallacies.
- Deployed at `factify-rose.vercel.app`; three post-launch prod-fix incidents per memory `project_factify_state_2026-05-13.md`.

### Phase 2: Sprint 1 (Multi-speaker + Durability) (2026-05-13 → 2026-05-17)
- **Spec:** [`2026-05-13-sprint-1-multi-speaker-durability-design.md`](docs/superpowers/specs/2026-05-13-sprint-1-multi-speaker-durability-design.md)
- The "first real two-speaker demo" exposed three blockers: Deepgram JWT silently expiring at 10 minutes, default `echoCancellation: true` blocking speaker-routed audio, and no diarization (every utterance attributed to a single anonymous speaker).
- Plus three pipeline bugs (UNVERIFIABLE rendered during in-flight verification, source URL corruption, marker type mislabeling) and dedup gaps.
- Sprint 1 landed nullable `speaker_id`, visual enrichment on claim cards, dev-only `window.__factify.onFinalUtterance` shim.

### Phase 3: Rebrand → Yenta → Yentl (2026-05-13 → 2026-05-17)
- 2026-05-13: rename Factify → Yenta.me.
- 2026-05-17 reversal to Yentl (better verb-fit, USPTO-cleaner, Singer's truth-seeker connotation). Final name locked.
- Handoff doc [`2026-05-17-v1.5-complete.md`](docs/superpowers/handoff/2026-05-17-v1.5-complete.md) explicitly documents `package.json "name": "factify-scaffold"` — **NOT renamed (workspace identifier; not user-visible)**. Same with `__factify` legacy alias and the Vercel project name "yenta".

### Phase 4: V3 UI Sprint (2026-05-17 → 2026-05-20)
Visual wireframe-match sprint, 8 screens, 10+ commits on `feat/v3-auth-screens`:
- **V3.18** signup, pixel-close, then gap fixes (`d147f44`, `6371e6f`)
- **V3.19** signin — wireframe match + cross-page CSS refactor (`f950e94`)
- **V3.20** magic-link verify — envelope hero (`e79a5a4`)
- **V3.1** source chooser page concept (`ba31d23`) — but only an API endpoint, no real `/sources` route
- **V3.4 + v3.21-23** claim sheet with 4 verdict variants (`d0edb7d`)
- **V3.11** paywall sheet — cap-reached + tier comparison + upgrade CTA (`cbb5422`) — **but the component is missing from main**
- **V3.13 + V3.37** YouTube watch page — orientation-gated landscape/portrait (`0a01c20`)
- **V3.16 + V3.34** YouTube ingest + no-captions fallback (`635ff34`)

### Phase 5: Phase 2 Auth + Data Foundation (around 2026-05-19)
- **`015ff83`** feat(phase-2): Clerk auth + Neon/Drizzle data layer (#2) — merged PR.
- Drizzle schema: `users`, `sessions`, `subscriptions`.

### Phase 6: Compliance Marathon (2026-05-18)
- 28-clause goal, single Run 1 marathon, completed in groups A–G.
- All 27/28 clauses landed; clause 4 (`AudioRouteDisclosure`) was blocked pending `RecordingBeacon`.

### Phase 7: This-Week-Actions (2026-05-20)
- 6 clauses, unblocking BIPA exposure:
  1. `diarize: false` explicitly set in both [`lib/server/deepgram-batch.ts:32`](lib/server/deepgram-batch.ts) and [`lib/client/deepgram-stream.ts:63`](lib/client/deepgram-stream.ts)
  2. EU endpoint switchable via `NEXT_PUBLIC_DEEPGRAM_REGION`
  3. `docs/dpa-status.md` sub-processor registry
  4. `components/session/ConsentGate.tsx`
  5. `components/session/RecordingBeacon.tsx`
  6. Clean working tree
- The `STATE.md` for this goal contains a candid 2026-05-20 honesty note: "No clause has moved since 2026-05-17 lock. The V3 wireframe sprint consumed all build cycles 2026-05-19 → 2026-05-20 and DID NOT touch any clause of this goal." Done in subsequent Run 1.

### Phase 8: Extension Panel Arc (2026-05-21 → 2026-05-27)
Iterative refinement of the live workspace panel:
- `5b61f41` Add Yentl extension validation handoff
- `2129c59` Improve extension panel analysis snapshot
- `b4d9d52` Improve extension latency and add Grok challenge
- `dfa17c3` Add extension Grok latency handoff
- `a7e6189` Redesign extension panel tabs and source context
- `af3f5ae` Preserve extension panel workspace and exports

### Phase 9: Consolidation (current main, 2026-05-27 → 2026-05-28)
- `34b8ad0` Simplify Yentl source and rail UI
- `bb237eb` Add UI glow support components
- `b7a96a6` Save Yentl launch UI and source pipeline work
- `d03bc39` Consolidate Yentl live workspace pipelines
- `870ae01` Rebase compliance defaults onto current session UI ← **HEAD**

### Phase 10: Speaker-Attribution Research & Tests (2026-05-28, today)
- Trimodal eval run on 8 candidates: [`agent-work/yentl-trimodal-evaluation/runs/2026-05-28T21-35-11-581Z/`](agent-work/yentl-trimodal-evaluation/runs/2026-05-28T21-35-11-581Z/)
- Spec: [`docs/superpowers/specs/2026-05-28-speaker-attribution-conversation-intelligence-spec.md`](docs/superpowers/specs/2026-05-28-speaker-attribution-conversation-intelligence-spec.md)
- Plan: [`docs/superpowers/plans/2026-05-28-speaker-attribution-conversation-intelligence-plan.md`](docs/superpowers/plans/2026-05-28-speaker-attribution-conversation-intelligence-plan.md)

---

## 2. What Actually Lives on Main Today

### 2.1 User-facing routes (verified by `ls app/`)

| Route | Purpose | Brand v5? | Notes |
|---|---|---|---|
| `/` | Marketing landing | ✓ | MagicBento hero, Fraunces wordmark, cream/paper, teal CTA |
| `/signup` | Clerk signup, V3.18 | ✓ | Left context panel + Clerk form split |
| `/signin` | Clerk signin, V3.19 | ✓ | Same shape, separate context panel component |
| `/session` | Live workspace | ✓ | The main product surface |
| `/sessions` | Session history | ✓ | Persisted from Drizzle `sessions` table |
| `/pricing` | Tier comparison | ✓ | Lives even though paywall sheet doesn't |
| `/demo` | Demo experience | unknown | Not deeply inspected |
| `/about`, `/methodology`, `/privacy`, `/terms`, `/accessibility`, `/faq`, `/changelog`, `/subprocessors`, `/contact` | Trust + legal + info pages | ✓ | All shipped per compliance Run 1 |
| `/project` | Internal/admin? | unknown | Worth confirming what this is |
| `/api/*` | Server routes | n/a | See §7 |

**Surfaces I expected but didn't find:**
- `/verdict` or `/verdict/[id]` — no route. `VerdictCard` and `ReportFlow` exist as components (`components/verdict/*`) and are consumed by [`components/session/synthesis-card.tsx`](components/session/synthesis-card.tsx) and [`app/accessibility/page.tsx`](app/accessibility/page.tsx), but there's no shareable verdict URL.
- `/sources` — the V3.1 commit ("source chooser page at /sources") only landed `app/api/source-preview`. There is no top-level `/sources` page route on main.
- `/watch` or `/youtube` — the YouTube watch page (V3.13/V3.37) lives **inside** the session as an ingest pane (`components/session/ingest-panes/youtube-ingest-pane.tsx`), not as a standalone route.
- `/paywall` — V3.11 was specced and committed but the component is absent. No grep hits anywhere in `components/`, `app/`, or `lib/`.

### 2.2 Backend capabilities (from package.json + pipeline audit)

- **Auth:** Clerk `^7.3.7`
- **Data:** Neon serverless + Drizzle ORM `^0.45.2`; schema in [`lib/db/schema.ts`](lib/db/schema.ts) — `users`, `sessions`, `subscriptions`
- **Transcription:** Deepgram SDK `^5.1.0` Nova-3 (batch + streaming); diarization **off in production** in both paths
- **Reasoning:** Anthropic Opus 4.7 via Vercel AI Gateway; routing constant `opus = "anthropic/claude-opus-4.7"` at [`lib/server/anthropic.ts:5`](lib/server/anthropic.ts)
- **Web search:** `anthropic.tools.webSearch_20260209` ({ maxUses: 5 })
- **Audio storage:** Vercel Blob `^2.3.3`, max 500MB, max 4h, 50MB stream threshold
- **YouTube ingest:** three-layer fallback (Innertube → youtube-transcript → yt-dlp); `youtubei.js`, `youtube-transcript`, `youtube-dl-exec` all in dependencies
- **Document ingest:** `mammoth` for `.docx`
- **UI:** Radix UI, shadcn, Tailwind, CVA, lucide-react, motion (Framer), GSAP, sonner toasts, ULID
- **Test runner:** Vitest

### 2.3 The Yentl Chrome extension
- Lives in `extension/` with `manifest.json` + `manifest.local.json`.
- Allow-lists `factify-rose.vercel.app` (legacy production URL) and `yentl.it` (target DNS).
- Tabs/panel work has been the dominant theme of the last week of commits.
- Connects to `localhost:3000`/`127.0.0.1:3000`, `yentl.it`, `factify-rose.vercel.app`, `api.deepgram.com`, `wss://api.deepgram.com`.
- The extension panel is rendered by [`components/session/extension-panel-view.tsx`](components/session/extension-panel-view.tsx) — **1,324 lines, monolithic**.

---

## 3. Branch & Goal State (the unmerged work)

### 3.1 Branches with real divergence from main

Verified by `git branch -a`. (Note: Agent 1 referenced `feat/verdict-scaffold` and `feat/extension-panel-refactor` — those do not exist. The real list:)

| Branch | Purpose | State |
|---|---|---|
| `feat/v3-auth-screens` | V3.x auth wireframe sprint | Largely merged to main via the V3.18 → V3.20 commits; branch tip may still hold late polish |
| `feat/marketing-landing` | Marketing landing variant | Existence on remote uncertain (no `origin/feat/marketing-landing` shown in `git branch -a`); local branch — stale |
| `feat/phase-2-auth-foundation` | Pre-merge of the Clerk + Drizzle scaffold | Superseded by merged PR `015ff83` on main; safe to delete |
| `integration/sprint-as-trunk` | Reconciliation branch for sprint-1 | Superseded by main; safe to delete |
| `goals/yentl-this-week-actions` | Worker branch for this-week-actions Run 1 | Run 1 complete; awaits PR merge per `STATE.md` |
| `goals/yentl-compliance-foundation` | Worker branch for the 28-clause goal | Run 1 complete (27/28), merged via `2c3e4fd`; clause 4 since unblocked |
| `claude/sprint-1-multi-speaker-durability` | Sprint 1 implementation | Mostly merged; legacy |
| `codex/yentl-functional-samples-extension-handoff` | Codex worker handoff for extension samples | State unclear; worth a look |
| 20+ `claude/*` worktree branches | Ephemeral worker branches (this audit included) | Normal noise; cleanup eventually |

### 3.2 Goal scaffolds — eight, not three

`ls .goals/` shows:
- `yentl-this-week-actions` — **DONE** (6/6 clauses, Run 1, 2026-05-20)
- `yentl-compliance-foundation` — **27/28** (parent goal; Group A→G all landed; clause 4 since unblocked by RecordingBeacon)
- `yentl-compliance-a11y` — sub-goal
- `yentl-compliance-ai-transparency` — sub-goal
- `yentl-compliance-docs` — sub-goal
- `yentl-compliance-trust-pages` — sub-goal
- `yentl-compliance-verdict-scaffold` — sub-goal
- `yentl-hardening-pass` — **NOT STARTED** (14/14 unchecked)

The 5 compliance sub-goals were a deliberate parallelization split (commit `5d4204f` "feat(goals): split yentl-compliance-foundation into 5 parallel sub-goals"). They have not been re-merged into the parent — they're independent worker scopes.

### 3.3 Hardening-pass clauses still wide open

From [`.goals/yentl-hardening-pass/STATE.md`](.goals/yentl-hardening-pass/STATE.md):

1. ❌ npm audit clean
2. ❌ tsc strict passes — *probably already true; needs baseline*
3. ❌ Tests pass + zero skipped
4. ❌ Vitest coverage thresholds on `lib/**`
5. ❌ ESLint passes with zero warnings
6. ❌ TODO/FIXME/XXX cleared
7. ❌ console.log removed from production build
8. ❌ `.env.example` parity (`DEEPGRAM_PROJECT_ID` documented but unused)
9. ❌ `middleware.ts` with rate-limit + security headers
10. ❌ `.github/workflows/ci.yml` — **wait, this file exists.** Worth checking what's in it.
11. ❌ `CHANGELOG.md`
12. ❌ README "Security & Operations" section
13. ❌ Branch rebased
14. ❌ Clean working tree

Note: clause 10 may already be met — `.github/workflows/ci.yml` exists. Worth re-baseline.

---

## 4. The 14 Named Agent Streams (+ trimodal)

`ls agent-work/` shows fifteen directories with Hebrew names. From the directives.csv and per-stream documentation:

| Stream | Purpose | State | Integration |
|---|---|---|---|
| **moshe-worktree-safety** | Worktree safety map for the team | Ready | Operational — not user-facing |
| **noam-iconography** | Marker icon direction | Ready | Static icons approved; motion loops blocked behind this |
| **miriam-flow-atlas** | Flow atlas + missing-state inventory | Ready | Documentation deliverable |
| **ezra-extension-proof** | Chrome extension proof matrix | Ready | Needs manual sign-off |
| **talia-product-truth** | Product truth + copy lock | Ready | Brand voice locked; consumed by other streams |
| **shira-source-intake** | Source intake UI repair | Ready | Needs PR cut |
| **devorah-security-gates** | Security launch gates | Ready | May depend on auth policy decision |
| **lev-signal-system** | Watch + extension signal system | Waiting | Blocks on verdict vocabulary + source-intake |
| **hadassah-mobile-a11y** | Mobile + accessibility pass | Waiting | Blocks on source-intake + signal changes |
| **eli-source-visuals** | Source thumbnails + visual evidence | Waiting | Coordinate with Devorah on SSRF |
| **aviva-save-export** | Save, library, export outcomes | Waiting | Needs account/save story + extension proof |
| **yonah-evaluation** | Corpus meaning-under-pressure eval | Ready (corpus staged) | Awaits human review |
| **rivka-meta-review** | Claim semantics + meta-review architecture | Waiting | Blocks on Yonah eval |
| **ariel-motion-loops** | Motion loop prototyping | Waiting | Blocks on Noam icon approval |
| **yentl-trimodal-evaluation** | This-week's trimodal test | Run 1 complete | Findings drove the speaker-attribution spec |

**Net integration state:** 7 streams ready to start, 7 streams waiting on upstream dependencies. The dependency chain pivots on a few unblocking decisions: verdict vocabulary, source-intake polish, icon approval.

---

## 5. UI / Visual Consistency Audit

### 5.1 Brand v5 application status — strong overall

Verified against the locked v5 spec (Fraunces 500 wordmark, mark #2563EB, R4 V3 palette: verified green `#22C55E`, false red `#EF4444`, friendly amber `#F59E0B`, cream paper `#FAF9F5`, near-black ink `#1A1A1F`).

| Surface | File | Brand v5? |
|---|---|---|
| Landing | [`app/page.tsx`](app/page.tsx) | ✓ Full |
| Signup | [`app/signup/[[...rest]]/page.tsx`](app/signup/[[...rest]]/page.tsx) | ✓ Full |
| Signin | [`app/signin/[[...rest]]/page.tsx`](app/signin/[[...rest]]/page.tsx) | ✓ Full |
| Session workspace | `app/session/page.tsx` + `components/session/*` | ✓ Full |
| YouTube ingest pane | `components/session/ingest-panes/youtube-ingest-pane.tsx` | ✓ Full |
| Claim Card (4 verdicts) | `components/session/ClaimCard.tsx` | ✓ Full |
| Extension panel | `components/session/extension-panel-view.tsx` | ✓ Mostly (some hardcoded states) |
| Session header | `components/session/SessionHeader.tsx` | ✓ Full (one hardcoded hex) |
| Trust pages | `app/about`, `/methodology`, etc. | ✓ Full |

### 5.2 Design system architecture

**Tokens live in [`app/globals.css`](app/globals.css)** as CSS custom properties (`:root`), then re-exposed to Tailwind via `@theme inline`, then mapped to shadcn semantic tokens (`--primary: var(--teal)`, `--destructive: var(--red)`).

The v5 palette is laid in cleanly:
- `--teal: #2563EB` (brand mark; aliased "teal" for legacy class-name continuity)
- `--green: #22C55E`, `--red: #EF4444`, `--amber: #F59E0B`
- `--cream: #FAF9F5`, `--ink: #1A1A1F`, `--paper: #FFFFFF`
- Speaker palette `--spk-1` through `--spk-6`

**Verdict color system is parallel, not unified.** [`lib/client/verdict-theme.ts`](lib/client/verdict-theme.ts) uses Tailwind palette class names (emerald-500, amber-500, rose-600, slate-500) instead of the brand tokens. This is a design choice (verdict gets its own color language) but it means if Reb Yisroel ever wants verdict striping to follow brand `--green` exactly, the verdict theme needs a token-driven refactor.

### 5.3 Hardcoded color smells (low severity, but real)

- [`SessionHeader.tsx:158`](components/session/SessionHeader.tsx) — `bg-[#2563EB]` instead of `bg-teal`. Trivial sweep.
- [`live-analysis-rail.tsx:21,25`](components/session/live-analysis-rail.tsx) — `colorStops` arrays of hardcoded hex for the Aurora gradient.
- [`chips.tsx:1`](components/session/chips.tsx) — `bg-[#F5E9CD]` amber-soft.
- [`extension-panel-view.tsx:52-99`](components/session/extension-panel-view.tsx) — `PHASE_META` uses literal Tailwind classes (`border-blue-200`, `bg-blue-50`, `bg-green-soft`, `border-green/20`) instead of v5 brand tokens. **This one matters more** — if the brand mark color ever changes, the extension phase indicators won't follow.

### 5.4 Auth context panel duplication

Signup has `SignUpContextPanel`. Signin has `AuthContextPanel`. They're sibling layouts (left context panel + Clerk form split) with brand-tinted differences in copy. The "cross-page CSS refactor" from V3.19 removed redundant `.cl-formButtonPrimary` from globals.css and moved per-page styling into Clerk's `appearance.elements`, but the wrapper panels themselves remain separate components. Refactor opportunity, not a bug.

### 5.5 Mobile coverage

- YouTube watch pane is orientation-gated (`@media (orientation: landscape) and (min-width: 700px)`).
- `RecordingBeacon` has responsive positioning (`sm:right-4 sm:top-4`).
- `Button` default size = 44×44 (WCAG 2.5.5 compliant).
- No hamburger menus, no mobile app chrome; the extension panel is desktop-side-by-side.
- **Portrait YouTube watch UX not deeply verified** — a real device pass would be worthwhile before the AI Act deadline.

### 5.6 Accessibility surface

Compliance Group C (clauses 7–11) shipped:
- Skip-to-content link first in tab order at `app/session/page.tsx:25`
- Focus ring token `--ring: oklch(0.4 0 0)` ≥3:1 contrast on white and cream
- `motion-reduce:animate-none` on `yentl-dot`, `yentl-action-button`, RecordingBeacon pulse
- 44×44 minimum touch targets explicitly commented in `components/ui/button.tsx:26`
- aria-live announcements on RecordingBeacon

The axe-core + Lighthouse automated audit (clause 12) is scaffolded but needs API secrets to actually run. That's a launch checklist item, not a wiring problem.

### 5.7 Cross-surface verdict color inconsistency to flag

The `verdict-theme.ts` slate-for-unverifiable + amber-for-mixed + emerald-for-true + rose-for-false uses Tailwind palette colors. The brand `--green` is `#22C55E` (Tailwind emerald-500-ish) and `--red` is `#EF4444` (Tailwind red-500). They're close but not pixel-identical. If Reb Yisroel wants strict brand fidelity on verdict stripes, the verdict theme needs to read from `var(--green)` / `var(--red)` / `var(--amber)` directly.

---

## 6. Under-the-Hood Pipeline (the wiring audit)

This is the core of the audit. I'll work front-to-back through the data flow, then summarize the top wiring concerns.

### 6.1 Capture layer

Five entry types:

| Source | Entry point | Metadata preserved | Metadata dropped |
|---|---|---|---|
| Mic (live) | `lib/client/deepgram-stream.ts` opens WS | source kind, consent header | RMS (computed in AudioMeter, never persisted), VAD state, channel ID |
| Tab audio | Routes through mic path after user picks tab | same as mic | channel separation |
| Audio file upload | POST `/api/upload-audio` → Vercel Blob client token → browser direct upload → POST `/api/transcribe-batch` with `blob_url` | source kind, file name, duration_sec | original file metadata, channel info |
| YouTube URL | POST `/api/youtube-ingest` → `lib/server/youtube-captions.ts` with three-layer fallback | video id, title, channel, URL | audio quality, manual-vs-auto-caption distinction (all paths land `speaker_id: 0`) |
| SRT/VTT | `parseSrt()` at `lib/server/youtube-captions.ts:177` | text + start/end | speaker (all `speaker_id: 0`), confidence |

**Top wiring smell:** `AudioMeter` computes RMS in real time for the capture-health UI but the value is ephemeral. It never gets attached to a transcript segment, never gets stored on `sessions.data`, never reaches the analysis layer. This is what the user's prosody question was about — the signal is being computed and thrown away.

### 6.2 Transcription layer (the load-bearing problem)

**Batch path:** [`lib/server/deepgram-batch.ts:32`](lib/server/deepgram-batch.ts) calls Nova-3 with `diarize: false`, `utterances: true`, `numerals: true`, `smart_format: true`, `punctuate: true`. Parsing at line ~98 maps each Deepgram utterance to a `TranscriptSegment`. **Critical bug:** when Deepgram omits the `speaker` field (which it always does when `diarize: false`), the parser falls back to `speaker_id = 0`. That is a lie — it doesn't mean "single known speaker," it means "no speaker information." But the downstream pipeline treats `0` as a valid speaker identity.

**Stream path:** [`lib/client/deepgram-stream.ts:63`](lib/client/deepgram-stream.ts) sends `diarize=false` in URL params. Final-segment mapping at line ~174 calls `dominantSpeaker(words)`. With `diarize=false`, Deepgram returns no per-word speaker tags → `words[]` is empty/null → `dominantSpeaker()` returns `null`. Every live final segment lands with `speaker_id: null`. That's actually more honest than the batch `0` fallback, but downstream code wasn't written assuming `null`.

**Transcript schema is too thin.** [`lib/types.ts:59`](lib/types.ts) defines `TranscriptSegment` as `text`, `start`, `end`, `is_final`, `speaker_id`. That's it. No `words[]`, no per-word confidence, no speaker_confidence, no overlap class, no source-channel identity. Everything Deepgram knows about uncertainty is silently discarded at the parser boundary.

### 6.3 Speaker attribution (cascading failure)

The attribution chain:
1. Deepgram returns transcript → batch parser defaults missing speaker to `0` OR stream parser lands `null`.
2. [`lib/client/orchestrator.ts:114`](lib/client/orchestrator.ts) builds a 30-second context window prefixing each utterance with `[Speaker N]`, then sends to `/api/extract-claims`.
3. Extracted claims inherit `segment.speaker_id` directly at line ~165 — the extractor doesn't independently re-verify who owns the claim.
4. Rhetoric markers are inferred post-hoc by time overlap (`attributeMarker()` at ~line 491), not by speaker context in the model call.
5. Manual correction: [`lib/client/session-store.ts:350`](lib/client/session-store.ts) → `renameSpeaker`; line ~387 → `splitSegmentAt`. The mutations cascade to affected claims/markers but they are **in-memory only** — if the session closes before `endSession`, the corrections are lost.

**This is why the trimodal test surfaced what it did.** When you give Yentl the same content through three different inputs, the input-layer variability gets amplified by a brittle attribution layer. The transcript gets re-fragmented differently, the (false) speaker_id changes, the claim ownership changes, the marker attribution changes, and the model gives different judgments — not because reasoning is unreliable, but because the foundation under the reasoning is unreliable.

### 6.4 Claim extraction

- Route: [`app/api/extract-claims/route.ts`](app/api/extract-claims/route.ts)
- Model: Anthropic Opus 4.7 via Vercel AI Gateway
- Prompt: [`lib/prompts/extract-claims.ts`](lib/prompts/extract-claims.ts)
- Dedup: hash on text only via `hashClaim()` at [`lib/client/orchestrator.ts:156`](lib/client/orchestrator.ts). **Speaker-blind dedup** means "the sky is blue" said by two different people gets collapsed into one claim card. That's a product bug.
- Status flow: `checking` → `provisional` → `confirmed` as verifications complete.

### 6.5 Fact-checking / source-grounding

- Routes: `/api/verify-provisional`, `/api/verify-confirmed`
- Web search via `anthropic.tools.webSearch_20260209({ maxUses: 5 })` at verify-confirmed line ~61
- 4 verdict variants (confirmed in [`lib/types.ts`](lib/types.ts) `PrimaryLabel`): `TRUE | MOSTLY_TRUE | PARTIAL | MISLEADING | OMISSION | FALSE | UNVERIFIABLE | OPINION`. So actually 8 labels, not 4. The "4 variants" naming on `ClaimCard` likely refers to the four visual variants (true / false / mixed / unverifiable) that group these labels into UI buckets.
- Reputation: `lib/reputation.ts` `classifyDomain()` tiers sources
- **No speaker-aware grounding:** the model gets the claim and runs web search, but never knows who said it. A known-liar's "the sky is blue" gets the same treatment as a domain expert's.

### 6.6 Rhetoric markers

- Route: `/api/analyze-rhetoric`
- Model: Opus 4.7 via Gateway
- Taxonomy: [`lib/taxonomy/book-entries.json`](lib/taxonomy/book-entries.json) (seeded from Reb Yisroel's book) + [`lib/taxonomy/extras.ts`](lib/taxonomy/extras.ts) — 100+ entries
- Cadence: every 5 utterances or 30 seconds (`maybeRunRhetoric()` at orchestrator.ts:186)
- Window: 60 seconds trailing
- **Critical wiring smell:** the transcript_window sent to the model at `orchestrator.ts:462` strips speaker labels. The model gets text without "who is talking." Then `attributeMarker()` at line 491 tries to back-derive the speaker by time-overlap with segments — losing all floor-state context (interruption, backchannel, parallel claim).
- Severity (subtle/clear/blatant) is model-assigned with no post-hoc calibration.

### 6.7 Live signal / pulse / heat

Located at [`components/session/live-signal.tsx`](components/session/live-signal.tsx). The summary builder produces six signals:
- `currentRead` (Fresh / Warming / Error from synthesis state)
- `claimRisk` = count(FALSE + MISLEADING + OMISSION) / total claims
- `rhetoricHeat` = marker count binned (≥5 = red, ≥3 = amber, 0–2 = green)
- `evidenceState` = ratio of high/mid reputation sources
- `liveState` (passed in as prop)
- `newFinding` (boolean: differs from prior snapshot)

**Confirmed: zero prosody input.** No `AudioMeter` data reaches this layer. Heat is purely marker-count-driven. No weighting by severity or archetype. No per-speaker pulse variant. Reb Yisroel's question — "is heat acoustically informed?" — was answered correctly: no, and the gap is real.

### 6.8 Durability / persistence

- Drizzle schema: `users`, `sessions` (with `data jsonb` blob), `subscriptions`
- Session struct: transcript[], claims[], markers[], speakers[], source, synthesis?, devil_advocate?
- **Resumable:** session-store checks `?restore=sessionId` URL param and calls `restoreSession()` from Drizzle.
- **Transcript mutations are NOT persisted in real time.** `splitSegmentAt` and `reassignUtterance` mutate the in-memory store. The persistence write happens on `endSession`. If the user corrects a speaker label and then closes the tab before ending the session, the correction is silently lost.
- **No audit log.** Claims and markers are overwritten on update — no version history, no who-changed-what trail. For a fact-check product where audit defensibility matters, this is a launch-blocker-shaped problem.

### 6.9 Consent / privacy gating

- ConsentGate: `components/session/ConsentGate.tsx` — blocking Radix Dialog with 3 required + 1 age + 1 optional checkboxes, no pre-ticks. Writes ULID-keyed `ConsentRecord` to localStorage.
- RecordingBeacon: `components/session/RecordingBeacon.tsx` — pulsing red dot + HH:MM:SS timer + End button (44×44, focus-visible ring). aria-live announcer.
- Consent header `x-yentl-source-consent` plumbed through `sourceAnalysisConsentHeaders()` to batch + stream + upload routes.
- **Gap:** the consent flag is a binary present/absent header. It does NOT toggle the Deepgram `diarize` flag. Production diarize is hardcoded `false` regardless of consent state. The new speaker-attribution spec explicitly calls for a BIPA-compliant voiceprint-disclosure consent variant and a deletion-on-request flow. Neither is implemented.

### 6.10 YouTube ingest (three layers, works as advertised)

[`lib/server/youtube-captions.ts:615-640`](lib/server/youtube-captions.ts) — verified working three-layer fallback:
1. **Innertube** (`youtubei.js`) primary — succeeds on cloud datacenter IPs where yt-dlp is blocked.
2. **youtube-transcript** secondary — catches false `NO_CAPTIONS` from Innertube.
3. **yt-dlp** final — uses `mweb`, `tv_embedded`, `web` clients to bypass IP blocking; 60s timeout.

The "no-captions fallback" (V3.16/V3.34) is the cascade itself: if all three paths fail, returns `CaptionError("NO_CAPTIONS")` and the orchestrator displays "No captions available."

**Critical wiring smell across all three layers:** captions return `speaker_id: 0` hardcoded — at line ~419 (Innertube), line ~482 (youtube-transcript), line ~224 (yt-dlp). YouTube captions for two-speaker debates collapse to one speaker before they even enter the analysis layer. Plus there's no distinction between manual captions (high trust) and auto-generated captions (low trust) — both are weighted identically.

### 6.11 Audio file ingest

- POST `/api/upload-audio` → consent check → return Vercel Blob client token
- Browser uploads directly to Blob → POST `/api/transcribe-batch` with `blob_url`
- 500MB max file, 4h max duration, 50MB stream threshold (above, stream to Deepgram instead of buffering)
- **No queue.** transcribe-batch is a serverless function with a hard 5-minute timeout. For a 90-minute podcast, this would have to either stream (good) or fail (bad).
- Post-transcription cleanup: blob is deleted, but there's no retry if delete fails. Leak risk is low but non-zero.

### 6.12 AI provider routing

- Single source of truth: [`lib/server/anthropic.ts:5`](lib/server/anthropic.ts) → `opus = "anthropic/claude-opus-4.7"`
- All reasoning calls go through Vercel AI Gateway via `@ai-sdk/anthropic`
- Auth via `VERCEL_OIDC_TOKEN`
- Previous trimodal run hit "positive credit balance required" 500 errors; Reb Yisroel fixed the credit issue mid-run
- **No fallback routing.** If Gateway has downtime, the app degrades silently — no circuit breaker, no fallback provider.
- Cache control in analyze-rhetoric uses `ephemeral` rather than `prefix` cache, which lowers hit rate vs. a static SYSTEM_PREFIX caching strategy.

### 6.13 Tests

Vitest-based. Notable files:
- `deepgram-batch.test.ts` — mocks SDK, verifies utterance mapping. Tests the `speaker_id = 0` fallback behavior **as expected** (not as a bug to fix).
- `deepgram-config.test.ts` — verifies `diarize=false` is in URL params (commit `faf6f8b`).
- `youtube-url-parse.test.ts`, `youtube-ingest.test.ts` — URL parsing + ingest API mocking
- `upload-audio.test.ts` — blob token gen + consent validation
- `end-session-synthesis.test.ts`, `audio-meter.test.ts`, `verdict-card.test.tsx`, `report-flow.test.tsx`, `session-header.test.tsx`
- Compliance Run 1 added 58 tests passing.

**No end-to-end pipeline test.** Capture → transcribe → extract → verify → markers is not exercised as a single integration test. Each layer is mocked in isolation. That's a real gap for a product where the layers interact in subtle ways.

---

## 7. Trimodal Testing — What Yentl Actually Did

The trimodal evaluation (run at `agent-work/yentl-trimodal-evaluation/runs/2026-05-28T21-35-11-581Z/`) put the same 8 source videos through three input modes (SRT text, audio file, YouTube URL) and measured drift. The numbers are sobering.

### 7.1 The 8 candidates

| Candidate | Duration | Speakers (expected) | Why included |
|---|---|---|---|
| `tarantino_channel4` | 8:36 | 2 | Clean 2-speaker adversarial interview |
| `bondi_epstein_cnn` | 9:28 | 4 | Multi-speaker formal hearing with interruptions |
| `vance_walz_debate` | 10:12 | 2 | Debate claims, moderator framing, evasive answers |
| `da_race_kcra` | 5:28 | 1 (DA monologue) | Loaded-question/premise test; URL caption stress |
| `vaccine_delay_rciscience` | 6:46 | 2 | Science uncertainty; cautious fact-checking |
| `maajid_mehdi_bbc` | 9:43 | 2 | Heated debate, marker calibration |
| `hitchens_mcgrath` | 9:31 | 2 | Philosophical two-speaker |
| `trump_biden_factcheck` | 9:31 | 2 | Rhetoric comparison reference |

### 7.2 Headline findings (numbers verified from the report)

**Speaker collapse — universal in production audio.** All 8 candidates collapsed to 1 speaker in the production audio path (because production runs `diarize: false`). When the harness ran a diagnostic `diarize: true` pass, the diarizer recovered 2–7 speakers across the set (Bondi/Epstein returned 7 — over-segmentation in a chaotic 4-speaker hearing, but the right direction).

**URL caption reliability — usually fine, occasionally catastrophic.**
- 5 of 8 candidates had **0% WER** between URL caption and SRT (Bondi, Vance/Walz, DA race text, Hitchens, Trump/Biden)
- Tarantino: **23.2% WER** between URL captions and SRT — a meaningful divergence on a clean interview
- DA race: text matched but timestamps drifted by **467.6 seconds** — a clock-alignment failure that would render claim time-anchoring meaningless

**Audio transcription quality — mixed.**
- Clean (≤7% WER): Bondi (6.4%), Vance/Walz (6.4%), vaccine delay (6.9%), Hitchens (3.9%), Trump/Biden (7.2%)
- Weak: Tarantino (23.1%), Maajid/Mehdi (20.6%)
- **Unusable: DA race at 87.6% WER** — a true stress case

**Cross-modal claim consistency:**
- Bondi & Vance/Walz: 100% claim Jaccard between SRT and URL — exactly what we want
- DA race: 0% Jaccard — same content, totally different claim sets, because the input layer corrupted both audio (87.6% WER) and URL timing (467.6s drift)

**Speaker confidence (diagnostic diarize=true):**
- Bondi: 0.730 → "probable" per the new spec thresholds
- Tarantino: 0.585 → below "probable" threshold

### 7.3 What this means

Yentl's reasoning layer is mostly OK. The trimodal test isolated the variable: when input fidelity drops, output reliability drops with it, and the drop is amplified by the speaker-attribution failure. Bondi vs Vance/Walz prove Yentl can be consistent across modes when input is consistent. DA race proves the wheels come off when input degrades and there's no robustness layer.

### 7.4 Harness fixes that came out of the run

- The original run hit a Vercel AI Gateway credit ceiling → 500s. Fixed by topping up credits.
- `recent_hashes` was exceeding the 128-char schema limit, causing false 400s. Fixed by capping in the harness.

Both are noted as resolved in [`agent-work/yentl-trimodal-evaluation/runs/2026-05-28T21-35-11-581Z/model-layer-blocker.md`](agent-work/yentl-trimodal-evaluation/runs/2026-05-28T21-35-11-581Z/model-layer-blocker.md).

### 7.5 The audio-prosody question

Reb Yisroel asked whether heat/pulse uses acoustic signatures. Confirmed answer: **no.** Markers are derived from transcript language only. AudioMeter computes RMS for UI capture-health, doesn't persist it, doesn't send it to analysis. To add prosody would mean (a) persisting RMS/pitch/rate/pauses on transcript segments, (b) computing per-speaker baselines, (c) feeding the features into the rhetoric layer alongside the language signal, (d) separating "language heat" from "audio heat" in the UI so loud ≠ false. The new spec mentions this lightly but the implementation plan doesn't yet have a prosody phase.

---

## 8. Critical Gaps & Issues, Ranked

I'm ranking by **launch blocker** (P0) → **strong recommendation pre-launch** (P1) → **post-launch polish** (P2/P3). Each item is grounded in a specific finding from earlier sections.

### P0 — Foundational, must fix before launch

1. **Speaker attribution is broken end-to-end.** `diarize: false` unconditional; batch parser defaults missing speaker to `0` (lies); stream parser returns `null` (orphans); claims/markers inherit broken data. **Fix:** Phase 1 of the speaker-attribution plan (extend types, preserve words[], stop defaulting to 0, consent-gated diarize mode flag).
2. **No BIPA-compliant voiceprint flow.** The new spec calls for voiceprint disclosure + deletion-on-request before any diarize can be turned on for real users. Not implemented.
3. **AI Act Article 50 deadline 2026-08-02 (~9 weeks).** The verdict-display path needs to be production-tight by then. Verdict components exist but aren't routed for sharing/auditing.
4. **No end-to-end integration test.** Each layer is unit-tested in isolation; the chain isn't exercised. A regression in attribution wiring would not be caught by current tests.
5. **Transcript mutations not persisted in real time.** Speaker corrections live in memory until `endSession`. Lose the tab → lose the corrections silently. For a fact-check product this is dangerous.

### P1 — Strong recommendation pre-launch

6. **Claim dedup is speaker-blind.** `hashClaim()` collapses identical text from different speakers. "The sky is blue" said by two debaters becomes one claim card.
7. **Rhetoric markers are sent without speaker labels.** Model sees the text, doesn't see who's talking, fallacies get mis-attributed via time-overlap heuristics. The spec calls for speaker-labeled windows; not yet implemented.
8. **No prosody / audio signal integration.** AudioMeter computes RMS but discards it. Heat is marker-count-driven only. For "live debate quality" framing to be honest, prosody needs to land.
9. **No audit log / version history on claims and markers.** Updates overwrite. No trail for dispute resolution or bias audits — a legal and product credibility risk.
10. **YouTube captions land with `speaker_id: 0` across all three layers.** Two-speaker debates collapse to single speaker before analysis. No distinction between manual (high trust) and auto-gen (low trust) captions.
11. **Verdict surface has no shareable URL.** `VerdictCard` is wired into the synthesis card but there's no `/verdict/[id]` route. Sharing a verdict is awkward.
12. **Paywall sheet missing.** V3.11 was specced and committed (cap-reached + tier comparison + upgrade CTA) but the component does not exist on main. Pricing page exists; conversion flow doesn't.
13. **No fact-check provider failover.** Vercel AI Gateway as single point of failure. The credit blocker during the trimodal run was a small taste of how this breaks.

### P2 — Should fix soon

14. **`package.json` still named `factify-scaffold`** — and `package-lock.json` mirrors it. Cosmetic but it shows up in deploy logs, error reports, and any external tooling that introspects the package name. Sweep is two lines.
15. **Chrome extension manifest still allow-lists `factify-rose.vercel.app`** — both `extension/manifest.json` and `extension/manifest.local.json`. Once DNS for `yentl.it` is stable, drop the legacy entries.
16. **Deepgram token route allow-lists `factify-rose.vercel.app`** at `app/api/deepgram/token/route.ts:12`. Same drop-after-DNS comment applies.
17. **`window.__factify` legacy alias** preserved at `app/session/layout.tsx:150,152`. Intentional per handoff doc, but worth a deletion ticket once dev-script users have migrated.
18. **Hardcoded hex in hot paths** (SessionHeader, live-analysis-rail, chips, extension-panel PHASE_META). Sweep to CSS-var references.
19. **Auth context panels duplicated.** Modest refactor to a shared wrapper.
20. **Verdict colors use Tailwind palette, not v5 brand tokens.** Confirm intent with Reb Yisroel; sweep if strict brand fidelity is wanted.
21. **Extension panel monolith — 1,324 lines.** Refactor pressure is mounting; tab extraction would unlock further iteration speed.
22. **Hardening pass — 14 clauses not started.** Coverage thresholds, ESLint, console.log audit, security middleware. None are hard but they add up.
23. **Vercel project name still `yenta`** per the 2026-05-17 handoff. Separate manual operation; not in code.

### P3 — Cost / perf / polish

24. **API cost: ~300 utterance-level calls per 25-minute session.** Paragraph batching (silence-gap + min-words thresholds) would 3.8× reduce call count and ~75% reduce cost.
25. **Rhetoric prompt uses `ephemeral` cache control,** not prefix. Static SYSTEM_PREFIX caching would lift hit rate.
26. **No mobile portrait QA pass on the YouTube watch surface** — orientation gate is implemented, but a real-device pass is overdue.
27. **No `/sources` standalone page** despite the V3.1 commit naming it. Either rename the commit history's intent or scaffold the page.

---

## 9. Recommended Fix / Upgrade Path

Ordered to unblock the most downstream work first. Each phase has a rough effort feel based on what I've seen of the codebase.

### Phase A — Foundation (1–2 weeks, narrow and low-risk)

Implement **Phase 1 of the speaker-attribution plan only**:
- Extend `TranscriptSegment` (`lib/types.ts:59`) with `id`, `provider`, `words: ASRWord[]`, `speaker_distribution`, `attribution_status`, `attribution_reasons`, `overlap_class`, `turn_id`, `source_audio_kind`. Add the corresponding type aliases (`ASRWord`, `SpeakerDistribution`, `AttributionStatus`, `AttributionReason`, `OverlapClass`).
- Update the Deepgram batch parser ([`lib/server/deepgram-batch.ts`](lib/server/deepgram-batch.ts)) to preserve `results.channels[0].alternatives[0].words` (currently discarded) and to **stop defaulting missing speaker to `0`**. Use `null` + `attribution_status: "not_available"` instead.
- Update the stream parser ([`lib/client/deepgram-stream.ts`](lib/client/deepgram-stream.ts)) to surface the `null` honestly and pass it through to claim/marker downstream consumers.
- Add server-side `diarizationMode` config flag (`off | internal_eval | batch_consented | live_consented`), defaulting to `off` for production. Internal eval runs and corpus pipelines flip to `internal_eval`. No production user behavior changes yet.
- Sweep `package.json` name → `"yentl-app"` while we're touching the foundation (one-line change, gets it out of the way).

**Why first:** all downstream work depends on these types existing. The change is non-breaking for production behavior (diarize stays off; we just stop lying about `speaker_id = 0`).

### Phase B — Make uncertainty visible (1 week)

- Add an `attribution_status` badge to the transcript view (`components/session/TranscriptView.tsx`): "Speaker 1" / "Probably Speaker 1" / "Speaker uncertain" / "Overlapping speech" / "Clip or quoted audio".
- Add a `claim_ownership` line on `ClaimCard` showing whether the claim was asserted, denied, quoted, mocked, etc.
- Wire `VerdictCard` to a `/verdict/[sessionId]` route so verdicts have shareable URLs. The component already exists.
- Scaffold the V3.11 paywall sheet (cap-reached + tier comparison + upgrade CTA). Reb Yisroel committed the intent; the component is missing.

**Why second:** turns the honest-uncertainty work from Phase A into honest-uncertainty UI. Plus closes two surface gaps that block monetization (paywall) and shareability (verdict URL).

### Phase C — Consent-gated diarization (1–2 weeks)

- BIPA-compliant voiceprint disclosure copy (legal review needed)
- Deletion-on-request flow (`DELETE /api/biometric` style)
- Toggle `diarize: true` via `diarizationMode = "batch_consented"` only when user has signed the diarization-specific consent
- Update Deepgram batch path to use `diarize_model: "latest"` for the consented batch route (per Deepgram diarization docs)
- Keep live streaming `diarize: false` for this phase (live diarization quality is weaker — Soniox confirms this — and BIPA exposure is higher in real-time)

**Why third:** unlocks speaker attribution for the audio-file ingest path, which is the lowest-risk BIPA exposure profile.

### Phase D — Persistence & correction durability (1 week)

- Persist `splitSegmentAt`, `reassignUtterance`, `renameSpeaker`, label edits on a debounced timer (every 5–10 seconds), not only on `endSession`.
- Add a claim/marker version log table — `claim_history`, `marker_history` — append-only, indexed by session.
- Mid-session autosave for transcript state.

**Why fourth:** legal defensibility and user trust. Once Phase C ships, users will be making real speaker corrections — losing them silently is unacceptable.

### Phase E — Prosody integration (2 weeks)

- Server-side compute of RMS, pitch contour, speaking rate, pause length, interruption/overlap on uploaded audio (use `librosa` or equivalent server-side; for live, instrument the existing AudioMeter).
- Per-speaker rolling baseline; normalize new utterances against baseline (so a quiet mic doesn't masquerade as calm and a loud mic doesn't masquerade as angry).
- Persist `audio_features` field on `TranscriptSegment`.
- Feed prosodic features into the rhetoric layer alongside the language signal; produce a `prosody_heat` signal distinct from `language_heat`.
- UI: separate "Language heat" badge from "Audio heat" badge so users see the distinction.

**Why fifth:** answers the user's question affirmatively. Significant differentiation (most fact-check tools are text-only). Best deferred until Phase A+B+C are stable so we're integrating into a clean foundation, not a leaky one.

### Phase F — Hardening pass (1 week)

- Run the 14 hardening clauses end-to-end. Most are minor (ESLint, console.log sweep, npm audit, env parity).
- Add `middleware.ts` with rate-limit + security headers.
- Confirm the existing `.github/workflows/ci.yml` is actually live and re-baseline clause 10.
- Coverage thresholds on `lib/**`.

**Why sixth:** these don't move the needle on what Yentl can do, but they make the product launchable.

### Phase G — Provider benchmarking & failover (1–2 weeks)

- Define the `ASRAdapter` interface per the new spec.
- Benchmark Deepgram batch (diarize_model=latest) + Deepgram streaming + AssemblyAI + Soniox + WhisperX+pyannote + NeMo Sortformer on the trimodal hard windows.
- Build a second-pass diarization fallback for difficult uploaded audio (WhisperX+pyannote ensemble after Deepgram batch).
- Add a Gateway failover path (direct Anthropic or fallback provider) for credit/availability events.

**Why last:** by this point we know what "good attribution" looks like on real Yentl data. Picking the right ASR ensemble is informed by real measurement, not vendor marketing.

### Out-of-band items I'd bundle into a single hygiene PR

- `package.json` rename
- Extension manifest URL cleanup
- Deepgram token allowlist cleanup
- Hardcoded hex → CSS var sweep
- Auth context panel shared wrapper
- Extension-panel-view monolith → tabs extraction

These don't fit one phase but together they reduce friction across the codebase.

---

## 10. Open Decisions for Reb Yisroel

Before I take any of this from research to implementation, there are a few choices only you can make. I'm leading each with my recommendation and the reason:

1. **Verdict surface — `/verdict/[id]` standalone route, or only inside `/session`?**
   *Recommendation:* Add a standalone `/verdict/[sessionId]` route AND keep the inline `synthesis-card` consumption.
   *Why:* shareability ("here's my Yentl on the Vance/Walz debate") is a marketing flywheel. The component is already built; this is mostly routing.

2. **Paywall sheet — scaffold from V3.11 spec, or defer?**
   *Recommendation:* Scaffold it as part of Phase B.
   *Why:* AI Act Article 50 deadline + pricing page already shipped means we either have a working monetization flow by August or we go live with pricing that can't actually convert. Best to do this now while the V3 spec is fresh.

3. **BIPA voiceprint copy — write it now or wait for legal counsel?**
   *Recommendation:* Draft it now in [`docs/`](docs/), flag for legal review, and ship Phase C behind a server-side env flag until legal signs off.
   *Why:* the draft + review + iterate loop takes weeks of calendar time. Starting now means Phase C isn't gated behind a single email chain.

4. **Provider strategy — stick with Deepgram + add WhisperX+pyannote second-pass, or replace Deepgram?**
   *Recommendation:* Stick with Deepgram primary, add WhisperX+pyannote as a second-pass ensemble for uploaded audio only. Don't touch live streaming until Phase G measurements come in.
   *Why:* Deepgram works well on clean two-speaker interviews per our own data; the problem is harder cases and the loss of evidence (words[], confidence). Adding a second-pass is additive, doesn't break anything, and gives us a real benchmark surface for Phase G.

5. **Hardening pass — pre-launch or post-launch?**
   *Recommendation:* Pre-launch, bundled into Phase F.
   *Why:* hardening clauses (ESLint, console.log, env parity, security headers) are the kind of thing that becomes much harder to retrofit once you have users.

6. **Compliance sub-goals — re-merge into parent, or leave split?**
   *Recommendation:* Leave split. Each one is its own quality-gate dimension and the parallelization let Run 1 hit 27/28 in a single marathon.
   *Why:* re-merging adds bookkeeping with no real benefit; the parent goal's STATE already tracks the union.

7. **Package rename + manifest cleanup — bundle into the next safe PR, or separate hygiene PR?**
   *Recommendation:* Separate hygiene PR, before Phase A.
   *Why:* it's a clean diff that doesn't conflict with anything, gets the `factify-scaffold` smell out of every deploy log, and lets Phase A focus purely on the types/parser work.

8. **AudioMeter prosody — Phase E timing okay, or accelerate?**
   *Recommendation:* Keep at Phase E.
   *Why:* prosody is a major upgrade that needs the speaker-attribution foundation underneath it. Doing prosody before attribution is fixed would mean we'd be feeding loud-volume signals into a broken speaker pipeline — the heat would still be attributed to the wrong person.

---

## 11. Appendix — File Reference Index

For quick navigation:

**Pipeline core**
- [`lib/types.ts:59`](lib/types.ts) — thin TranscriptSegment schema
- [`lib/server/deepgram-batch.ts:32`](lib/server/deepgram-batch.ts) — `diarize: false` + fallback `speaker_id = 0` bug
- [`lib/client/deepgram-stream.ts:63`](lib/client/deepgram-stream.ts) — `diarize=false` + `dominantSpeaker()` returns null
- [`lib/client/orchestrator.ts:114`](lib/client/orchestrator.ts) — claim extraction trigger; line 165 inherits broken speaker
- [`lib/client/orchestrator.ts:445`](lib/client/orchestrator.ts) — rhetoric analysis sends speaker-stripped text
- [`lib/client/session-store.ts:350`](lib/client/session-store.ts) — `renameSpeaker`; line 387 `splitSegmentAt`
- [`lib/server/youtube-captions.ts:615`](lib/server/youtube-captions.ts) — three-layer caption fallback

**Surfaces**
- [`components/session/extension-panel-view.tsx`](components/session/extension-panel-view.tsx) — 1,324-line monolith
- [`components/session/ClaimCard.tsx`](components/session/ClaimCard.tsx) — 4-variant verdict card
- [`components/verdict/VerdictCard.tsx`](components/verdict/VerdictCard.tsx) — verdict component
- [`components/verdict/ReportFlow.tsx`](components/verdict/ReportFlow.tsx) — report flow
- [`components/session/synthesis-card.tsx`](components/session/synthesis-card.tsx) — wire-in point
- [`components/session/ConsentGate.tsx`](components/session/ConsentGate.tsx) — modal
- [`components/session/RecordingBeacon.tsx`](components/session/RecordingBeacon.tsx) — pulse beacon
- [`components/session/live-signal.tsx`](components/session/live-signal.tsx) — heat/pulse derivation

**Specs & plans**
- [`docs/superpowers/specs/2026-05-28-speaker-attribution-conversation-intelligence-spec.md`](docs/superpowers/specs/2026-05-28-speaker-attribution-conversation-intelligence-spec.md)
- [`docs/superpowers/plans/2026-05-28-speaker-attribution-conversation-intelligence-plan.md`](docs/superpowers/plans/2026-05-28-speaker-attribution-conversation-intelligence-plan.md)
- [`docs/superpowers/specs/2026-05-21-yentl-complete-flow-spec.md`](docs/superpowers/specs/2026-05-21-yentl-complete-flow-spec.md)
- [`docs/superpowers/handoff/2026-05-17-v1.5-complete.md`](docs/superpowers/handoff/2026-05-17-v1.5-complete.md)

**Evaluation artifacts**
- [`agent-work/yentl-trimodal-evaluation/runs/2026-05-28T21-35-11-581Z/report.md`](agent-work/yentl-trimodal-evaluation/runs/2026-05-28T21-35-11-581Z/report.md)
- [`agent-work/yentl-trimodal-evaluation/runs/2026-05-28T21-35-11-581Z/summary.json`](agent-work/yentl-trimodal-evaluation/runs/2026-05-28T21-35-11-581Z/summary.json)
- [`scripts/experiments/yentl-trimodal-eval.ts`](scripts/experiments/yentl-trimodal-eval.ts)
- [`test-corpus/README.md`](test-corpus/README.md), [`test-corpus-2/README.md`](test-corpus-2/README.md)

**Goal state**
- [`.goals/yentl-this-week-actions/STATE.md`](.goals/yentl-this-week-actions/STATE.md)
- [`.goals/yentl-compliance-foundation/STATE.md`](.goals/yentl-compliance-foundation/STATE.md)
- [`.goals/yentl-hardening-pass/STATE.md`](.goals/yentl-hardening-pass/STATE.md)

---

*Audit prepared 2026-05-28 by Reb Faivele, in service of Reb Yisroel of Kronitzer and the Yentl mission. Findings grounded in repo state at commit `870ae01`. Bezras hashem we go from here.*
