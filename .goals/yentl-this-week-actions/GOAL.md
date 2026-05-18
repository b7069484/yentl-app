# Goal: Yentl "This Week" Actions

**Slug**: `yentl-this-week-actions`
**Owner**: Israel B. Bitton (b7069484@gmail.com)
**Locked**: 2026-05-17
**Status**: draft

> Change Status to `active` once cron is registered. Values: `draft | active | paused | done | abandoned`.

---

## Objective (the WHY)

Ship the **three "this week" actions** identified in the expansion research (§10 Founder Summary, 2026-05-17) as a tight, time-sensitive autonomous goal:

1. **Disable Deepgram diarization** — single highest-impact technical decision for US biometric/BIPA exposure ($1k–$5k *per recording* statutory damages under the 2025–2026 voiceprint case wave: Brewer v. Otter.ai, Cruz v. Fireflies.AI).
2. **Switch Deepgram to its EU endpoint** for EU-detected traffic — zero-cost, unlocks lawful EU use under GDPR cross-border-transfer rules.
3. **Sign DPAs with Deepgram + Anthropic** — zero-cost paperwork; the worker prepares the documentation, humans sign (clause 3 is approval-gated).
4. **Ship the launch consent modal** — single biggest compliance lever. One UX satisfies: GDPR Art 6(1)(a) + 7 + 9(2)(a), AI Act Art 50(1) (interaction with AI), recording-consent third-party-disclosure UX, Apple 5.1.2(i) (third-party AI consent — clarified Nov 2025).
5. **Ship the recording beacon** — the disclosure UX the consent modal points at. Without it, the modal is meaningless: two-party-consent states (12 of them, 35% of US population) require *persistent* visual indication of recording, not just a one-time consent.

These five items map directly to Top Risks #2 (AI Act Art 50 binding Aug 2, 2026), #3 (BIPA diarization), #4 (GDPR Art 9 explicit consent), and #5 (CA Penal Code §632 recording consent). Defamation (Top Risk #1) is addressed in `yentl-compliance-foundation` (engagement gate policy) and the fact-check pipeline goal (engagement gate runtime).

**Why now**: BIPA exposure is per-recording-per-day. Every recording made with diarization enabled accrues potential damages. AI Act Art 50 binds August 2, 2026 — 11 weeks from goal-lock date.

## End condition (THE LITERAL TEXT `/goal` EVALUATES)

