# Goal: Yentl Compliance — AI Transparency (Group B)

**Slug**: `yentl-compliance-ai-transparency`
**Owner**: Israel B. Bitton (b7069484@gmail.com)
**Locked**: 2026-05-18
**Status**: active

> Parent sub-goal of `yentl-compliance-foundation`. Group B (AI transparency components).

---

## Objective

Ship the two AI transparency primitives the rest of the compliance UX depends on:
- An "AI" badge chip used wherever AI-generated content appears (cards, drawers, X-bot reply cards in v1.1)
- A persistent footer disclosure on the session page making AI provenance always visible

These map to AI Act Article 50(1) (interaction-with-AI disclosure) and Apple 5.1.2(i) (third-party AI consent — partially; the modal handles consent, the badge handles ongoing visibility).

## End condition (THE LITERAL TEXT `/goal` EVALUATES)

> ALL of the following are simultaneously true and have been verified by running the listed commands during the same /goal session, with the outputs surfaced into the chat transcript:
>
> 1. **AIGeneratedBadge component**: `components/ui/ai-generated-badge.tsx` exists exporting a React component. Triple-encoded for accessibility: text label "AI", icon (sparkle from lucide-react or equivalent), background fill with ≥4.5:1 contrast against text. Includes `aria-label="AI-generated content"`. Default size renders in-line (vertical-align baseline) suitable for placing inside a heading or beside a verdict label. Exported from `components/ui/index.ts` if the project has barrel exports. Used at least once in `app/session/page.tsx` (placed where AI output appears OR in a placeholder that the fact-check pipeline goal will wire up). Test in `tests/ai-generated-badge.test.tsx` covers: (a) renders with default props, (b) has correct aria-label, (c) has visible "AI" text, (d) icon present.
>
> 2. **AIDisclosureFooter component**: `components/session/ai-disclosure-footer.tsx` exists, rendered persistently at the bottom of the session page (`app/session/page.tsx`). Verbatim text from research §8 Brand-Voice Copy: "Verdicts are AI-generated. Sources may be incomplete. Use your head." Styled subtly but readable — text-sm or larger, opacity ≥ 0.7, contrast ≥ 4.5:1 against background. Test in `tests/ai-disclosure-footer.test.tsx` covers: (a) renders on the session page, (b) text is verbatim.
>
> 3. **Working tree clean + branch synced**: `git status --porcelain` returns empty. All worker commits on branch `goals/yentl-compliance-ai-transparency` with message prefix `compliance:`. Branch rebases cleanly onto `origin/main`.

## Success criteria

- [ ] (1) AIGeneratedBadge component + 4 tests passing
- [ ] (2) AIDisclosureFooter component + 2 tests passing, mounted on session page
- [ ] (3) Working tree clean, commits prefixed `compliance:`, rebased clean

## Out of scope

- **No rebrand** (factify → yentl renames)
- **No touching `app/api/deepgram/**`**
- **No new product features or routes**
- **Other compliance components** (consent UX, trust pages, WCAG, verdict scaffold, DPIA) — those live in sibling sub-goals or the umbrella
- **No push to `origin/main`**, no PR ops
- **No major dep upgrades**

## Context / references

- `./GOAL.md`, `./guardrails.md`, `./STATE.md`, `./decisions.log`
- Research source: `.project/research/yentl-expansion-research.html` §8 Pattern 3 (AI transparency), Brand-Voice Copy section
- Brand colors (research §6/§8): primary mark `#2563EB`; muted text per Tailwind defaults; verify contrast
- Icons: `lucide-react ^1.14.0` (already in package.json) — use Sparkles or similar
- `app/session/page.tsx` — mount AIDisclosureFooter here
- `components/ui/` — AIGeneratedBadge goes here

## Budget

- Max cost: $15.00 · Max wall-clock days: 3 · Max runs: 8 · Per-run cap: $3.00
