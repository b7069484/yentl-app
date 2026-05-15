# Yenta · Handoff — 2026-05-14

**For:** a fresh Claude session picking up Yenta work.
**State:** Sprint 1 backend complete; **AST-010 v1.1 design pack written and awaiting Israel's sign-off**; no code rebuild yet.
**Ball is in:** Israel's court (§12 Q13–Q21 of the design pack).

---

## TL;DR — three threads

| Thread | State | Where |
| --- | --- | --- |
| Sprint 1 backend (multi-speaker, durability, AI fixes, exports) | **Done & verified.** 94/94 tests, `tsc --noEmit` clean. Local commits only — NO push, NO deploy. | Branch `claude/sprint-1-multi-speaker-durability` in worktree `wonderful-bhabha-796897` · tip `8ce6cb7` |
| AST-010 v1.1 design pack (Overview-first architecture, drill-down map, mobile + desktop) | **Done, awaiting sign-off.** | `/Users/israelbitton/Live FactCheck/.claude/worktrees/bold-cray-e9479f/.project/assets/ui/v3/AST-010_responsive-design-pack.html` |
| Implementation rebuild (replace `app/session/page.tsx` + `components/session/` against AST-010 + new `/api/synthesize` route) | **Not started.** Gated on sign-off. | (the bhabha worktree once approved) |

---

## What happened in the previous session

Israel asked: "Resume Sprint 1 execution from Task 7" with subagent-driven-development.

1. **Completed Sprint 1 Tasks 7–32** (the original plan in `docs/superpowers/plans/2026-05-13-sprint-1-multi-speaker-durability.md`) — backend features: speakersMode toggle, AudioMeter, hardened Deepgram client with retry/CloseStream/AbortController, dominantSpeaker, TranscriptView speaker blocks, speaker chip + rename, marker attribution, orchestrator rewrite, web_search citations, ClaimCard hero image, OG metadata scraper, /api/source-preview with SSRF, archetype icon catalog, Two-phase archetype classifier (ran live, populated all 123 taxonomy entries), prompt-caching wrapper, Markdown/JSON/HTML exporter updates.
2. **Verified end-to-end via agent-browser** — all major screens, live API pipeline (extract-claims → verify-confirmed → source-preview), markers, exports.
3. **Fixed real bugs found during verification:**
   - `fec3808` Per-stream Deepgram counters + abort-aware retry + concurrent-restart guard + `__yenta` dev shim
   - `a4f6f8f` Finished the Factify→Yenta rebrand (page title, landing copy, HTML report header/footer, og-fetch User-Agent, export filenames)
   - `32095d8` **Critical:** Task 19 was probing the wrong AI SDK v6 shape — sources were silently empty for every claim. Real shape: `step.content[]` blocks with `type:"source"`. Plus a `scrubUrl` to handle JSON-bleed corruption in stance_ref URLs, default stance="mixed" when no stance_ref matches a citation, and revert `analyze-rhetoric` to top-level `system:` to silence AI SDK prompt-injection warning.
   - `bfd1538` `og-fetch` entity decoder didn't handle zero-padded numeric entities (`&#039;`); now handles any decimal or hex codepoint
   - `257543f` Task 29 Phase 1+2 ran live ($1 in Anthropic credits) — all 123 taxonomy entries got an archetype assigned, plus the coverage test
   - `8ce6cb7` `lib/taxonomy/index.ts` mapper was dropping the new `archetype` field from book-entries.json — one-line plumb-through fix