> ALL of the following are simultaneously true and have been verified by running the listed commands during the same /goal session, with the outputs surfaced into the chat transcript so the evaluator can see them:
>
> 1. **Diarization explicitly OFF in code**: `lib/client/deepgram-stream.ts` builds its WebSocket URL with `diarize=false` explicitly present in the URLSearchParams. `lib/server/deepgram.ts`'s token grant call does not enable diarization in any options object. Verified by:
>    - `grep -rE "diariz" lib/ app/ components/` shows ONLY `diarize=false` (or `diarize: false`) and ONLY in `lib/client/deepgram-stream.ts` and possibly `lib/server/deepgram.ts`. No occurrence of `diarize=true`, `diarize: true`, `diarization: true` anywhere.
>    - A test in `tests/deepgram-config.test.ts` constructs the URL the client would build and asserts `searchParams.get('diarize') === 'false'`.
>
> 2. **EU endpoint switchable via env var**: A helper function `getDeepgramWsUrl()` (either inline in `lib/client/deepgram-stream.ts` or in a new file `lib/client/deepgram-endpoint.ts`) selects between:
>    - `wss://api.deepgram.com/v1/listen` (default US)
>    - `wss://api.eu.deepgram.com/v1/listen` (when env var indicates EU)
>    Based on `process.env.NEXT_PUBLIC_DEEPGRAM_REGION` with values `us | eu` (default `us`). Unknown values fall back to `us` with a `console.warn`.
>    - `.env.example` documents `NEXT_PUBLIC_DEEPGRAM_REGION` with a one-line comment explaining the values and why (GDPR cross-border transfer compliance).
>    - Tests in `tests/deepgram-config.test.ts` verify: (a) default → US URL, (b) `eu` → EU URL, (c) `invalid` → US URL with warning, (d) `eu` URL still includes `diarize=false`.
>
> 3. **DPA-status doc exists with full structure**: `docs/dpa-status.md` exists at the project root and contains:
>    - **Table** with rows for Deepgram, Anthropic, Vercel; columns: Status (`Not Started | In Progress | Signed | Date Signed`), Portal URL, Contact, Notes. Initial Status for all three may be `Not Started`.
>    - Section **"What to verify in each DPA"** listing: Standard Contractual Clauses (SCCs) included, sub-processor list disclosed, deletion-on-request mechanism, encryption-in-transit confirmed, breach-notification SLA stated, EU-US Data Privacy Framework certification (where applicable).
>    - Section **"Anthropic-specific note"**: per research §7 (GDPR), Anthropic's commercial Terms of Service auto-incorporate DPA + SCCs effective Jan 1, 2026 — confirm this is the case for our account, no separate signature needed unless on Anthropic Enterprise.
>    - Section **"Vercel-specific note"**: Vercel DPA is signed via the Vercel dashboard (link to dashboard path).
>    - Section **"Human-action checklist"** with checkboxes: `[ ] Deepgram DPA signed`, `[ ] Anthropic DPA confirmed`, `[ ] Vercel DPA confirmed`, `[ ] Deepgram EU endpoint enabled for EU-region traffic in production env vars`, `[ ] Disable Deepgram diarization on the Deepgram dashboard as backup defense (in addition to code default)`.
>    - The doc is committed; the worker DOES NOT and CANNOT sign anything — clause 3 completes when the *document* is in this shape.
>
> 4. **Launch consent modal**: `components/session/ConsentGate.tsx` exists and implements:
>    - A modal/dialog rendered when the user first attempts to start a session, before `getUserMedia` is called
>    - **Three required checkboxes** (no pre-ticks per GDPR Art 7):
>      - "Microphone capture + transcription via Deepgram (US-based by default; EU users routed to api.eu.deepgram.com)"
>      - "AI analysis by Anthropic (Claude) — claim fact-checking and bias/fallacy detection"
>      - "Web search by Anthropic for source citations"
>    - **One required age affirmation** (default OFF, no pre-tick): "I am 13 or older"
>    - **One optional checkbox** (default OFF): "Anonymous usage analytics (no audio, no transcripts)"
>    - **Explicit Article-9 disclosure** in modal body (verbatim or close paraphrase):
>      > "This conversation may reveal sensitive information about you or others, including political views, health, religion, sexual orientation, or ethnicity. By continuing you give explicit consent under GDPR Article 9(2)(a) to this processing."
>    - **No-persistence commitment** in modal body (verbatim or close paraphrase):
>      > "Yentl does not store audio or transcripts on its servers in v1. Audio streams directly from your browser to Deepgram. AI analysis happens in memory and is discarded when you end the session."
>    - A **Continue** button (primary) that is disabled until all 4 required checkboxes are checked
>    - A **Decline** button (secondary) that closes the modal and does NOT start the session
>    - On Continue: writes to localStorage key `yentl.consent` a record matching this TypeScript shape:
>      ```ts
>      { consent_id: string /* ULID */; choices: { mic_stt: boolean; ai_analysis: boolean; web_search: boolean; age_13plus: boolean; analytics: boolean }; version: "1"; timestamp_iso: string; locale: string }
>      ```
>    - On subsequent session start: if `yentl.consent` exists, version matches `"1"`, and all 4 required choices are `true`, skip the modal; otherwise re-show.
>    - `app/session/page.tsx` wraps its existing `start()` function so that `getUserMedia` and `openDeepgramStream` are called ONLY after `ConsentGate` returns granted.
>    - Tests in `tests/consent-gate.test.tsx` cover:
>      - (a) Modal renders when no `yentl.consent` exists
>      - (b) Continue button is disabled until all 4 required boxes are checked
>      - (c) Decline closes modal without calling start
>      - (d) Continue writes localStorage with the correct shape (validate with Zod schema in the test)
>      - (e) Subsequent render with valid localStorage skips the modal
>      - (f) Version mismatch in localStorage re-shows the modal
>
> 5. **Recording beacon**: `components/session/RecordingBeacon.tsx` exists and implements:
>    - A fixed-position element (e.g. top-right or bottom-right of viewport) visible whenever `useSession().recording === true`
>    - A pulsing red dot — uses Tailwind `animate-pulse` AND the `motion-reduce:animate-none` variant for `prefers-reduced-motion` users
>    - A live timer showing `REC HH:MM:SS` counting up from session start (uses session start timestamp from store)
>    - An **End session** button (primary, accessible — minimum 44×44 touch target, visible focus ring)
>    - Rendered in `app/session/page.tsx` (or `app/layout.tsx` if the team prefers app-wide visibility — either is acceptable)
>    - Includes `aria-live="polite"` announcement: when recording starts → "Recording started"; when stops → "Recording stopped"
>    - Tests in `tests/recording-beacon.test.tsx` cover:
>      - (a) Renders when `session.recording === true`
>      - (b) Does not render when `session.recording === false`
>      - (c) Timer increments per second (with fake timers)
>      - (d) End button click calls `session.endSession()`
>      - (e) Has `motion-reduce:animate-none` class for reduced motion
>      - (f) aria-live region present
>
> 6. **Working tree clean and rebased**: `git status --porcelain` returns empty (all worker-created changes committed). All worker commits on the working branch use message prefix `this-week:`. Branch rebases cleanly onto `origin/main` (`git fetch origin && git rebase origin/main` succeeds, OR `git merge-base --is-ancestor origin/main HEAD` returns 0).

