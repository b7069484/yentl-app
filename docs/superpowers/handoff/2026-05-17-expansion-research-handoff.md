# Yentl Expansion Research — Findings & Reference-Implementation Handoff

**Date:** 2026-05-17
**Branch:** `claude/crazy-robinson-52cde0`
**For:** The session continuing Yentl on the **current** UI/UX (the multi-source-chooser shell with Library / Overview / Transcript / Claims / Markers tabs, not the older single-button-Record UI).

---

## Why this doc exists

The original ask was research: "what would it take to make Yentl invokable from X, ship as iOS and Android, and what's the compliance + UI/UX surface for that?" That research **was** completed and lives at:

> [`.project/research/yentl-expansion-research.html`](../../../.project/research/yentl-expansion-research.html)

A self-contained, brand-locked, light-mode HTML report. ~25k words across 11 sections (executive summary, process, current state, X integration, mobile conversion, app store compliance, regulatory landscape, UI/UX patterns, master roadmap, top risks, sources). **This is the deliverable.**

Past that, the session **drifted into implementation** — picking up the prior `2026-05-11-task-12-onward.md` handoff and starting to execute Tasks 12-16 on top of the older session UI. That code lives on this branch but was **keyed to the wrong surface**. This doc names what's reusable and what to discard.

---

## TL;DR

- **Read the research HTML.** That's the actual deliverable. Everything below is supplementary.
- **Don't merge this branch as-is.** The session-page wiring + 2-column layout assumes a UI surface you've moved past.
- **Do lift specific pieces** from the implementation if useful: the consent layer (logic + copy), the three API endpoints (prompts + routes), the orchestrator integration shape, and the Anthropic SDK gotchas captured below.
- **Three zero-cost moves from the research are still valid this week:** confirmed Deepgram diarization is OFF, sign DPAs with Deepgram + Anthropic, switch to `api.eu.deepgram.com` when serving EU users. These are independent of any UI.

---

## Part 1 — The research deliverable

Single-file HTML report at `.project/research/yentl-expansion-research.html`. Open in any browser (relative paths, light mode, self-contained CSS + inline SVG mark). Sections:

| # | Section | What's in it |
|---|---|---|
| 01 | Executive Summary | Five-point plan; three calendar deadlines (AI Act Art. 50 binding 2026-08-02; Play targetSdk 36 by 2026-08-31; EAA in force) |
| 02 | Process & Methodology | How the report was made (codebase audit + 5 parallel research streams) |
| 03 | Current State | Tech-stack snapshot + browser-API dependencies + key-file map |
| 04 | X Integration | X API pricing & rate-limits (the $0.01 summoned-reply carve-out matters); architecture; two-pass moderation gate; cost model ($0.045/mention blended); six-layer prompt-injection defense; reply UX |
| 05 | Mobile Conversion | Four paths compared (PWA / Capacitor / Expo-RN / native); blocker table per file; **recommendation: PWA week 1 → Capacitor month 1**; full migration checklist; $365 year-one cost |
| 06 | App Store Compliance | Apple 5.1.2(i) / 4.7.1 / 1.1.6 tripwires; Google AI-Generated Content + foreground-service video; checklist; common rejection causes |
| 07 | Regulatory Landscape | GDPR + AI Act + recording-consent + BIPA; defamation (Section 230 doesn't shield Yentl's own AI outputs); jurisdictional matrix; 4-tier compliance roadmap |
| 08 | UI/UX Patterns | 54-row requirement→component map with v1/v1.1/v2 ship badges; brand-voice compliance copy library |
| 09 | Master Roadmap | Sequenced v1.0 → v1.1 → v2.0 |
| 10 | Top 10 Risks | Risk-ranked, with mitigations |
| 11 | Sources | Every cited source, grouped by section |

Brand mark used: `.project/assets/logos/v5/yentl-mark.svg` (copied from `claude/bold-cray-e9479f` worktree per the locked v5 brand spec).

Both files committed in `88ca034`.

---

## Part 2 — Out-of-scope implementation (do NOT merge as-is)

Past the research, six implementation commits landed on this branch. They target the **older** session UI (single Record button → 2-column transcript+claims layout) and assume the prior `app/session/page.tsx` shape. Treat them as **reference implementations**: cherry-pick patterns and copy, don't merge files.

| SHA | What | Status vs current UI |
|---|---|---|
| `9d1ff35` | ConsentGate (modal + ledger + page wiring) | **Reusable: logic + copy. Discard: the `app/session/page.tsx` edit.** |
| `b190372` | `/api/extract-claims` route + prompt + AI Gateway model constant | **Reusable as-is** (server, UI-agnostic) |
| `6fc9724` | `/api/verify-provisional` route + prompt | **Reusable as-is** |
| `bb6965a` | `/api/verify-confirmed` route + prompt + URL sanitizer + reputation enrichment | **Reusable as-is** |
| `db0fb87` | `ClaimCard` + `ClaimCardStack` + `SourceListItem` shadcn components | **Outdated** — the new UI is unlikely to use this exact card shape. Lift only the schema-to-component mapping concepts. |
| `79011a7` | `lib/client/orchestrator.ts` + 2-column page wiring | **Reusable: `orchestrator.ts`. Discard: the page edit.** |

