# Goal: Yentl Compliance — Verdict Scaffold (Group E)

**Slug**: `yentl-compliance-verdict-scaffold`
**Owner**: Israel B. Bitton (b7069484@gmail.com)
**Locked**: 2026-05-18
**Status**: active

> Parent sub-goal of `yentl-compliance-foundation`. Group E (verdict UI scaffold + report flow — no data wiring).

---

## Objective

Ship the verdict + report UI scaffold required by Apple 4.7.1 (chatbot moderation — "Report this verdict" button on every card), Play AI-Generated Content policy (in-app reporting), and DSA Art. 16 (notice-and-action). Triple-encoded VerdictCard satisfies WCAG 1.4.1 (color is not the only means of conveying information).

**Scaffold only** — actual data flow (verdicts received from `/api/verify-*`, markers from rhetoric pipeline) is the fact-check pipeline goal's scope. This goal proves the components render all 4 verdict states correctly + the report flow validates.

## End condition (THE LITERAL TEXT `/goal` EVALUATES)

> ALL of the following are simultaneously true and verified by running the listed commands during the same /goal session, outputs surfaced in chat:
>
> 1. **ReportVerdictButton + ReportFlow**:
>    - `components/verdict/report-verdict-button.tsx` (NEW dir) exports a `<ReportVerdictButton verdictId={string} />` component. Renders an accessible button (min 44×44 touch target, visible focus ring, `aria-label="Report this verdict"`, includes a flag/alert icon from lucide-react). On click, opens `<ReportFlow>` dialog.
>    - `components/verdict/report-flow.tsx` exports `<ReportFlow open onOpenChange verdictId />`. Uses the existing shadcn `<Dialog>` primitive. Contains:
>      - **Categorized radio options**: "Wrong verdict", "Bad sources", "Harmful content", "Other" (required selection)
>      - **Optional free-text** input ("What went wrong? (optional)", max 2000 chars)
>      - **Cancel button** (closes dialog, no persistence)
>      - **Submit button** (disabled until category selected)
>    - **On submit**: persist to `localStorage` key `yentl.reports` as an append to an array of records:
>      ```ts
>      { report_id: string /* ULID */; category: "wrong_verdict" | "bad_sources" | "harmful_content" | "other"; note: string; verdict_id: string; timestamp_iso: string }
>      ```
>      (No backend yet — v2 adds that.)
>    - Dialog closes after submit; shows a brief confirmation toast ("Thanks — we'll review.")
>    - Tests in `tests/report-flow.test.tsx` cover: (a) ReportVerdictButton renders accessibly, (b) clicking opens ReportFlow dialog, (c) Submit is disabled until category selected, (d) Cancel closes without persistence, (e) Submit persists a valid record to localStorage with correct shape (validate with Zod), (f) dialog closes after submit.
>
> 2. **VerdictCard triple-encoding**:
>    - `components/verdict/verdict-card.tsx` exports `<VerdictCard verdict claim summary sources markers verdictId />` with TypeScript props:
>      ```ts
>      type Props = {
>        verdict: "TRUE" | "FALSE" | "MIXED" | "UNVERIFIED";
>        claim: string;
>        summary: string;
>        sources?: Array<{ url: string; domain: string; reputation: "high" | "medium" | "low" }>;
>        markers?: Array<{ type: string; severity: "subtle" | "clear" | "blatant" }>;
>        verdictId: string;
>      };
>      ```
>    - **Triple-encoding** for each verdict state (color + icon + uppercase mono text label):
>      - TRUE: green stripe `#16A34A` + check-circle icon + label "✓ TRUE"
>      - FALSE: red stripe `#DC2626` + x-circle icon + label "✗ FALSE"
>      - MIXED: amber stripe `#F59E0B` + half-circle icon + label "◐ MIXED"
>      - UNVERIFIED: gray stripe `#6B7280` + question-circle icon + label "? UNVERIFIED"
>    - Icons via `lucide-react` (CheckCircle / XCircle / CircleSlash or PieChart / HelpCircle).
>    - Includes `<AIGeneratedBadge>` (from sibling `yentl-compliance-ai-transparency`). If that component doesn't yet exist on `origin/main`, this goal notes in alerts.md and embeds a placeholder span `<span aria-label="AI-generated">AI</span>` for now, marked `<!-- TODO: replace with AIGeneratedBadge once available -->`.
>    - Includes `<ReportVerdictButton>` from clause 1.
>    - Sources rendered as keyboard-navigable list (`<ul role="list">` with focusable `<a>` per source), reputation indicator visible (e.g., colored dot).
>    - Markers rendered as `<span>` chips with severity color + label (full MarkerChip is fact-check goal scope; this is the minimum render).
>    - Tests in `tests/verdict-card.test.tsx` cover all 4 verdict states render, each has the right color/icon/text, AI badge or placeholder present, ReportVerdictButton present, satisfies WCAG 1.4.1 (color is NOT sole means of conveying verdict — verified by snapshot or class assertion).
>
> 3. **Working tree clean + branch synced**: `git status --porcelain` empty; commits prefixed `compliance:`; branch rebases cleanly onto `origin/main`.

## Success criteria

- [ ] (1) ReportVerdictButton + ReportFlow + localStorage persistence + 6 tests
- [ ] (2) VerdictCard triple-encoded (4 states) + tests + AI badge integration (or placeholder)
- [ ] (3) Clean tree + rebased

## Out of scope

- All other compliance work
- Fact-check pipeline (data wiring to verdict-card)
- MarkerChip + MarkerExplanationDrawer (fact-check goal)
- Backend for ReportFlow (v2)
- Brand asset changes
- Rebrand
- `app/api/deepgram/**`
- Main pushes, PR ops
- Major dep upgrades

## Context / references

- `./GOAL.md`, `./guardrails.md`, `./STATE.md`, `./decisions.log`
- Research §4 (verdict vocabulary), §8 Pattern 4 (Verdict cards — accessibility-first)
- `ulid ^3.0.2` for `report_id` generation (already installed)
- `zod ^4.4.3` for localStorage shape validation in tests (already installed)
- `lucide-react ^1.14.0` for icons (already installed)
- shadcn `<Dialog>` already exists at `components/ui/dialog.tsx`

## Budget

- Max cost: $15 · Max wall-clock days: 3 · Max runs: 8 · Per-run cap: $3