## Success criteria (auditable checklist)

- [ ] (1) Diarization explicitly OFF in client + server + grep clean + test passing
- [ ] (2) EU endpoint switchable via `NEXT_PUBLIC_DEEPGRAM_REGION` + `.env.example` updated + 4 tests passing
- [ ] (3) `docs/dpa-status.md` exists with table + 5 sections + checklist
- [ ] (4) `ConsentGate.tsx` exists, integrated into `app/session/page.tsx`, 6 tests passing
- [ ] (5) `RecordingBeacon.tsx` exists, rendered when recording, 6 tests passing
- [ ] (6) Working tree clean, all commits prefixed `this-week:`, rebased on origin/main

## Out of scope (anti-goals)

- **No rebrand** (factify → yentl renames stay frozen — separate goal with downstream DNS/Vercel implications)
- **No touching `app/api/deepgram/**`** beyond reading. The JWT mint path is stable; do not modify the route handler.
- **No fact-check pipeline work** (Tasks 12–26) — separate track.
- **No other v1 compliance components** (Pause>End hierarchy fix, SessionTimer 30-min toast, AIGeneratedBadge, AIDisclosureFooter, TwoPartyDisclosure banner, AudioRouteDisclosure popover, the 7 trust pages, WCAG audit, etc.) — those are in `yentl-compliance-foundation`.
- **No DPA signing by the worker** — that is a human-only action (clause 3 prepares the doc; humans sign via vendor portals).
- **No push to `origin/main`**, no PR creation/merge.
- **No major dependency upgrades**. Patch/minor only if required to make a clause pass.
- **No new top-level dependencies** other than possibly `ulid` (which is ALREADY in package.json ^3.0.2 — verify before adding).
- **No modifications to the brand assets** under `.project/` or `public/`.
- **No file modifications outside `/Users/israelbitton/Live FactCheck/`**.

## Context / references

- `./GOAL.md` — this file (locked end condition)
- `./guardrails.md` — allow/deny lists scoped to this goal
- `./STATE.md` — last run's progress
- `./decisions.log` (last 50 lines) — recent decisions
- **Research source of truth**: `/Users/israelbitton/Live FactCheck/.project/research/yentl-expansion-research.html` (currently in `crazy-robinson-52cde0` worktree; will be on `main` after merge)
  - §4 X Integration — pricing context
  - §7 Regulatory Landscape — GDPR Art 6/7/9, AI Act Art 50, BIPA, recording consent
  - §8 UI/UX Patterns — ConsentGate, ConsentLedger, MicGate (Pattern 1), RecordingBeacon, Pause>End (Pattern 2)
  - §10 Founder Summary — the three "this week" actions
  - §11 Sources — citation list
- **Current code (worker reads each run)**:
  - `lib/client/deepgram-stream.ts` — URL + params live here (line 30 hardcodes US URL)
  - `lib/server/deepgram.ts` — JWT mint (`auth.v1.tokens.grant`)
  - `lib/client/mic.ts` — `getUserMedia({ audio: true })`
  - `app/session/page.tsx` — where `start()` calls mic + Deepgram; wrap with ConsentGate
  - `components/session/SessionHeader.tsx` — peer component (do NOT refactor here — Pause>End is in compliance-foundation)
  - `lib/client/session-store.ts` — Zustand store; may extend with consent state
  - `lib/types.ts` — shared types
  - `.env.example` — env var docs (currently lists `DEEPGRAM_API_KEY`, `DEEPGRAM_PROJECT_ID`)
  - `tests/` — existing tests (smoke, reputation, dedup, taxonomy); new tests go here
- **Reference docs**:
  - Deepgram EU endpoint: https://api.eu.deepgram.com/v1/listen (same path, different host)
  - Deepgram diarization param docs: https://developers.deepgram.com/docs/diarization
  - GDPR Art 7 (consent conditions): https://gdpr.eu/article-7-conditions-for-consent/
  - AI Act Art 50: https://artificialintelligenceact.eu/article/50/

## Budget

- **Max cost (USD)**: $10.00 (small, urgent — keep tight)
- **Max wall-clock days**: 3
- **Max worker runs**: 8
- **Per-run cost cap**: $2.00

> If the goal doesn't converge in 8 runs, something is wrong with the clauses — split or rewrite, don't extend budget. The recommended split would be: (a) diarization+EU+DPA-doc as one goal (technical), (b) ConsentGate+RecordingBeacon as a second goal (UI).