4. **Israel said "the dev server looks the same as before"** — pointed out he'd never asked for backend-only Sprint 1, he wanted a redesigned UI. He referenced **AST-008** (mobile live-stream wireframe) and **AST-009** (lowercase serif "yenta" logo) in the `bold-cray-e9479f/.project/dashboard.html` ecosystem — a brief I'd missed entirely. Memory note explicitly told me to maintain `.project/dashboard.html` for visual projects and I still missed it.
5. **Wrote AST-010 v1.0** — full responsive design pack covering desktop / tablet / mobile, all states, function inventory, open questions. Inside the worktree at `bold-cray-e9479f/.project/assets/ui/v3/AST-010_responsive-design-pack.html`.
6. **Israel responded** "where's the AI summary of the entire conversation, the metaview? main view should be top-line metrics with drill-down — biases/fallacies with learn-more URLs and context." I'd built transcript-as-interface (per AST-008's mobile wireframe) but the actual product is a dashboard.
7. **Rewrote to AST-010 v1.1** with Overview-first architecture:
   - L1 Overview (home): rolling AI synthesis paragraph + tappable metric tiles + headline insight chips + topic distribution + recent activity feed
   - L2 Filtered lists (e.g., "all FALSE claims") — sortable, refinable, URL-driven
   - L3 Item detail (existing §7, unchanged)
   - L4 Learn more — taxonomy definition + how-to-spot bullets + Wikipedia/book/SEP links + occurrences in this session + related patterns
   - Transcript view demoted from home to one drill-path among many
   - 14 new rows in §11 function inventory flagging backend dependencies
   - 9 new Qs (Q13–Q21) at the bottom of §12 — load-bearing decisions for the rebuild

---

## What's waiting on Israel

Reply to AST-010 v1.1 with:

1. **Section verdicts:** §13 IA map / §14 Overview / §15 Filtered lists / §16 Learn more — approve or "change §X as …"
2. **Q13–Q21 answers** — each has my recommendation in bold. He can reply "all recs, go" or override.

Once sign-off lands, the implementation rebuild starts.

---

## The rebuild scope (for when sign-off comes)

**Tear down:**
- `app/session/page.tsx` — replace with Overview-first home view
- All `components/session/*.tsx` files — rewrite against AST-010 design system tokens

**Keep as-is:**
- `lib/types.ts` (the type model is correct)
- `lib/client/session-store.ts` (Zustand store contract is right)
- `lib/client/deepgram-stream.ts` (hardened in `fec3808`/`32095d8`)
- `lib/client/orchestrator.ts` (extract → verify → source-preview pipeline)
- All `app/api/*` routes (extract-claims, verify-provisional, verify-confirmed, analyze-rhetoric, source-preview, deepgram/token)
- All `lib/prompts/*`
- All `lib/export/*` and `lib/taxonomy/*`
- All `tests/*`

**Add:**
- `app/api/synthesize/route.ts` — new endpoint for the rolling synthesis paragraph (Anthropic Opus 4.7, no tools, cached SYSTEM, ~1s). Input: last 20 utterances + counters + speakers. Output: paragraph + 3 headlines.
- Orchestrator pacer `maybeRunSynthesis()` next to existing `maybeRunRhetoric()`, fires every 30s OR every 5 final utterances, aborts on close.
- New store field: `synthesis: { text: string; headlines: string[]; at: number }`.
- New global brand CSS in `app/globals.css`: cream/amber/teal/ink palette, Newsreader + Inter fonts via Google Fonts, all the tokens from AST-010 §1.
- New component tree (rough names):
  - `<SessionShell>` — header + tabs + body slot
  - `<HomeOverview>` — synthesis card + tile row + topic strip + activity feed
  - `<SynthesisCard>` — rolling paragraph + headline chips + refresh button
  - `<MetricTile>` — generic, with stacked-bar breakdown
  - `<FilteredList>` — L2 list view, parameterized by filter
  - `<ClaimRow>`, `<MarkerRow>` — list-card variants
  - `<ItemDetail>` — L3 (succeeds existing `<ClaimCard>` in expanded form)
  - `<LearnMore>` — L4 with definition/spotting/sources/occurrences/related
  - `<TranscriptView>` — keeps inline-everything render from existing component, just plugged into the new shell
  - `<SpeakerRail>`, `<SpeakerChip>`, `<MarkerChip>`, `<VerdictChip>`, `<SourceChip>` — primitives
- Taxonomy enrichment pass: a one-time LLM script (`scripts/enrich-taxonomy.ts`) that adds `how_to_spot[]`, `further_reading[{url,title,source,mins}]`, `related_canonical_ids[]`, `wikipedia_slug` to every entry in `book-entries.json` + `extras.ts`. Pattern follows `scripts/tag-archetypes.ts` (Phase 1 + Phase 2). Cost ≈ $30 for the full pass.
- URL-driven view state: tab + filter selection in `URLSearchParams` for shareable routes (e.g., `/session?view=claims&filter=verdict:false&speaker=david`).

