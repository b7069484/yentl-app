# Yentl — Frontend / UX Audit (against the "simple + glanceable" goal)

Date: 2026-06-19
Scope: session/analysis UI, signal/verdict system, TV/glanceable modes, ingest UX, marketing/onboarding.
Method: read-only static read of the components, routes, theme tokens, and spec. No code changed.

**Owner's UX goal (the bar everything is judged against):**
> "The UI must be simplified, consumer-friendly, easy to understand and use, and easy to get clear signals out of even without reading things up close — like watching a YouTube video and getting clear at-a-glance signals as to whether the speech is true, false, inflammatory, etc."

So the bar is: **glanceable, consumer-grade, low cognitive load, instantly legible true / false / inflammatory signaling — readable without reading fine print, ideally from across a room.**

---

## VERDICT IN ONE LINE

Yentl is a **beautifully built, internally consistent, but power-user-dense analyst's console** that does **not yet** meet the "glance and know if this is true/false/inflammatory" bar. The signal *information* is all present and the color intentions are right, but it is delivered as **small, low-contrast, multi-vocabulary, multi-panel** chrome that requires reading. The single biggest gaps: (1) **four competing verdict vocabularies** so the same claim reads "Supported," "True," and "Mostly True" in different places; (2) **the live VerdictChip — the most-rendered signal in the app — uses tiny saturated text on pale same-hue tints that fail contrast**, the opposite of glanceable; (3) **the Watch screen shows ~7 simultaneous information regions** with jargon ("Language heat," "Evidence state," "Pulse," "Counter-read," "markers"); (4) **no single dominant at-a-glance verdict** anywhere — the eye has nowhere obvious to land.

Score against the goal: **5 / 10.** Consumer-grade *intent* and polish are there; consumer-grade *legibility and focus* are not.

---

## 1. CLARITY OF SIGNALS

### 1a. The color + icon language exists and the intent is good
`lib/client/verdict-theme.ts` defines the canonical language and it is genuinely well-designed:
- 8 raw labels collapse to **5 consumer phrases**: TRUE/MOSTLY_TRUE → **"Supported"** (emerald), PARTIAL/MISLEADING → **"Mixed"** (amber), OMISSION → **"Mixed"** (orange), FALSE → **"False"** (rose), UNVERIFIABLE → **"No reliable backing"** (slate), OPINION → **"Opinion"** (violet).
- Stance icons ✓ / ✗ / ~ (`STANCE`), reputation tiers high/mid/low.
- `components/session/chips.tsx` adds **redundant iconography** (check, X, triangle-alert, half-circle, dash, question, quote, spinner) so signals are not color-only — good for colorblind users *in principle*.

### 1b. ...but there are FOUR different verdict vocabularies, and they disagree
This is the headline finding. The same claim is labeled differently depending on which component renders it:

| Source of truth | TRUE | MOSTLY_TRUE | PARTIAL | MISLEADING | OMISSION | FALSE | UNVERIFIABLE | OPINION |
|---|---|---|---|---|---|---|---|---|
| `verdict-theme.ts` (canonical) | Supported | Supported | Mixed | Mixed | Mixed | False | No reliable backing | Opinion |
| `chips.tsx` `VERDICT_LABEL` (**the live chip used in watch-view, activity-feed, evidence queue, claim cards**) | True | Mostly True | Partial | Misleading | Omission | False | No reliable backing | Opinion |
| `claim-row.tsx` | own hardcoded color map | | | | | | | |
| `claim-detail.tsx` `VERDICT_PILL` | own hardcoded color map ("bg-green-soft", "bg-orange-soft"…) | | | | | | | |

Consequences:
- A consumer sees **"Supported"** in the synthesis/TV read but **"Mostly True"** on the chip beside the very same claim. Two names for one thing = cognitive load and eroded trust.
- The **whole point of the 8→5 simplification in `verdict-theme.ts` is bypassed** by the chip that is actually rendered live everywhere. The taxonomy jargon ("Partial," "Misleading," "Omission") leaks straight to the consumer through `chips.tsx`.
- Four color maps means a palette change has to be made in four places and **they have already drifted** (theme uses Tailwind `emerald/rose/amber`; chips use CSS-var `--green #22C55E` / `--red #EF4444` / `--orange #C76B1F`). Sources: `lib/client/verdict-theme.ts:13`, `components/session/chips.tsx:21-46`, `components/session/claim-row.tsx:84-93`, `components/session/claim-detail.tsx:90-99`.

