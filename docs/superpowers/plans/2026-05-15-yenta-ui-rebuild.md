# Yenta UI rebuild · 2026-05-15

**Goal:** Replace the transcript-as-interface with AST-010 v1.1's Overview-first dashboard. New `app/session/page.tsx` + full `components/session/*` tree, new `/api/synthesize` route, enriched taxonomy, brand tokens locked, URL-driven view state, full agent-browser verification at every breakpoint.

**Branch:** `claude/sprint-1-multi-speaker-durability` in `wonderful-bhabha-796897` worktree (tip 8ce6cb7 at plan time).

**Design contract:** `/Users/israelbitton/Live FactCheck/.claude/worktrees/bold-cray-e9479f/.project/assets/ui/v3/AST-010_responsive-design-pack.html` v1.1. Read end-to-end before each task — referenced section numbers below.

**Locked decisions (do not re-litigate):**
- §13 IA: L1 Overview → L2 Filtered → L3 Detail → L4 Learn more. Transcript is one drill-path among many, accessible as header tab.
- §14 L1 Overview: synthesis card + 4 metric tiles + topic strip + recent-activity feed.
- §15 L2: URL-driven filters, sortable, refine via popover chips.
- §16 L4: marker (def + how-to-spot + further-reading + occurrences + related) + claim (source dossier + related-by-topic).
- Q1 numeric-badge speakers >6 · Q2 conservative auto-expand · Q3 hero in accordion · Q4 side rail tiered by viewport · Q5 Space/P/Esc ship · Q6 Dispute = disabled "coming soon" + Re-check functional · Q7 slide-in detail · Q8 stats read-only · Q9 tablet uses top-bar buttons · Q10 wordmark only · Q11 voice-finder deferred · Q13 30s/5-utt cadence · Q14 3 derived headline insights · Q15 page-swap on tile tap · Q17 no cross-session · Q18 header tabs · Q19 mobile synthesis chips-collapsed · Q20 wiki auto-derive + override · Q21 transcript = tab.
- Gap #1 tablet = compact desktop · Gap #2 history-aware breadcrumb + ↑/↓ in filter · Gap #3 headline chips route to L2 · Gap #4 URL grammar (view/filter/sort) · Gap #5 topic primary only · Gap #6 synthesis 5 states · Gap #7 mobile chips collapsed · Gap #8 sort/refine specifics · Gap #9 cap 8 related · Gap #10 activity-feed terminal events · Gap #11 out-of-scope lock.
- Landing page (`/`): out of scope. Brand-token-only follow-up later.
- Cost: ~$30 enrichment authorized. No git push. No vercel deploy.