**Reviewer concerns from Sprint 1 that should land in the rebuild commits (not yet fixed):**
- `aria-live` redundant on `<output>` (Task 9 review minor) — when rewriting `<AudioMeter>` drop the explicit attr
- Task 11 review notes: `openSocket` abort during connect can leave Promise pending — minor edge case
- Task 14 review notes: null-speaker_id blocks render as orphan headerless blocks — design Q1 in §12 of AST-010 covers this (numeric badge after palette wrap)

---

## Important context the next session needs

### Israel's CLAUDE.md (project-wide rules)
Lives at `/Users/israelbitton/.claude/CLAUDE.md`. Key directives:

- **Project Type Discovery first** — never assume git/code work
- **No false completion claims** — say "I changed X, please verify Y" not "this fixes it"
- **Three strikes rule** — 2 failed fix attempts → root cause analysis → new approach
- **Architecture alignment gate** — restate what we're building before coding
- **agent-browser MANDATORY** for any UI work — use it to verify rendered output
- **`.project/dashboard.html` workflow** for visual projects — wireframes + asset library + change log live there
- **No `git push`, no `vercel deploy`** unless explicitly authorized

### Memory notes
At `/Users/israelbitton/.claude/projects/-Users-israelbitton-Live-FactCheck/memory/MEMORY.md`:

- `user_author.md` — Israel wrote a 2024 book on 55 cognitive biases & logical fallacies used by antisemites; deep domain expertise. The book is the source of `book-entries.json` (55 entries) + `extras.ts` (68 more = 123 total).
- `project_factify.md` — original product brief
- `project_factify_state_2026-05-13.md` — v1 deployed at factify-rose.vercel.app
- `project_factify_rebrand_2026-05-13.md` — rebranded to Yenta (Yiddish "truth-teller"). New domain is yenta.vercel.app (and eventually yenta.me).
- `feedback_project_dashboard_workflow.md` — the `.project/dashboard.html` workflow note I missed.

### The repo layout

There are three relevant worktrees:

```
/Users/israelbitton/Live FactCheck/                                          ← main worktree, untouched
└── .claude/worktrees/
    ├── bold-cray-e9479f/      ← brand/design ecosystem · dashboard.html · AST-010 lives here
    ├── wonderful-bhabha-796897/  ← Sprint 1 BACKEND lives here · the branch to keep building on
    └── wonderful-bardeen-57e657/ ← throwaway orchestrator worktree (where the last Claude session ran)
```

**For the rebuild, work in `wonderful-bhabha-796897`** — that's where the Sprint 1 backend you depend on lives, on branch `claude/sprint-1-multi-speaker-durability`. The bold-cray worktree is read-only for design reference (AST-010 v1.1 + Y-mark PNG at `assets/logos/v3/AST-007_y-mark-transparent.png`).

### Skills the next session needs

Load these via the `Skill` tool when you start:
- `superpowers:using-superpowers` (auto-loaded at session start)
- `superpowers:brainstorming` — only if scope expands; otherwise skip, design is locked
- `superpowers:subagent-driven-development` — dispatch implementer/spec-reviewer/code-quality-reviewer subagents per file
- `agent-browser` — mandatory before any UI verification (load with `agent-browser skills get agent-browser`)
- `frontend-design:frontend-design` — for the new component build
- `committee:committee-review` — useful for a single pre-merge review of the new component tree

### Skills/concerns to NOT re-litigate

- The Sprint 1 plan is closed. Don't re-execute it.
- The Yenta rebrand is done.
- AST-008 (mobile-only wireframe) and AST-009 (logo) are approved. Brand tokens are locked in AST-010 §1.

---

## Starter prompt for the next session

Paste this into a fresh Claude Code session running in **`/Users/israelbitton/Live FactCheck/.claude/worktrees/wonderful-bhabha-796897`** (or any path — the prompt below sets CWD).