### 1c. Markers (inflammatory/manipulative) — a SEPARATE language exists, which is right, but it is weak at a glance
- `MarkerChip` (`chips.tsx:176`) uses a distinct color family: **fallacy = purple (#6A50C8), bias = amber (#F5E9CD/amber-2), rhetoric = pink (#C2407A)**. Good: markers will not be confused with true/false claims.
- **But the marker chip has NO icon** (unlike verdicts) and encodes severity only as a tiny uppercase word ("subtle/clear/blatant") at `opacity-70 text-[9px]`. So "this speech is inflammatory/blatant" is **not** glanceable — you must read 9px text. There is no shape/icon escalation for severity.
- A *third* signal vocabulary appears in `live-analysis-rail.tsx`: `LiveReadTone = calm | productive | contentious | misleading | heated | mixed`. A *fourth* live abstraction appears in `live-signal.tsx`: "Current read / Claim risk / Language heat / Evidence state / Live state / Pulse" with values "High / Rising / Calm / Caution / Cited / Needs backing / Quiet / Severe." None of these map 1:1 to the verdict words a user just learned. The user must hold **several parallel rating systems** in their head.

### 1d. Contrast / legibility / colorblind — fails the "without reading up close" / "across the room" test
Token values (`app/globals.css:121-132`): `--green #22C55E`, `--red #EF4444`, `--orange #C76B1F`, `--green-soft rgba(34,197,94,.16)`, `--red-soft rgba(239,68,68,.14)`.
- The live `VerdictChip` renders **`text-green` (#22C55E) on `bg-green-soft` (a 16% green wash over cream)** at `text-[10px]`. #22C55E on near-white is roughly **~1.9:1 contrast — far below the WCAG AA 4.5:1 minimum for text**, and it is 10px. Same problem for `text-red` #EF4444 on `red-soft`. **This is the single most-rendered signal in the product and it is hard to read up close, let alone glanceable.** (The `verdict-theme.ts` pills using emerald-800/rose-800 text are fine; the problem is the chip variant that's actually used in watch-view/activity-feed/queue.) Source: `components/session/chips.tsx:25-34`.
- **Green vs Red is the core true/false distinction and they are differentiated primarily by hue** — the classic red/green colorblind failure axis. Icons (✓ vs ✗) do mitigate this *if* legible, but at 10px saturated-on-pale they are weak.
- Marker severity is **color-and-tiny-word only**, no shape — a colorblind user cannot tell "blatant" from "subtle" at a glance.
- `--orange #C76B1F` ("Mixed/Partial") and `--red #EF4444` ("False") sit close on the hue wheel; for some users "Mixed" and "False" will be hard to separate.

**Net:** the signal *system* is thoughtfully designed but the *rendered execution* (size, contrast, four vocabularies, icon-less markers) defeats the glanceability goal.

---

## 2. COGNITIVE LOAD

### 2a. The Watch screen — the literal "watching a video" surface — is overloaded
`components/session/watch-view.tsx` stacks, top to bottom, **~7 distinct information regions on one screen**:
1. `WatchSourceHeader` — title + 4 metric pills (Player / Transcript / Claims / Markers).
2. `WatchSignalBoard` — **4 more signal cells** (Current read / Language heat / Evidence state / Live state), each with label + value + 2-line detail + colored bar.
3. The video player (with a speaker-colored 3px ring).
4. `EvidenceQueue` — up to 5 finding cards.
5. "Yentl's read" synthesis card.
6. A status bar (time · playing · "N claims · M markers").
7. The full scrolling transcript with inline annotation chips under each line.

That's **roughly 8 metric numbers + 4 abstract signal ratings + a synthesis paragraph + a queue + a live transcript**, all competing, before the user has understood a single verdict. For "watching a YouTube video and getting a clear at-a-glance signal," this is the opposite of focused — there is **no single dominant verdict element**; the eye has nowhere to land.

### 2b. The TV / "across the room" mode is also dense
`components/session/tv-dashboard.tsx` (the explicit room-mode) renders: a 4-tile metric row, **"Yentl's Read"** (big serif — good), **"Counter-read"** (Devil's Advocate, with "Challenge 1/2/3," "Weakest assumption," "Pressure-test"), **"Latest Claims"** (each with a 0–100 score in 4xl serif), **"Transcript Now,"** and **"Rhetoric Signals."** The big serif headline is genuinely glanceable; everything below it is **reading-distance content** (excerpts, scores, challenge lists) that nobody parses from a couch. The score numbers (`claim.score`, 0–100) are presented with no legend — a bare "62" in giant type signals nothing to a consumer.

### 2c. Jargon a normal consumer will not understand (all of these are user-facing today)
- **"Markers" / "Rhetoric Signals" / "rhetoric markers"** — the core inflammatory-content concept is named with a term no consumer uses. (Home page, TV, watch, tabs.)
- **"Language heat" / "Claim risk" / "Evidence state" / "Pulse" / "Current read"** — the live signal board's own coinages (`live-signal.tsx`).
- **"Counter-read" / "Devil's Advocate" / "Pressure-test" / "Weakest assumption"** — TV + claim detail.
- **"Mostly True / Partial / Misleading / Omission / No reliable backing / UNVERIFIABLE"** — raw taxonomy via `chips.tsx` / `claim-detail.tsx`.
- **"Provisional / Confirmed / Checking"** status pills (`ClaimCard`, `claim-detail.tsx:223`) — users don't know the difference.
- **"archetype: {…}"** rendered literally in `marker-row.tsx:144` — pure internal jargon leaking to UI.
- **"extraction_kind" / "pdf_text_layer" / "timed_text"**, **token / line counts**, **"Deepgram," "Anthropic," "Claude,"** **"reputation tier," "stance," "attribution / ownership"** — ingest panes, source-health card, consent gate.
- **"Yentl's Read" / "meta-read" / "factual grade" / "faith grade"** — synthesis card.

### 2d. Where it IS appropriately simple (credit where due)
- `listening-empty-state.tsx`: one pulsing dot + "Listening for first words…" + mic meter + skeleton hints. Excellent, glanceable, low-load.
- `synthesis-card.tsx`: large serif headline + good/mixed/bad color block + humble caveat — the single most consumer-legible signal in the app.
- The **source picker** groups 8 sources into 3 job buckets (Live / URL / File) with the subtitle "Start with Live, URL, or File" — good information scent (`source-picker.tsx:215-234`).
- `media-url` and `web-url` ingest panes are clean (URL + one button + smart routing).

---

## 3. FIRST-RUN / ONBOARDING (the first 10 seconds)

**On `/` (`app/page.tsx`):**
- Hero is clear and short: H1 **"Yentl checks what is being said."** + a ~45-word subtitle.
- **But the hero offers SIX competing buttons**: Start (header) + Start checking + Try guest demo + Read method + Room mode + Mobile app, plus a 5-item top nav. Two of them ("Start" and "Start checking") are duplicates. The single obvious action "point it at a video and watch signals" is **diluted across six choices**; there is no one dominant CTA.
- The hero's right-hand "Yentl's Read" mock uses **yet another** label vocabulary ("Mixed claims, strong rhetoric…", "Loaded language leads") — a 5th surface a first-timer has to decode.

**Clicking into `/session` (`app/session/page.tsx`):**
- First thing a guest hits is the **`ConsentGate`** — a non-dismissible modal with **4 required checkboxes** + GDPR Article 9 sensitive-data copy naming Deepgram/Anthropic. Legally appropriate, but it is a **wall before any value is shown**, and a hurried consumer may bounce. There is no "see it work first, consent at capture time" path.
- After consent, the user lands on the **source picker** (8 options in 3 groups). Reasonable, but it is still "pick a technical input," not "watch this demo."

**The frictionless path that should be primary is buried:** the best first-run is `?demo=validation&sample=cable_008&view=watch` (a pre-loaded multi-speaker, high-rhetoric clip) — but the home page sends new users to `/demo` (a *text* claim about bike lanes) or to the cold source picker, not to a pre-loaded watch session. **The product's most glanceable moment is not what a new user is pointed at.**

---

## 4. THE "WATCHING-A-VIDEO" EXPERIENCE (live signal surfacing)

- **Mechanism is sound:** `watch-view.tsx` releases YouTube caption lines against the playhead (`RELEASE_LOOKAHEAD_SEC 0.35`, max 4/tick), highlights the current line (teal ring + ▶), auto-scrolls it to center, and anchors claim/marker chips under the line they belong to (with a deliberate "no future-line spoilers" rule). Seeking from any finding back to its moment works (`EvidenceQueue`, annotation rows). This is good engineering and the **time-to-signal is tied to playback**, which is correct.
- **But the real-time signal is delivered as small inline chips + a 4-cell board that updates quietly.** There is **no large, motion-cued, glanceable "verdict just landed" moment** synced to the spoken sentence. Watching across the room, you would not notice that a FALSE claim or a "blatant" marker just occurred — it appears as a 10px low-contrast chip in a scrolling column and a small value flip in the signal board.
- The `newFinding`/"Pulse" signal *does* pulse a dot (`motion-safe:animate-pulse`), but it's a 2px dot in one of several cells — not a headline event.
- Synthesis only refreshes on a 4s debounce after caption releases; the live "read" lags the moment and is text, not a glanceable state.

**Conclusion:** the live experience is a *readable annotated transcript*, not a *glanceable signal overlay*. To match "watching a YouTube video and getting clear at-a-glance signals," the live verdict needs to be a **single large, color-dominant, briefly-animated element** tied to the current sentence — which does not exist today.

---

## 5. INFORMATION ARCHITECTURE — too many overlapping surfaces

Distinct ways to view essentially the same session data:
1. `/session` **Overview** (`home-overview.tsx`: synthesis + 4 tiles + topic strip + source-health + activity feed).
2. `/session?view=watch` (`watch-view.tsx`: header + 4-tile + signal board + player + queue + synthesis + transcript).
3. `/session?view=claims`, `?view=markers`, `?view=transcript`, `?view=source` (filtered lists / review).
4. `/session/detail/{claim|marker|source}/{id}` (deep detail pages).
5. `/session/learn/{claim|marker}/{id}` (educational pages).
6. `/tv` room mode (`tv-dashboard.tsx`).
7. The Chrome extension panel (`extension-panel-view.tsx`, `ExtensionSignalStrip`).
8. Internal dashboards `az-flow-dashboard.tsx` (242 KB), `ux-flow-dashboard.tsx` (103 KB), `visual-evidence-dashboard.tsx` — these are dev/spec atlases at `/project/flows`, not consumer surfaces, but they add to the conceptual sprawl.

**Overlap is heavy:** Overview, Watch, and TV each independently render "the metrics + Yentl's read + recent findings" with **different layouts, different signal vocabularies, and different verdict labels**. A consumer crossing between them re-learns the UI each time. The synthesis ("Yentl's Read") is the one element that should be the spine across all surfaces, and it nearly is — but it's surrounded by three different supporting-signal systems.

---

## 6. TOP 10 CONCRETE UX ISSUES (blocking "simple + glanceable")

| # | Severity | Issue | Component(s) | Recommended simplification |
|---|---|---|---|---|
| 1 | **Critical** | **Four verdict vocabularies disagree** — same claim is "Supported" / "True" / "Mostly True". Defeats the 8→5 simplification; leaks taxonomy jargon to consumers. | `chips.tsx:36-46`, `verdict-theme.ts`, `claim-row.tsx:84`, `claim-detail.tsx:90` | Make `verdict-theme.ts` the **single source**; `VerdictChip` must render its `.short` ("Supported/Mixed/False/Opinion/No reliable backing"). Delete the other 3 maps. |
| 2 | **Critical** | **Live VerdictChip fails contrast** — 10px saturated text (#22C55E / #EF4444) on same-hue pale wash; unreadable up close, invisible across a room. | `chips.tsx:25-34`, `globals.css:121-132` | Use solid saturated fills with white/near-black text (or the emerald-800/rose-800 pattern from theme); bump size; this is the most-rendered signal — it must pass AA. |
| 3 | **Critical** | **No single dominant verdict** on Watch/Overview — eye has nowhere to land among 8 numbers + 4 signal cells + queue + transcript. | `watch-view.tsx`, `live-signal.tsx` | Promote ONE big, color-dominant "Current read" verdict element (like the synthesis headline) to hero position; demote the rest behind a "details" disclosure. |
| 4 | **High** | **Markers aren't glanceably "inflammatory"** — no icon, severity is 9px word; three marker colors + separate "Language heat" abstraction. | `chips.tsx:176-211`, `marker-row.tsx`, `live-signal.tsx:216` | Give markers a single bold icon (e.g. flame/⚠) that scales/reddens with severity; show one consumer word ("Inflammatory language") not "rhetoric markers." |
| 5 | **High** | **Live signal has no glanceable "it just happened" moment** synced to the spoken sentence. | `watch-view.tsx`, `live-signal.tsx` | Add one large, briefly-animated verdict banner pinned to the current line as each claim/marker resolves. |
| 6 | **High** | **Consent wall before any value** (4 required checkboxes, processor jargon) is the first thing a guest sees. | `ConsentGate.tsx`, `app/session/page.tsx` | Let guests watch a pre-loaded demo first; gate consent at the moment of actual capture, with a 1-line plain recap. |
| 7 | **High** | **Jargon everywhere** — "markers, Language heat, Pulse, Counter-read, Provisional/Confirmed, archetype, extraction_kind." | `live-signal.tsx`, `tv-dashboard.tsx`, `marker-row.tsx:144`, ingest panes | Replace with plain words (Inflammatory / Checking / Devil's-advocate → "Other side"); hide `archetype`, `extraction_kind`, token counts entirely. |
| 8 | **High** | **TV mode isn't couch-glanceable** — bare 0–100 scores with no legend, challenge lists, excerpts at reading distance. | `tv-dashboard.tsx` | Reduce to: giant verdict word + count of false/inflammatory + the single latest finding as a big colored card. Drop scores or label them. |
| 9 | **Medium** | **Six competing hero CTAs** (two duplicates) dilute the "watch a video" path. | `app/page.tsx:145-200` | One primary CTA ("Watch a demo") → pre-loaded watch session; collapse the rest into a secondary row. |
| 10 | **Medium** | **Three+ overlapping "read" layouts** (Overview / Watch / TV) re-render the same data with different vocab + labels. | `home-overview.tsx`, `watch-view.tsx`, `tv-dashboard.tsx` | Standardize one verdict spine + one signal vocabulary across all three; differ only in size/density. |

Additional (lower-priority) notes: no global `prefers-reduced-motion` strategy beyond ad-hoc `motion-safe:` (Aurora/BorderGlow in `live-analysis-rail.tsx` animate); several `bg-muted/60 + text-foreground/70` light-on-light chips in `ClaimCard`; `browser-tab` and `text-doc` ingest panes are support-article-dense.

---

## SCREEN & STATE INVENTORY (drive-the-browser checklist)

Notes for the screenshot agent:
- **Demo/validation deep-links** are the fastest way to populate real states. Watch samples: `solo_005` (clean single-speaker, 2 claims/0 markers), `cable_008` (multi-speaker, 1 claim/**5 markers** — best for the "inflammatory" look), `israel_010` (14 claims/4 markers, provisional verification), `source_quote_anchors` (Source review), `media_playback_sync` (audio playback), `extension_snapshot` (extension/browser-tab overview).
- **View param** appended to a session URL: `&view=overview|watch|claims|markers|transcript|source`.
- **Source picker / ingest panes**: `/session?source=youtube|web-url|media-url|audio-file|text-doc|claim|browser-tab|mic`.
- **TV**: `/tv?demo=validation&sample=...&view=...`.
- Capture **desktop AND a ~390px mobile viewport** for every `/session` and `/tv` state. Where a verdict/severity variant is listed, trigger it via the sample that contains it (`israel_010` for mixed/provisional, `cable_008` for blatant markers).

### A. Marketing / onboarding
- [ ] `/` hero (desktop) — H1 + 6 CTAs + "Yentl's Read" mock. Trigger: load root.
- [ ] `/` hero (mobile, ~390px) — confirm CTA stacking / nav collapse.
- [ ] `/` sections: `#examples`, `#ways-in`, `#method`, `#features`, `#trust`, `#pricing`, `#faq` (FAQ first item open). Scroll-anchor each.
- [ ] `/demo` (desktop + mobile) — guest-mode hero, "Open sample text" vs "Choose another source."
- [ ] `/mobile` (desktop + mobile) — platform-truth grid (iOS/Android/PWA).

### B. Session entry / consent / source picker
- [ ] `/session` first load → **ConsentGate** modal (4 required + 1 optional checkbox, GDPR box). Trigger: open `/session` with no prior consent (fresh/incognito).
- [ ] ConsentGate **Decline** state. Trigger: click Decline.
- [ ] Source picker, all 8 cards in 3 groups (Live / URL / File). Trigger: accept consent.
- [ ] Source picker **mobile** copy variant (e.g. "Current tab" → mic fallback note). Trigger: open on mobile UA.

### C. Ingest panes (each via `/session?source=…`)
- [ ] `youtube` — idle (empty player shell + URL box). 
- [ ] `youtube` — checking / launching / **armed** / importing / **live** (paste a captioned URL and step through; or use `cable_008` to land post-import).
- [ ] `youtube` — error: INVALID_URL, NO_CAPTIONS, PRIVATE (paste bad/captionless/private URLs).
- [ ] `youtube` — tab-audio-capture sub-states: starting / capturing / error.
- [ ] `web-url` — idle / fetching / done / error (SSRF_BLOCKED, UNSUPPORTED_PAGE, NO_READABLE_TEXT, PAGE_TOO_LARGE); also "YouTube/direct-media detected" auto-route hint.
- [ ] `media-url` — idle / processing / done / error (SSRF_BLOCKED, UNSUPPORTED_MEDIA, TRANSCRIBE_FAILED); readiness card variants.
- [ ] `audio-file` — idle / **drag-hover** / file-selected / probing / uploading (progress %) / processing / done / error (unsupported, too_large, too_long, transcribe_failed).
- [ ] `text-doc` — idle / paste-typed / file-selected (TXT/MD/DOCX/PDF/SRT/VTT) / extracting / document-outline shown / with-speakers toggle / error (PDF no-text-layer).
- [ ] `claim` — idle (two textareas) / initial-stage / source-stage / **too-vague** validation / **duplicate** detected / checking → redirect; mobile sheet status.
- [ ] `browser-tab` — idle (extension check) / waiting_for_extension / error (no_audio_detected, tab_changed).
- [ ] `mic` → `mic-prerecord-pane` — device selector + consent checkbox + "Before recording" checklist (idle).

### D. Live session — empty states
- [ ] `/session?source=mic` after start, no transcript → **ListeningEmptyState** (pulsing dot, mic meter, skeleton). 
- [ ] `/session?source=browser-tab` after start, no audio → **BrowserTabEmptyState** (connected / waiting / error).

### E. Core workspace views (use a populated sample)
- [ ] Overview populated — `/session?demo=validation&sample=israel_010&view=overview` (synthesis + 4 tiles + topic strip + source-health + activity feed). Desktop + mobile.
- [ ] **Watch populated** — `/session?demo=validation&sample=cable_008&view=watch` (player + 4 metric pills + signal board + evidence queue + synthesis + live transcript w/ inline chips). **The key glanceability screen.** Desktop + mobile.
- [ ] Watch — synced/playing state vs ready/paused (press play; also `&t=NN` to seek).
- [ ] Watch — audio-only variant — `…&sample=media_playback_sync&view=watch`.
- [ ] Claims list — `…&sample=israel_010&view=claims` (filter dropdown open + closed).
- [ ] Markers list — `…&sample=cable_008&view=markers` (filter by type).
- [ ] Transcript — `…&sample=israel_010&view=transcript`.
- [ ] Source review — `…&sample=source_quote_anchors&view=source` (quote-anchor highlights).

### F. Signal/verdict variants (screenshot each label + severity)
- [ ] VerdictChip: TRUE, MOSTLY_TRUE, PARTIAL, MISLEADING, OMISSION, FALSE, UNVERIFIABLE, OPINION, **CHECKING** (spinner). `israel_010` carries the mix; checking appears transiently during live release.
- [ ] Claim **status** pills: Checking / Provisional / Confirmed.
- [ ] MarkerChip: fallacy / bias / rhetoric × severity subtle / clear / blatant (`cable_008` for blatant).
- [ ] Signal board cells (Watch): Current read, Language heat, Evidence state, Live state — across green/amber/red/neutral tones.

### G. Detail & learn pages
- [ ] `/session/detail/claim/{id}` — full claim detail (verdict hero + score bar + "Why" + evidence status + source dossier + Devil's-Advocate + actions). Pick a claim id from `israel_010`.
- [ ] `/session/detail/claim/{id}` — disputed/review-flag variant.
- [ ] `/session/detail/marker/{id}` — marker detail (type pill + severity + "Why flagged"). Id from `cable_008`.
- [ ] `/session/detail/source/{id}` — source detail (thumbnail vs no-thumbnail fallback).
- [ ] `/session/learn/claim/{id}` — claim learn-more.
- [ ] `/session/learn/marker/{id}` — marker learn-more (definition, "How to spot it," archetype animation **and** reduced-motion variant; toggle OS reduced-motion).

### H. Dialogs (open each from session TopControls)
- [ ] **SaveSessionDialog** — open + success/confirmation (auto-closes ~1.2s).
- [ ] **ExportDialog** — open; toggle each format Report / Markdown / Transcript / JSON; Preview expanded.
- [ ] **EndSessionDialog** — open (save/export reminder).
- [ ] **SourceSwitchDialog** — open during active session (shows counts; "save first" prompt).
- [ ] **ConsentGate** — (already in B) the heaviest dialog.

### I. TV / room mode
- [ ] `/tv` empty → **EmptyRoomMode** (no session). 
- [ ] `/tv?demo=validation&sample=cable_008` — populated (4 tiles + Yentl's Read + Counter-read + Latest Claims w/ scores + Transcript Now + Rhetoric Signals). **The "across the room" screen — capture at 1080p and assess legibility from a distance.**
- [ ] `/tv?demo=validation&sample=solo_005` — low-marker variant (Rhetoric Signals empty state).
- [ ] `/tv` mobile — confirm it degrades sanely.

### J. Extension panel (if reachable in browser)
- [ ] `extension-panel-view` via `…&sample=extension_snapshot&view=overview` — ExtensionSignalStrip (Claim risk / Language heat / Evidence state / Pulse compact cells) + tabs (Transcript / Claims / Markers).

---

## APPENDIX — files read for this audit
Signal core: `lib/client/verdict-theme.ts`, `components/session/chips.tsx`, `components/session/live-signal.tsx`, `components/session/live-analysis-rail.tsx`, `app/globals.css` (tokens).
Workspace: `components/session/watch-view.tsx`, `home-overview.tsx`, `session-shell.tsx`, `synthesis-card.tsx`, `activity-feed.tsx`, `topic-strip.tsx`, `listening-empty-state.tsx`.
Glanceable modes: `components/session/tv-dashboard.tsx`, `app/tv/page.tsx`.
Claims/markers (via sub-agent): `ClaimCard.tsx`, `claim-row.tsx`, `claim-detail.tsx`, `MarkerChip.tsx`, `marker-row.tsx`, `marker-detail.tsx`, learn-more pair, `VerdictCard.tsx`.
Ingest (via sub-agent): `source-picker.tsx`, all `ingest-panes/*`.
Onboarding (via sub-agent): `app/page.tsx`, `app/demo/page.tsx`, `app/mobile/page.tsx`, `app/session/page.tsx`, dialogs (`Consent/End/Export/Save/SourceSwitch`).
Spec + fixtures: `docs/superpowers/specs/2026-05-21-yentl-complete-flow-spec.md`, `lib/validation/fixtures.ts`.