**Two items still owed (don't block execution):**
- Book chapter mapping (Q16): user provides `lib/taxonomy/book-chapters.json` later. L4 ships with Wikipedia + SEP, plus placeholder slot for chapter link.

---

## Phase 1 — Backend plumbing

### Task 1 · `/api/synthesize` route + orchestrator pacer + store field

**Files:**
- `app/api/synthesize/route.ts` (new)
- `lib/client/orchestrator.ts` (extend)
- `lib/client/session-store.ts` (extend)
- `tests/lib/client/orchestrator-synthesis.test.ts` (new)
- `tests/app/api/synthesize.test.ts` (new)

**Spec:**
- Route: `POST /api/synthesize` accepts `{ utterances: { speaker, text, ts }[], counters: { claims, false, fallacy, bias, rhetoric }, speakers: { id, displayName }[] }`. Validates with zod. Calls Anthropic `claude-opus-4-7` with cached SYSTEM prompt. Returns `{ text: string, headlines: string[] }` (3 headlines). No tools. Aborts on client disconnect.
- SYSTEM prompt: "You are Yenta, a live fact-check synthesizer. Read the last N utterances and produce ONE short paragraph (60–90 words) capturing what's happening in the conversation, who is making claims, and what the disputed terrain is. Then produce exactly THREE one-line 'headline insights' that derive from counters/speakers: (1) speaker fallacy attribution if any speaker has ≥2 fallacies — call out the archetype if they share one; (2) verdict ratio for a speaker if any speaker has all-verified or all-false claims; (3) topic concentration if any topic is ≥40%. Return JSON: { text, headlines: [..3] }."
- Pacer in orchestrator: `maybeRunSynthesis()` triggered after every transcript event. Fires if (last fire >30s ago) OR (≥5 final utterances since last fire). AbortController, aborts on session close — mirror existing `maybeRunRhetoric()` shape exactly.
- Store field: `synthesis: { text: string; headlines: string[]; at: number; state: "idle" | "warming" | "fresh" | "refreshing" | "error" } | null`. Setter `setSynthesis(partial)`. Initial state `null` then `{ state: "warming", at: <recordStartTime> }` once recording begins.
- TDD: write failing tests first. Tests mock `fetch` for the route call; do not hit Anthropic live.

**Acceptance:**
- `pnpm test tests/lib/client/orchestrator-synthesis.test.ts` passes
- `pnpm test tests/app/api/synthesize.test.ts` passes
- `pnpm tsc --noEmit` clean
- One commit: `feat(api): synthesize route + orchestrator pacer + store field`

---

## Phase 2 — Taxonomy enrichment

### Task 2 · Enrichment script (Phase 1 + Phase 2)

**Files:**
- `scripts/enrich-taxonomy.ts` (new)

**Spec:**
Mirror `scripts/tag-archetypes.ts` (existing pattern). Two phases:
- **Phase 1:** Read all entries from `book-entries.json` + `extras.ts`. For each, call Anthropic to produce `{ how_to_spot: string[3], further_reading: { url, title, source, mins }[2-3], related_canonical_ids: string[4-6], wikipedia_slug?: string }`. The `wikipedia_slug` is auto-derived from canonical_id by default — only populated if it would differ. `further_reading` excludes the chapter link (book mapping comes later). Write proposals to `scripts/taxonomy-enrichment-proposals.json`. Don't mutate canonical files.
- **Phase 2:** Read proposals JSON, validate shape, write back into `lib/taxonomy/book-entries.json` and `lib/taxonomy/extras.ts`. Update `lib/taxonomy/index.ts` type to include new fields.

CLI flags: `--phase 1`, `--phase 2`, `--dry-run`, `--limit N` (testing).

**Acceptance:**
- TypeScript clean
- Script runs successfully on a 5-entry `--limit 5 --dry-run` smoke test
- One commit: `feat(taxonomy): enrichment script for how-to-spot, further-reading, related, wiki-slug`

### Task 3 · Run enrichment live + apply Phase 2

**Action:**
- Run `pnpm tsx scripts/enrich-taxonomy.ts --phase 1` (~$30, ~5 min)
- Spot-check 5 random proposals manually
- Run `pnpm tsx scripts/enrich-taxonomy.ts --phase 2`
- Add coverage test ensuring every entry has `how_to_spot.length ≥ 2`, `further_reading.length ≥ 1`, `related_canonical_ids.length ≥ 3`

**Acceptance:**
- All 123 entries enriched
- Coverage test passes
- One commit: `taxonomy: apply Phase 2 enrichment to all 123 entries`

---

## Phase 3 — Foundations

### Task 4 · Brand tokens

**File:** `app/globals.css`

**Spec:**
Replace existing Tailwind theme tokens with Yenta brand tokens from AST-010 §1. Set up:
- CSS variables: `--cream`, `--cream-2`, `--cream-3`, `--paper`, `--ink`, `--ink-2..5`, `--line`, `--line-soft`, `--line-strong`, `--amber`, `--amber-2`, `--amber-soft`, `--amber-glow`, `--teal`, `--teal-2`, `--teal-soft`, `--green`, `--green-soft`, `--red`, `--red-soft`, `--orange`, `--orange-soft`, `--slate`, `--slate-soft`, `--purple`, `--purple-soft`, `--pink`, `--pink-soft`. Speaker palette `--spk-1..6`.
- Font imports: Newsreader (serif) + Inter (sans), via Next.js `next/font/google` in `app/layout.tsx` for performance — not via raw `<link>`.
- Tailwind config: extend with the brand colors so `bg-paper`, `text-ink`, `border-line` etc. work as utilities. Replace existing `bg-background`/`bg-card` etc. token names with these — old shadcn tokens stay only if `components/ui/*` primitives still depend on them.
- Body: `font-family: 'Inter'`, `background: var(--cream)`, `color: var(--ink)`.

**Acceptance:**
- `pnpm tsc --noEmit` clean
- `pnpm build` succeeds
- One commit: `feat(theme): Yenta brand tokens + Newsreader/Inter via next/font`

---

## Phase 4 — Component build (10 tasks)

All components under `components/session/`. For each: TypeScript strict, no `any`, no dead exports, follow brand tokens, use Tailwind utilities mapped to brand palette. Each task = one commit.

### Task 5 · Primitive chips

**File:** `components/session/chips.tsx`

Components: `VerdictChip`, `MarkerChip`, `SpeakerChip` (editable), `SourceChip`, `TopicChip`. Pure presentational, accept verdict/marker type as discriminated union prop, render correct colors + icons per AST-010 §4–6. SpeakerChip handles inline edit on click (controlled).

### Task 6 · SpeakerRail

**File:** `components/session/speaker-rail.tsx`

Horizontal scrolling rail of `SpeakerChip` + inline 5-bar VU meter that lights up next to the dominant speaker. Replaces standalone AudioMeter (AST-010 §3.2). Wraps speaker palette beyond 6 with numeric badge (Q1).

### Task 7 · SynthesisCard (5 states)

**File:** `components/session/synthesis-card.tsx`

5 states from gap #6:
1. `idle` (no recording): not rendered (caller hides)
2. `warming` (recording, no synthesis yet): skeleton with 2 shimmer lines + 3 chip placeholders + "Yenta is listening…"
3. `fresh`: full paragraph + 3 tappable headline chips + refresh icon + "refreshed Ns ago"
4. `refreshing`: same as fresh + spinner on refresh icon
5. `error`: same as fresh + amber "couldn't refresh · retrying in 30s" line

On mobile (<768px): collapsed by default = 3 headline chips + "Read Yenta's take ⌄". Tap expands paragraph. Per Q21/Gap #7.

Headline chips are clickable; click invokes `onHeadlineClick(headline)` prop — routing lives in parent.

### Task 8 · MetricTile

**File:** `components/session/metric-tile.tsx`

Generic tile with: label, big serif number, stacked bar with proportional segments, breakdown legend. Variants: Claims (true/partial/false/unverifiable), Markers (fallacy/bias/rhetoric), Speakers (per-speaker %), Session (duration + utterance count). Each tile is `<Link>` to filtered L2 except Session (read-only). Per AST-010 §14.

### Task 9 · TopicStrip + ActivityFeed

**File:** `components/session/topic-strip.tsx` + `components/session/activity-feed.tsx`

- **TopicStrip:** horizontal proportional bar of topics (primary only per gap #5). Each segment is `<Link>` to `?view=claims&topic=<id>`. Unclassified bucket hidden if 0.
- **ActivityFeed:** last 6 (desktop) or 4 (mobile) terminal verdict/marker events sorted by `created_at` desc per gap #10. Each row: timestamp + speaker avatar + chip + italic-serif quoted phrase + chevron. Click routes to L3 detail.

### Task 10 · HomeOverview (L1)

**File:** `components/session/home-overview.tsx`

Assembles: SynthesisCard → 4×MetricTile (grid: 4-col desktop, 2×2 mobile) → TopicStrip → ActivityFeed. Reads from `useSessionStore`. Wires headline-chip clicks to `router.push` with L2 filter URLs per gap #3 mapping. Handles synthesis state transitions.

### Task 11 · FilteredList (L2)

**File:** `components/session/filtered-list.tsx`

- Reads `searchParams` for `view`, filter keys (`verdict`, `speaker`, `topic`, `type`, `severity`), `sort`.
- Header: breadcrumb back + h2 title (e.g., "All FALSE claims · 2") + sort popover + export icon.
- Refine row: chip-popover dropdowns for speaker/topic/verdict; active filter chip uses verdict color; "+ Add filter" menu of inactive keys per gap #8.
- Sort options: recent (default) | score | speaker | sources.
- Card variants: `ClaimRow` (big serif score, verdict color bar, speaker chip, italic-serif quote, source-count line) and `MarkerRow` (archetype icon, name, severity dot, italic-serif quote, speaker + time, archetype name).
- Click row → L3.

### Task 12 · ItemDetail (L3)

**File:** `components/session/item-detail.tsx`

Per AST-010 §7, enhanced for v1.1:
- History-aware breadcrumb back (`← {origin}`) using `router.back()` with L1 fallback
- ↑/↓ prev/next within current filter (keyboard + chevron buttons)
- Confidence bar + verdict hero + sources list + "Why this verdict" bullets + speaker context
- Actions row: Share, Save, Re-check (functional — calls `/api/verify-confirmed`), Dispute (disabled with "coming soon" tooltip)
- "See in transcript context" footer link — switches tab to Transcript and scrolls to anchor

Slide-in on desktop ≥1024px (450px right panel, blurs transcript behind), push-stack on mobile.

### Task 13 · LearnMore (L4)

**File:** `components/session/learn-more.tsx`

Two variants by route param:
- **Marker variant** (`/session/learn/marker/:canonical_id`):
  - Header: icon + archetype label + name + aliases
  - Sections: Definition · How to spot · Further reading (chapter card placeholder + Wikipedia + SEP) · Occurrences in this session · Related patterns (4–6 pill chips, capped at 8 per gap #9)
- **Claim variant** (`/session/learn/claim/:claim_id`):
  - Header: claim quote
  - Sections: Full source dossier · Related claims same topic
- Wikipedia link auto-derived from canonical_id unless `wikipedia_slug` override present (Q20). Chapter card: if `book-chapters.json` exists and has a mapping, render real link; else show muted placeholder "Chapter mapping coming soon."
- Reads enriched taxonomy from `lib/taxonomy/index.ts`.

### Task 14 · SessionShell + new TranscriptView

**Files:** `components/session/session-shell.tsx` + `components/session/transcript-view.tsx`

- **SessionShell:** sticky header with brand mark, live pill, header tabs (Overview / Transcript / Claims · N / Markers · N — counts pulled from store), top-controls (Pause, Export, End — opens dialogs in §8). Body slot accepts children (the active view).
- **TranscriptView:** keep the inline-everything render from existing TranscriptView component. Plug into the shell. Side rail (recent verdicts + markers) appears at ≥1280px per Q4.

---

## Phase 5 — Integration

### Task 15 · URL-driven view state

**Files:** `lib/client/use-session-view.ts` (new) + wire SessionShell tabs + L1 tiles + L2 filters

- `useSessionView()` hook returns `{ view, filters, sort, setView, addFilter, removeFilter, setSort }`.
- Schema: `?view=overview|transcript|claims|markers` + filter values comma-separated for OR-within-key + `?sort=recent|score|speaker|sources` per gap #4.
- Tab click → `router.push("/session?view=X")`. Filter change → push with new search params.
- Header tabs are stateful from URL, not internal state.

### Task 16 · Replace `app/session/page.tsx`

**File:** `app/session/page.tsx` (rewrite)

- Mount `<SessionShell>` with body = switch on `view`:
  - `overview` → `<HomeOverview>`
  - `transcript` → `<TranscriptView>`
  - `claims` | `markers` → `<FilteredList>`
- Default view = `overview`. ItemDetail and LearnMore are sub-routes (Next.js App Router: `app/session/detail/[id]/page.tsx` and `app/session/learn/[type]/[id]/page.tsx`) — keep transcript scrollback intact behind detail slide-in.

---

## Phase 6 — Verification (CONTROLLER, not subagent)

### Task 17 · agent-browser sweep · MANDATORY CHECKPOINT

**Action:**
1. Load `agent-browser` skill.
2. Start dev server (`pnpm dev` in bhabha worktree).
3. Drive through: idle landing → start session → 30s of recording → tile tap to L2 → row tap to L3 → "see in transcript" → "learn more" → back paths.
4. Screenshot each at 393 (mobile), 820 (tablet portrait), 1024 (tablet land / narrow desktop), 1280 (wide desktop).
5. Document each screen vs AST-010 §X.
6. STOP here. Report mismatches to user before continuing.

---

## Phase 7 — Polish

### Task 18 · Fix mismatches

Up to 3 rounds. After round 3 → root-cause analysis per CLAUDE.md three-strikes rule.

### Task 19 · Empty/error states + keyboard shortcuts

**Files:** `components/session/empty-state.tsx`, `components/session/connection-banner.tsx`, `app/session/page.tsx` (keyboard handlers)

- Pre-record empty state per AST-010 §9.1
- Connection-lost amber banner per §9.3
- Keyboard: Space (record/pause), P (present mode), Esc (close detail/learn-more). Per Q5.

### Task 20 · Test updates + final tsc/test pass

- Add tests for `useSessionView`
- Add tests for SynthesisCard state transitions
- Retire tests for dropped components (ClaimCardStack, MarkersPanel, MarkerTicker)
- Final `pnpm test` + `pnpm tsc --noEmit` clean

---

## Phase 8 — Final review

### Task 21 · Final code review + summary

Dispatch final reviewer subagent over full diff. Then write summary to user listing: what changed, files touched, total commits, total tests, agent-browser screenshots, what to manually verify before any deploy.