```
I'm picking up Yenta work. Read the handoff first, then read AST-010 v1.1, then wait for my decisions before doing anything.

HANDOFF:
/Users/israelbitton/Live FactCheck/.claude/worktrees/wonderful-bhabha-796897/docs/superpowers/handoff/2026-05-14-ast010-design-approval-pickup.md

DESIGN PACK (this is the contract — read end to end):
/Users/israelbitton/Live FactCheck/.claude/worktrees/bold-cray-e9479f/.project/assets/ui/v3/AST-010_responsive-design-pack.html

CWD-guard: all git + npm commands must run inside
/Users/israelbitton/Live FactCheck/.claude/worktrees/wonderful-bhabha-796897
(path has a space — quote it). Branch should be claude/sprint-1-multi-speaker-durability,
tip 8ce6cb7. Verify with: cd "/Users/israelbitton/Live FactCheck/.claude/worktrees/wonderful-bhabha-796897" && git branch --show-current && git log --oneline -3

Read CLAUDE.md (~/.claude/CLAUDE.md) and MEMORY.md
(~/.claude/projects/-Users-israelbitton-Live-FactCheck/memory/MEMORY.md) for context.
The .project/dashboard.html workflow note is non-negotiable — visual work goes there.

After you've read those, report back with:
1. A single-paragraph restatement of what you understand about (a) the state of the
   code, (b) the state of the design pack, (c) what I owe you before any code moves.
2. A list of any sections of AST-010 you find unclear or missing — flag them BEFORE
   I sign off, not after.
3. NO code changes yet. Wait for my reply on §13–§16 and Q13–Q21.

Use subagent-driven-development when implementation starts, and load agent-browser
before any UI verification. No `git push`, no `vercel deploy` unless I explicitly say so.
```

Once Israel signs off the design, the implementer plan for the rebuild is:

1. Add `/api/synthesize` route + orchestrator pacer + store field (1 commit)
2. Run taxonomy enrichment Phase 1 (live LLM, ~$30) → propose JSON
3. Israel reviews proposals → Phase 2 applies (1 commit)
4. Add brand tokens to `app/globals.css` (1 commit)
5. Build new component tree under `components/session/` — one component per commit, dispatched via subagent-driven-development with per-component spec + code-quality review
6. Replace `app/session/page.tsx` with new SessionShell + HomeOverview default (1 commit)
7. Wire URL-driven view state (1 commit)
8. Full visual verification via agent-browser at desktop / tablet / mobile breakpoints — fix anything that doesn't match AST-010
9. Update tests for any retired components, add tests for synthesis pacer
10. Final summary to Israel with what to test

Estimate: 25–35 commits, 4–6 hours of focused work with subagents, $30–50 in Anthropic credits for the synthesis pacer + taxonomy enrichment.

---

## Files to know

| Path | What |
| --- | --- |
| `bold-cray-e9479f/.project/assets/ui/v3/AST-010_responsive-design-pack.html` | The design contract (v1.1). Read this end-to-end. |
| `bold-cray-e9479f/.project/dashboard.html` | The brand/asset/wireframe ecosystem |
| `bold-cray-e9479f/.project/assets/logos/v3/AST-007_y-mark-transparent.png` | Y-monogram for header/favicon |
| `wonderful-bhabha-796897/docs/superpowers/plans/2026-05-13-sprint-1-multi-speaker-durability.md` | Sprint 1 plan (CLOSED — backend complete) |
| `wonderful-bhabha-796897/docs/superpowers/handoff/2026-05-14-ast010-design-approval-pickup.md` | This handoff |
| `wonderful-bhabha-796897/app/session/page.tsx` | Current session page (to be replaced) |
| `wonderful-bhabha-796897/components/session/*` | Current components (to be replaced) |
| `wonderful-bhabha-796897/lib/client/orchestrator.ts` | Keep — extend with synthesis pacer |
| `wonderful-bhabha-796897/lib/client/session-store.ts` | Keep — add `synthesis` field |
| `wonderful-bhabha-796897/lib/taxonomy/{book-entries.json,extras.ts}` | Keep — enrich with how_to_spot/further_reading/related/wikipedia_slug |
| `wonderful-bhabha-796897/scripts/tag-archetypes.ts` | Pattern for the new `scripts/enrich-taxonomy.ts` |

---

## Final note

Israel is two design misses deep on this product. The first miss was not checking `.project/dashboard.html` before Sprint 1 implementation. The second miss was building "transcript IS the interface" when the actual product is a dashboard with the transcript as one drill-path. **Do not assume the brief — read AST-010 v1.1 end to end and ask before deviating.** When in doubt about a UI decision: it's in §12 (Open questions), and Israel's answer wins. The brand tokens (§1), the IA map (§13), and the Overview home (§14) are not negotiable.

Sprint 1 backend is solid. The visual rebuild is the unblock.