### What "reusable as-is" means

The three Route Handlers (`app/api/extract-claims/`, `app/api/verify-provisional/`, `app/api/verify-confirmed/`) and their associated prompt modules in `lib/prompts/` are completely UI-agnostic. They take JSON in, return JSON out, validated via zod. The current-UI session can call them via the same client orchestrator pattern (`onFinalUtterance` → extract → fan-out provisional + confirmed) regardless of how cards are rendered.

### What to discard

`app/session/page.tsx` in the implementation commits reverts to the old single-Record-button + 2-column layout. The current UI is a multi-source chooser ("Microphone / Text doc / Audio file / YouTube URL / Media URL"). Discard the page-level edits entirely.

---

## Part 3 — Specific learnings the new UI must know (transferable regardless of surface)

These are gotchas + confirmed facts that apply to any Yentl build, captured the hard way:

### 3.1 Deepgram diarization is OFF and should stay OFF

`lib/client/deepgram-stream.ts` (current main, untouched on this branch) does NOT pass `diarize=true` to the Deepgram WSS endpoint. Deepgram defaults diarization to off. **This is the single highest-impact technical decision for US biometric (BIPA) exposure** — the 2025–2026 BIPA voiceprint cases (Brewer v. Otter.ai, Cruz v. Fireflies.AI) target services that diarize. Statutory damages: $1k–$5k per recording.

If a future feature flips diarization on (e.g., debate-mode speaker separation), revisit this with counsel and geofence Illinois until cleared.

### 3.2 Vercel AI Gateway model slug

`anthropic/claude-opus-4.7` is the current slug, confirmed via:

```bash
curl -s -H "Authorization: Bearer $VERCEL_OIDC_TOKEN" \
  https://ai-gateway.vercel.sh/v1/models \
  | jq -r '.data[].id' | grep claude-opus
# anthropic/claude-opus-4
# anthropic/claude-opus-4.1
# anthropic/claude-opus-4.5
# anthropic/claude-opus-4.6
# anthropic/claude-opus-4.7   ← use this
```

The AI SDK auto-routes any plain `"provider/model"` string through the gateway. **Don't wrap in `anthropic(...)`** for the model arg; the wrapped form bypasses the gateway and tries direct provider auth. Auth flows via `VERCEL_OIDC_TOKEN` written by `vercel env pull .env.local` — no per-provider API key is needed, and the post-tool-use validation hook will reject code or docs that reference one (intentional, to prevent silent gateway bypass).

### 3.3 AI SDK v6 structured output pattern

`generateObject` was removed in AI SDK v6. The replacement pattern is:

```ts
import { generateText, Output } from "ai";

const { output } = await generateText({
  model: "anthropic/claude-opus-4.7",   // plain string → gateway
  output: Output.object({ schema: MyZodSchema }),
  system: SYSTEM,
  prompt: userMessage,
});
```

The destructure is `const { output }` (not `const { object }`). Used in all three API routes — copy the pattern.

### 3.4 The Anthropic `web_search` helper name moved

Plan + handoff doc both said `anthropic.tools.webSearch_20250305(...)`. As of `@ai-sdk/anthropic@3.0.76` (May 2026) the current helper is **`webSearch_20260209`**. Both still exist; the newer one is the right one to use. Full list of tool helpers in this SDK version:

```
bash_20241022, bash_20250124
codeExecution_20250522, codeExecution_20250825, codeExecution_20260120
computer_20241022, computer_20250124, computer_20251124
memory_20250818
textEditor_20241022, textEditor_20250124, textEditor_20250429, textEditor_20250728
webFetch_20250910, webFetch_20260209
webSearch_20250305, webSearch_20260209
toolSearchRegex_20251119, toolSearchBm25_20251119
```

### 3.5 Claude's structured output URL field-bleed

`verify-confirmed` with `Output.object({ schema })` and Claude Opus 4.7 + web_search **occasionally emits a URL field with the next field bled into it**. Pattern observed in 2-of-3 sources in repeated tests:

```
url: "https://www.nobelprize.org/prizes/peace/2024/summary/','domain':'nobelprize.org"
```

Looks like Claude emits something like `"url":"...","domain":"..."` with a single/double quote mix; the AI SDK repair pass merges the malformed bit into the URL string and zod's `url()` validator is permissive enough to let it through (URLs technically can contain those chars in paths).

