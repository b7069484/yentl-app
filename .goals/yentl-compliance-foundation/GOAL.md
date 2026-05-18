# Goal: Yentl Compliance — Umbrella (Group A + Integration)

**Slug**: `yentl-compliance-foundation`
**Owner**: Israel B. Bitton (b7069484@gmail.com)
**Locked**: 2026-05-17 (originally) · **Narrowed**: 2026-05-18 (split into sub-goals)
**Status**: active

> Originally covered all 28 clauses; split on 2026-05-18 into 5 parallel sub-goals (`yentl-compliance-{ai-transparency,a11y,trust-pages,verdict-scaffold,docs}`). This umbrella retained: **Group A (consent UX extensions)** and **Group G (cross-goal integration check + CHANGELOG / README rollups)**.

---

## Objective

Cover the slices of the compliance foundation that don't fit neatly into the 5 sibling sub-goals:
- **Group A** — consent UX extensions that wrap around `ConsentGate` and `RecordingBeacon` (from `yentl-this-week-actions`): Pause>End hierarchy fix, SessionTimer 30-min toast, TwoPartyDisclosure banner, AudioRouteDisclosure popover
- **Group G** — integration check: confirms all 5 sibling sub-goals report Status: done in their STATE.md; rolls up CHANGELOG.md entries; adds README "Compliance & Trust" section

## End condition (THE LITERAL TEXT `/goal` EVALUATES)

> ALL of the following are simultaneously true and verified by running the listed commands during the same /goal session, outputs surfaced in chat:
>
> **Group A — consent UX extensions:**
>
> 1. **Pause > End hierarchy fix**: `components/session/SessionHeader.tsx` refactored so the Pause button is the **primary** action (filled brand-blue `#2563EB`, larger size, default focus target) and End is the **destructive-secondary** action (outlined, smaller). Test in `tests/session-header.test.tsx` verifies Pause has primary class, End has destructive-outline class.
>
> 2. **Long-session re-confirmation toast**: A `<SessionTimer>` component (e.g., `components/session/session-timer.tsx`) fires a toast at 30:00 of any active session with verbatim text "Still rolling at 30:00. Pause anytime." (from research §8 Brand-Voice Copy). Use the project's toast library (sonner if installed by a sibling goal; install if needed — pre-approved). Test verifies toast fires at 30:00 with fake timers, doesn't fire while paused, text is verbatim.
>
> 3. **Two-party consent disclosure banner**: `<TwoPartyDisclosure>` component shown on first session via localStorage flag `yentl.two_party_seen`. Verbatim text from research §8: "Heads up — recording the people around you may need their consent. Yentl doesn't know where you are; you do." Dismissible. Renders inside the session view (above transcript). Test verifies appears when flag absent, doesn't when present, dismissing sets the flag.
>
> 4. **Audio route disclosure popover**: `<AudioRouteDisclosure>` accessible via "i" icon adjacent to RecordingBeacon (from `yentl-this-week-actions`). Opens popover explaining audio chain (browser → Deepgram → Anthropic Claude; no audio stored on Yentl servers). Test verifies popover opens on icon click and contains key terms (Deepgram, Anthropic, no-storage). NOTE: this clause depends on RecordingBeacon existing on origin/main — if absent, mark blocked-pending-dependency and proceed with clauses 1-3.
>
> **Group G — integration check (waits for sub-goals):**
>
> 5. **All 5 compliance sub-goals report Status: done**. Verified by reading STATE.md on each of the 5 sub-goal branches on origin:
>    - `git show origin/goals/yentl-compliance-ai-transparency:.goals/yentl-compliance-ai-transparency/STATE.md` shows `Status: done`
>    - `git show origin/goals/yentl-compliance-a11y:.goals/yentl-compliance-a11y/STATE.md` shows `Status: done`
>    - `git show origin/goals/yentl-compliance-trust-pages:.goals/yentl-compliance-trust-pages/STATE.md` shows `Status: done`
>    - `git show origin/goals/yentl-compliance-verdict-scaffold:.goals/yentl-compliance-verdict-scaffold/STATE.md` shows `Status: done`
>    - `git show origin/goals/yentl-compliance-docs:.goals/yentl-compliance-docs/STATE.md` shows `Status: done`
>    If any sub-goal is not yet done, this clause is BLOCKED and the worker exits without completing the goal. (The worker will retry on next fire.)
>
> 6. **CHANGELOG.md root rollup**: Project root `CHANGELOG.md` (created by `yentl-hardening-pass` clause 11 OR this goal if hardening hasn't yet) contains a section dated 2026-05-17 (or later) titled "Compliance foundation" enumerating: every component added by ANY of the 5 sub-goals + every doc + every config change. Verified by grep for the section heading.
>
> 7. **README has "Compliance & Trust" section**: Project root `README.md` has a `## Compliance & Trust` section covering: consent flow overview (link to ConsentGate), trust pages map (links to all 6 trust pages + /accessibility), accessibility posture (WCAG 2.2 AA conformance status), DPIA reference (link to `docs/dpia.md`), engagement-gate spec reference (link to `docs/engagement-gate.md`), how to report issues.
>
> 8. **Working tree clean + branch synced**: `git status --porcelain` empty; all worker commits prefixed `compliance:`; branch rebases cleanly onto `origin/main`.

## Success criteria

- [ ] (1) Pause > End fix in SessionHeader + test
- [ ] (2) SessionTimer toast + tests
- [ ] (3) TwoPartyDisclosure banner + tests
- [ ] (4) AudioRouteDisclosure popover + test (depends on RecordingBeacon)
- [ ] (5) All 5 sub-goals report Status: done
- [ ] (6) CHANGELOG.md "Compliance foundation" section
- [ ] (7) README.md "Compliance & Trust" section
- [ ] (8) Clean tree + rebased

## Out of scope

- **The 35 clauses moved to sibling sub-goals**:
  - Group B (AI transparency: AIGeneratedBadge, AIDisclosureFooter) → `yentl-compliance-ai-transparency`
  - Group C (WCAG 2.2 AA baseline) → `yentl-compliance-a11y`
  - Group D (7 trust pages) → `yentl-compliance-trust-pages`
  - Group E (verdict + report scaffold) → `yentl-compliance-verdict-scaffold`
  - Group F (DPIA + accessibility statement + engagement-gate policy) → `yentl-compliance-docs`
- **The 6 clauses in `yentl-this-week-actions`** (ConsentGate, RecordingBeacon, Deepgram config, DPA doc)
- **Fact-check pipeline** (Tasks 12–26), including engagement-gate runtime
- **Brand asset modifications**, rebrand
- **`app/api/deepgram/**`** beyond reading
- **Push to `origin/main`**, PR ops
- **Major dep upgrades**

## Context / references

- `./GOAL.md`, `./guardrails.md`, `./STATE.md`, `./decisions.log`
- Research: `.project/research/yentl-expansion-research.html` §8 Pattern 2 (consent extensions), §8 Brand-Voice Copy (verbatim banner + toast text)
- Existing code: `components/session/SessionHeader.tsx`, `components/session/recording-beacon.tsx` (from this-week-actions if present)
- Sibling sub-goals' STATE.md on their respective `goals/<slug>` branches — clause 5 reads these
- `CHANGELOG.md` and `README.md` at project root — clauses 6, 7

## Budget

- Max cost: $30 · Max wall-clock days: 7 · Max runs: 15 · Per-run cap: $3
