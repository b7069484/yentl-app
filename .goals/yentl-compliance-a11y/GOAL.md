# Goal: Yentl Compliance — WCAG 2.2 AA Baseline (Group C)

**Slug**: `yentl-compliance-a11y`
**Owner**: Israel B. Bitton (b7069484@gmail.com)
**Locked**: 2026-05-18
**Status**: active

> Parent sub-goal of `yentl-compliance-foundation`. Group C (WCAG 2.2 AA + a11y audit gate).

---

## Objective

Bring Yentl to WCAG 2.2 AA conformance with a tooling gate that prevents regressions. Required before public launch under:
- **European Accessibility Act** (in force 2025-06-28, €100k per violation per Member State)
- **ADA Title III** (US, de facto WCAG 2.2 AA bar per Domino's v. Robles lineage; 77% of ADA web-a11y lawsuits target SMBs)
- **UK Equality Act 2010** (WCAG 2.1 AA de facto)

## End condition (THE LITERAL TEXT `/goal` EVALUATES)

> ALL of the following are simultaneously true and verified by running the listed commands during the same /goal session, outputs surfaced into chat:
>
> 1. **Skip-to-content link**: `components/ui/skip-to-content.tsx` exists, exports a `<SkipToContent />` component. Rendered as the **first focusable element** in `app/layout.tsx` (above any header). Visually hidden by default (`sr-only`), visible when focused (`focus:not-sr-only`, sufficient contrast). Anchors to `href="#main-content"`. The `<main>` element in `app/session/page.tsx` (and any other route's main element) carries `id="main-content"`. Test in `tests/skip-to-content.test.tsx` verifies SkipToContent renders, is hidden by default class, and is the first focusable element via tab order.
>
> 2. **Focus ring tokens**: `app/globals.css` defines a CSS variable for focus rings (e.g., `--ring: <oklch/hsl value>`). The chosen value has ≥3:1 contrast against the page background per WCAG 2.4.7 (non-text contrast). A `/* contrast: <ratio>:1 against bg <hex> */` comment documents the calculation. Tailwind v4's `@theme` or equivalent is used so `ring-` utilities pick up the token. Test in `tests/focus-ring.test.ts` reads the CSS file and asserts the token + comment are present.
>
> 3. **44×44 touch targets**: All interactive elements (buttons, links, form controls used as buttons) render with minimum bounding box of 44×44 px per WCAG 2.5.8. Specifically: the shadcn `Button` component default `size="default"` produces ≥44×44 rendered box. If not, override in `components/ui/button.tsx` (bump default to h-11 or larger + sufficient px). Test in `tests/touch-targets.test.tsx` renders Button at default size and asserts `offsetHeight >= 44` and `offsetWidth >= 44` via jsdom (note: jsdom doesn't fully compute layout — use computed CSS or class inspection instead, documenting the approach).
>
> 4. **prefers-reduced-motion respected**: All animated elements in the codebase use Tailwind's `motion-reduce:` variant (e.g., `motion-reduce:animate-none`, `motion-reduce:transition-none`). Audit scope: `components/session/**`, `components/ui/**`. The RecordingBeacon from `yentl-this-week-actions` MUST have `motion-reduce:animate-none` (verify; add if missing). Smoke test in `tests/reduced-motion.test.tsx` mocks `matchMedia` to return `prefers-reduced-motion: reduce` and asserts that an animated component renders with the reduce-motion class active.
>
> 5. **aria-live regions present**: Two live regions exist:
>    - **Transcript live region**: `components/session/TranscriptView.tsx` (or equivalent transcript container) has `aria-live="polite"`, `aria-atomic="false"`. Polite, NOT assertive.
>    - **Claims live region**: `components/session/claims-live-region.tsx` (NEW) exports `<ClaimsLiveRegion />` reserved for future verdict announcements (data wiring lives in the fact-check pipeline goal). Has `aria-live="polite"`, `aria-atomic="false"`, `role="status"`. Mounted in `app/session/page.tsx`.
>    Test in `tests/aria-live.test.tsx` verifies both regions have correct aria attributes.
>
> 6. **WCAG 2.2 AA pass — tooling gate**:
>    - `@axe-core/cli` installed as devDependency
>    - `scripts/run-a11y-audit.sh` exists, is executable, and: starts dev server with `npm run dev &`, waits for `http://localhost:3000` to return 200 (polling loop with timeout 60s, NOT a fixed sleep), runs `npx @axe-core/cli http://localhost:3000` AND `npx @axe-core/cli http://localhost:3000/session`, captures Lighthouse a11y scores via `npx lighthouse http://localhost:3000 --only-categories=accessibility --quiet --chrome-flags="--headless"` for both routes, kills dev server, prints summary, exits 0 if zero axe violations AND Lighthouse a11y ≥ 95 on both routes.
>    - The script runs successfully in the worker's session: zero axe violations, Lighthouse ≥ 95 on `/` and `/session`. Output captured in chat.
>    - If `.github/workflows/ci.yml` exists (created by `yentl-hardening-pass`), an `a11y-audit` step is appended that runs `bash scripts/run-a11y-audit.sh`. If CI workflow doesn't yet exist, the worker writes a minimal stub with only that step (the hardening-pass worker will merge its concerns later or this goal extends it).
>
> 7. **Working tree clean + branch synced**: `git status --porcelain` empty. All worker commits on branch `goals/yentl-compliance-a11y` with prefix `compliance:`. Branch rebases cleanly onto `origin/main`.

## Success criteria

- [ ] (1) SkipToContent in layout + test passing
- [ ] (2) Focus ring tokens in globals.css + contrast comment + test
- [ ] (3) 44×44 touch targets verified or Button bumped + test
- [ ] (4) motion-reduce variants applied across animated components + smoke test
- [ ] (5) Transcript + Claims aria-live regions + tests
- [ ] (6) axe-core CLI installed + run-a11y-audit.sh + zero violations on / and /session + Lighthouse ≥ 95
- [ ] (7) Clean working tree, commits prefixed `compliance:`, rebased

## Out of scope

- All other compliance work (sibling sub-goals + umbrella)
- Fact-check pipeline (Tasks 12-26)
- Brand asset modifications
- Rebrand (factify → yentl renames)
- Touching `app/api/deepgram/**`
- Pushing to `origin/main`, PR ops
- Major dep upgrades

## Context / references

- `./GOAL.md`, `./guardrails.md`, `./STATE.md`, `./decisions.log`
- Research: `.project/research/yentl-expansion-research.html` §7 (Accessibility regimes) and §8 Patterns 4 (Verdict cards — a11y) + Requirement→Component table rows 7, 16, 18, 19, 33-39
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- axe-core CLI: https://www.npmjs.com/package/@axe-core/cli
- Tailwind v4 theme/CSS variables: https://tailwindcss.com/docs/theme
- Existing files: `app/layout.tsx`, `app/session/page.tsx`, `components/session/TranscriptView.tsx`, `components/ui/button.tsx`, `app/globals.css` (verify path)

## Budget

- Max cost: $40 · Max wall-clock days: 7 · Max runs: 20 · Per-run cap: $5