**Mitigation (already in `bb6965a`):** server-side `sanitizeUrl(raw, domain)` splits on `/['"]\s*,/` and falls back to `https://{domain}/` if the remainder doesn't parse:

```ts
function sanitizeUrl(raw: string, domain: string): string {
  const cleaned = raw.split(/['"]\s*,/)[0];
  try {
    return new URL(cleaned).toString();
  } catch {
    return `https://${domain}/`;
  }
}
```

Apply this anywhere the LLM emits URLs through structured output.

### 3.6 Factuality vs confidence scoring direction

Spec §8 defines `score: number  // 0-100 factual`. **Without an explicit prompt instruction**, Claude treats it as confidence-in-label and scores a FALSE claim at 100 ("100% confident this is false"). That produces "FALSE — 100/100" on the verdict card, which reads wrong.

**Fix (in both `verify-provisional` and `verify-confirmed` prompts):** add an explicit scale block to the system prompt:

```
Score is a FACTUALITY scale, not a confidence score:
- 0   = entirely false
- 50  = mixed / context-dependent / partially true
- 100 = entirely true
Pair the score with the label: FALSE/MISLEADING/OMISSION should score low
(typically 0–30); PARTIAL around 30–60; MOSTLY_TRUE around 60–85; TRUE 85–100.
UNVERIFIABLE around 50; OPINION 0.
```

Smoke-tested before/after:
- "Earth is flat" → FALSE/100 (before) → FALSE/0 (after) ✓
- "Earth is ~4.5B years old" → TRUE/98 (both, no change needed)
- "Vaccines completely prevent COVID" → FALSE/5 (with the fix) — correctly low

### 3.7 Reputation classifier needs expanded HIGH list

`lib/reputation.ts` HIGH set is missing several authoritative domains observed in web_search output:

- `nobelprize.org` (currently classified "mid")
- `time.com` (currently "mid")
- `wikipedia.org` (intentionally "mid" — debatable for fact-checking; keep at "mid" until policy decision)
- Various academic publishers (`jamanetwork.com`, `cell.com`, etc.)
- IGOs: `who.int`, `un.org` (covered by `.gov`-like patterns? no — they're `.int`)

Easy follow-up. Add `.int` to the auto-HIGH heuristic alongside `.gov`/`.edu` and expand the HIGH set with major outlets + the Nobel Foundation as a curated bump.

### 3.8 The provisional-vs-confirmed race

The orchestrator fires both verifications in parallel. If confirmed completes BEFORE provisional, provisional's late return would visually downgrade the card. Guard required:

```ts
// in verifyProvisional callback:
const current = useSession.getState().claims.find((c) => c.id === id);
if (!current || current.status === "confirmed") return;
useSession.getState().updateClaim(id, { ...data, status: "provisional" });
```

The confirmed pass doesn't need the equivalent guard — confirmed always wins.

### 3.9 Anthropic `web_search` privacy-settings dependency

Has to be enabled at https://console.anthropic.com/settings/privacy. **User confirmed it's enabled** during this session. Symptom of it being off would be a 403 / "tool not available" from `/api/verify-confirmed`.

---

## Part 4 — Environment notes

### 4.1 `.env.local` + `.vercel/` are gitignored and don't carry across worktrees

The worktree starts without them. Two options:

1. Symlink from the main worktree (this session did this):
   ```bash
   ln -s "../../../.env.local" .env.local
   ln -s "../../../.vercel" .vercel
   ```
   Pro: all worktrees share one OIDC token; refresh in main and all worktrees see it.
   Con: deleting the symlinks shouldn't delete the originals (it doesn't), but be aware.

2. Run `vercel env pull .env.local --yes` per worktree.
   Pro: explicit, no symlink magic.
   Con: each worktree has its own token; expiry tracked separately.

### 4.2 Workspace-root warning is benign but worth noting

Next.js 16 + Turbopack complains:
```
We detected multiple lockfiles and selected the directory of
/Users/israelbitton/package-lock.json as the root directory.
```

Because there's a `package-lock.json` at `~/` (parent of `Live FactCheck/`) plus one in the project. Fix by either deleting the stray top-level one (if it's not needed) or setting `turbopack.root` in `next.config.ts` to the project path.

### 4.3 Multiple dev servers conflict on port 3000

With many worktrees, port 3000 is often already taken. The other server in this case was on PID 94832 from a sibling worktree. `npm run dev` auto-falls to 3002. If you're using `agent-browser` to verify, double-check which server it's hitting.

---

## Part 5 — The "this week" 3-action list (still valid)

From the research report's top-10 risks summary. None of these are UI-dependent — all should be done regardless of which session ends up shipping:

1. **Diarization off in Deepgram config.** Already confirmed via code inspection: `lib/client/deepgram-stream.ts:17-24` does not set `diarize`. Document in the DPIA when written.
2. **DPAs with Deepgram and Anthropic.** Zero-cost paperwork. Unlocks EU usage. Switch Deepgram traffic to `api.eu.deepgram.com` for EU users (one-line URL swap in `lib/client/deepgram-stream.ts:30`).
3. **Consent modal naming Deepgram and Anthropic by name.** This is what the ConsentGate work in `9d1ff35` implements. The logic + copy is reusable even if the rendering surface changes — see Part 6.

---

## Part 6 — What to lift, file by file

If you want to pull pieces of the implementation work into the current UI:

### Definitely lift (UI-agnostic)

| File | Why |
|---|---|
| `lib/server/anthropic.ts` | Single-line gateway model constant. Cite-and-forget. |
| `lib/prompts/extract-claims.ts` | Zod schemas + SYSTEM + user-prompt builder. Tested. |
| `lib/prompts/verify-provisional.ts` | Same. Includes the factuality-scale fix per 3.6. |
| `lib/prompts/verify-confirmed.ts` | Same. Same factuality-scale fix. |
| `app/api/extract-claims/route.ts` | Pure server. zod-validated request + Output.object response. |
| `app/api/verify-provisional/route.ts` | Same. |
| `app/api/verify-confirmed/route.ts` | Same — with the `sanitizeUrl` helper per 3.5 and server-side `classifyDomain` enrichment. |
| `lib/copy/consent.ts` | Compliance copy in Yentl voice. Lift the strings; render however your UI does. |
| `lib/client/consent-ledger.ts` | localStorage helper with versioning. Generic. |
| `lib/client/orchestrator.ts` | The fan-out logic. Adapt the entry point (currently `onFinalUtterance(segment)`) to whatever your new UI emits — could be `onTranscriptText(text)` for the text-paste mode, `onYouTubeCaptions(...)` for the URL mode, etc. The internal logic (extract → fire provisional + confirmed in parallel → patch the store) is reusable. |

### Probably lift (translate)

| File | What to do |
|---|---|
| `components/consent/ConsentGate.tsx` | Read for structure (3 required + age + optional analytics + amber sensitive-data callout + recording disclosure). Re-author in your current design system. The 5-checkbox shape is what satisfies GDPR Art. 7 + Art. 9 + Apple 5.1.2(i) + recording-consent simultaneously. |
| `components/session/ClaimCard.tsx` | Concept (color stripe + status dot + factuality score + annotation chips + source list) carries over; specific shadcn classes likely don't. |
| `components/session/SourceListItem.tsx` | Same — concept (stance icon + title + domain + reputation badge + open-in-new-tab) carries; styling re-do. |

### Skip entirely

| File | Why |
|---|---|
| `app/session/page.tsx` (the version on this branch) | Old single-Record-button + 2-column layout. Your current UI is multi-source-chooser. |
| `components/session/ClaimCardStack.tsx` | Likely doesn't match your new layout. |

---

## Part 7 — Pointers

- **Research deliverable:** `.project/research/yentl-expansion-research.html` (open in any browser)
- **Brand mark used:** `.project/assets/logos/v5/yentl-mark.svg`
- **Commits on this branch:** see Part 2 table; latest is `79011a7`
- **Branch:** `claude/crazy-robinson-52cde0`, not merged to `main`
- **Sister worktree containing the locked brand spec:** `claude/bold-cray-e9479f` (`.project/dashboard.html` there is the brand audit trail)
- **Prior handoff that mis-led this session into implementing:** `docs/superpowers/handoff/2026-05-11-task-12-onward.md` (still valid for any session continuing the old UI, but the *current* session should ignore it)

---

## Part 8 — What I'd do next if I were the current-UI session

1. **Read the research HTML** end-to-end (45 min). Especially §08 (UI/UX patterns mapping table) — that's the requirement→component checklist that should slot into whatever your new shell looks like.
2. **Decide which v1 compliance components are blocking.** The Tier-1 list in §07 is: ConsentGate, ConsentLedger, recording beacon, AI-generated badges, source-citation rendering, "Report this verdict" button, methodology + about + changelog pages, WCAG 2.2 AA baseline, 18+ ToS. Most of these don't depend on which input source the user picked.
3. **Lift the three API endpoints + their prompts directly.** They're done, tested, and UI-agnostic. They're also the most time-consuming pieces to redo.
4. **Lift the orchestrator pattern, adapt the entry point.** Your multi-source chooser means the trigger isn't always "Deepgram is_final" — it could be "paste completed," "YouTube captions fetched," "audio file uploaded and transcribed." The fan-out shape (extract → provisional+confirmed in parallel → patch store) is the same.
5. **Send the two DPA-request emails** (Deepgram + Anthropic). Zero-cost, EU-unlocking.

---

*End of handoff. The research itself is the artifact; the code on this branch is a reference. Take what helps, leave the rest.*
