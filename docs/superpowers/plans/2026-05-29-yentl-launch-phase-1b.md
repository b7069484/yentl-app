# Yentl Launch — Phase 1b Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make uncertainty visible end-to-end + wire session persistence to Neon. Phase 1a delivered honest data structures (attribution_status, stance, audio_features) but no consumer surfaces them yet, and no session data persists past the Zustand client. Phase 1b closes both gaps: persistence as foundation, then UI surfaces that read the honest Phase 1a fields, plus a shareable `/verdict/[id]` URL, methodology transparency, and a paywall scaffold ready for Stripe (without requiring Stripe to ship).

**Architecture:** Eight focused tasks in dependency order. Persistence first (Task 1) because the verdict route, dispute form, and analytics all need session data in Neon. Then verdict route as the read consumer (Task 2). Then UI consumers of Phase 1a's new fields (Tasks 3-6). Then methodology transparency (Task 7). Then paywall scaffold reading subscriptions table (Task 8). Stripe wire is intentionally DEFERRED — schema already exists, UI gating works against a static tier value until Stripe webhook handler lands in Phase 1c.

**Tech Stack:** TypeScript 5+, Next.js 16.2.6 App Router, Vitest, Drizzle ORM, Neon HTTP, Clerk auth via `@clerk/nextjs/server`. Strict mode TS.

**Scope boundaries (out of plan):**
- Stripe webhook handler / actual subscription billing (Phase 1c — schema groundwork lands here)
- BIPA consent record + DELETE /api/biometric (Phase 1c — Sprint 3)
- AI Act Article 50 surface verification (Phase 1c — Sprint 4)
- Dispute form + `/corrections` route (Phase 1c — needs disputes schema decision)
- 4-tier source reputation expansion (Phase 1c — needs tier definitions from product)
- Pre-run demo session on landing page (Phase 1c — needs the 90s clip asset)
- Sequential 3-screen consent flow (Phase 1c — needs design decision on layering vs. replacing existing ConsentGate)
- Single-signal collapsed live workspace (Phase 1c — heavy design, contested in committee review tension #1)
- Phase E prosody integration (post-Phase 1c)

**Source documents:**
- Audit Phase B: `agent-work/yentl-audit-2026-05-28/REPORT.md:542-575`
- Committee Sprint 2 items #18, #21, #23, partial #20: `agent-work/yentl-audit-2026-05-28/committee-review-2026-05-28-yentl-audit.md:424-460`
- Phase 1a plan: `docs/superpowers/plans/2026-05-28-yentl-launch-foundation-phase-1a.md`
- Drizzle schema: `lib/db/schema.ts`
- VerdictCard component: `components/verdict/VerdictCard.tsx`

---

## File Structure

**Files created:**
- `app/api/sessions/route.ts` — POST create session (Clerk-authed) (~80 lines)
- `app/api/sessions/[id]/route.ts` — GET single session, no auth (public verdict reads) (~50 lines)
- `app/verdict/[id]/page.tsx` — server component verdict route (~150 lines)
- `app/verdict/[id]/not-found.tsx` — friendly 404 for missing/non-public verdicts (~30 lines)
- `components/session/AttributionBadge.tsx` — graduated attribution_status badge (~60 lines)
- `components/session/ClaimStanceBadge.tsx` — stance pill (asserted/denied/quoted/mocked/hedged) (~50 lines)
- `components/session/RejectedClaimsPanel.tsx` — collapsible "heard but didn't fact-check" list (~100 lines)
- `components/paywall/CapReachedSheet.tsx` — V3.11 paywall scaffold (~120 lines)
- `lib/server/save-session.ts` — Clerk-authed session save helper (~50 lines)
- `tests/api-sessions-route.test.ts` — POST/GET coverage
- `tests/verdict-route.test.tsx` — server-component render + 404 path
- `tests/attribution-badge.test.tsx` — every attribution_status renders correct label
- `tests/claim-stance-badge.test.tsx` — every stance renders correct label
- `tests/cap-reached-sheet.test.tsx` — tier gating + CTA copy

**Files modified:**
- `lib/client/session-store.ts` — `toSession()` + `endSession()` to call save endpoint via fetch
- `components/session/TranscriptView.tsx` — render AttributionBadge inline
- `components/session/ClaimCard.tsx` — render ClaimStanceBadge + confidence tier + OPINION shape variant
- `lib/client/verdict-theme.ts` — add OPINION shape token (e.g., `shape: "diamond" | "square"`)
- `app/methodology/page.tsx` — append "What Yentl doesn't fact-check" section
- `app/session/page.tsx` — mount RejectedClaimsPanel under transcript
- `lib/prompts/extract-claims.ts` — extend prompt + Zod schema to capture `rejected_claims[]` alongside accepted claims (text + reason)
- `app/api/extract-claims/route.ts` — flow rejected_claims through to client store
- `lib/types.ts` — add `RejectedClaim` type + extend ClaimCard with optional `confidence_tier` derived field

**Tests modified:**
- `tests/extract-claims.test.ts` — schema asserts new rejected_claims array
- `tests/claim-card.test.tsx` — stance badge present + confidence tier + OPINION shape distinct

**Total task count:** 8
**Estimated effort:** 5–7 working days
**Commit cadence:** One commit per task. Each task independently revertible.

---

## Task 1: Wire session persistence to Neon

**Why:** No path currently writes session data to Neon. The Drizzle `sessions` table exists from Phase 2 with a `data` jsonb blob, but `endSession()` only mutates Zustand state. Without persistence, the verdict route (Task 2) has nothing to load. Lands first because every downstream Phase 1b task assumes persisted sessions.

**Files:**
- Create: `app/api/sessions/route.ts` — `POST` create
- Create: `app/api/sessions/[id]/route.ts` — `GET` single (public, returns 404 for non-existent or non-public)
- Create: `lib/server/save-session.ts` — Clerk auth + Drizzle insert helper
- Modify: `lib/client/session-store.ts` — `endSession` fires save via fetch (best-effort, non-blocking)
- Test: `tests/api-sessions-route.test.ts`

**Auth model:**
- `POST /api/sessions` — requires Clerk auth; owner = `auth().userId`
- `GET /api/sessions/:id` — public; returns minimal verdict-ready payload (no PII, no draft state)

**Steps:**

- [ ] **Step 1: Write the failing route test**
  - Test POST without auth → 401
  - Test POST with auth → 200 + session id matches Drizzle row
  - Test GET existing id → 200 + payload shape `{ id, title, verdict, claims[], markers[], speakers[], transcript[], endedAt }`
  - Test GET missing id → 404

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/api-sessions-route.test.ts
```

- [ ] **Step 3: Implement POST** — `auth()` guard, `db.insert(sessions).values({...})`, return `{ id }`
- [ ] **Step 4: Implement GET** — `db.query.sessions.findFirst({ where: eq(sessions.id, id) })`, return narrow public projection
- [ ] **Step 5: Wire client save** — in `session-store.ts`, change `endSession` to fire `POST /api/sessions` with `toSession()` payload. Catch + log on failure (don't block UI).
- [ ] **Step 6: Verify tests pass + full suite + tsc**

**Acceptance:**
- Ending a session writes a row to `sessions` table
- `GET /api/sessions/:id` returns the row's `data` blob
- Failing fetch doesn't break the UI (just console.warn)

---

## Task 2: `/verdict/[id]` route

**Why:** VerdictCard component exists but is unreachable via URL. The committee review (#20) and audit Phase B both call out shareable verdict URLs as a monetization + distribution prerequisite. Read-only route lands here; the `/dispute` extension defers to Phase 1c.

**Files:**
- Create: `app/verdict/[id]/page.tsx` — server component
- Create: `app/verdict/[id]/not-found.tsx`
- Test: `tests/verdict-route.test.tsx`

**Steps:**

- [ ] **Step 1: Write failing test** — render with mocked GET that returns a fixture session; assert VerdictCard + at least one ClaimCard present
- [ ] **Step 2: Implement route** — `await fetch(absoluteUrl('/api/sessions/' + id))`, if 404 → `notFound()`, else render VerdictCard with primary verdict + ClaimCard map
- [ ] **Step 3: Visual verify via agent-browser** — start dev server, navigate to `/verdict/<test-id>`, screenshot, confirm layout matches V3 design intent (verdict stripe, claims below)

**Acceptance:**
- `GET /verdict/<existing-id>` renders verdict + claims
- `GET /verdict/<nonexistent>` renders friendly 404
- AIGeneratedBadge + AIDisclosureFooter present (AI Act Art 50 prep)

---

## Task 3: TranscriptView attribution_status badge

**Why:** Phase 1a stopped lying about `speaker_id` (null + attribution_status "not_available" instead of defaulting to 0) but no UI surfaces the new field. Without it, the transcript still LOOKS like it has confident speaker attribution. Apple review #1 ("theater without acoustics") applies here too.

**Files:**
- Create: `components/session/AttributionBadge.tsx`
- Modify: `components/session/TranscriptView.tsx`
- Test: `tests/attribution-badge.test.tsx`

**Badge mapping:**
| `attribution_status` | Badge label | Tone |
|---|---|---|
| `null` / `not_available` | "Speaker unknown" | neutral |
| `confident` | (no badge — the name is the badge) | — |
| `probable` | "Probably Speaker N" | amber |
| `uncertain` | "Speaker uncertain" | amber |
| `overlapping` | "Overlapping speech" | amber |
| `quoted_audio` | "Clip / quoted audio" | blue |

**Steps:**

- [ ] **Step 1: Write failing test** — render badge for every status; assert correct label appears
- [ ] **Step 2: Implement AttributionBadge.tsx** — pure component, props `{ status: AttributionStatus | null }`, returns Badge or null
- [ ] **Step 3: Mount in TranscriptView** — render next to speaker label
- [ ] **Step 4: Visual verify** — agent-browser session showing transcript with mixed statuses

---

## Task 4: ClaimCard stance ownership line

**Why:** Phase 1a added `stance` field to extracted claims (asserted/denied/quoted/mocked/hedged/…) but ClaimCard doesn't display it. PolitiFact reviewer #7 + Anthropic reviewer #2 both flagged: same factual claim "asserted" vs "denied" is a totally different fact-check, and the UI should reflect that the user heard it as a denial, not an assertion.

**Files:**
- Create: `components/session/ClaimStanceBadge.tsx`
- Modify: `components/session/ClaimCard.tsx` — render stance line above claim text
- Test: `tests/claim-stance-badge.test.tsx`

**Stance display:**
| `stance` | Display |
|---|---|
| `asserted` | (no badge — assertion is the default) |
| `denied` | "🚫 Denied" |
| `quoted` | "❝ Quoted" |
| `mocked` | "🤔 Mocked" |
| `hedged` | "≈ Hedged" |

**Steps:** TDD per Task 3 pattern. Visual verify via agent-browser.

---

## Task 5: ClaimCard confidence-tier from `score`

**Why:** PolitiFact #7 + audit Phase B: the `score` field already exists on ClaimCard but isn't surfaced. Users see a verdict label without seeing how confident the system is. Derive a 3-tier display (low/medium/high) from score thresholds:
- `score >= 0.85` → "High confidence" (green)
- `0.65 <= score < 0.85` → "Medium confidence" (amber)
- `score < 0.65` → "Low confidence" (red)

**Files:**
- Modify: `components/session/ClaimCard.tsx`
- Modify: `lib/types.ts` — add `confidence_tier?: "low" | "medium" | "high"` derived helper export
- Test: `tests/claim-card.test.tsx`

**Steps:** TDD. Pure derived computation — no new data. Visual verify.

---

## Task 6: ClaimCard OPINION distinct shape

**Why:** PolitiFact #7: OPINION is a classification, not a verdict. Color alone won't carry that meaning for colorblind users or in screenshots; a shape cue is needed.

**Files:**
- Modify: `lib/client/verdict-theme.ts` — add `shape` token to VERDICT map
- Modify: `components/session/ClaimCard.tsx` — render shape variant based on `primary_label === "OPINION"`
- Test: extend `tests/claim-card.test.tsx`

**Implementation:** For OPINION, render the status stripe as a left-side ◇ diamond glyph instead of the colored bar. Other verdicts keep the existing colored bar.

**Steps:** TDD. Visual verify side-by-side TRUE/FALSE/OPINION cards.

---

## Task 7: `/methodology` — "What Yentl doesn't fact-check" section

**Why:** Committee #21: editorial integrity demand. Plain language list of out-of-scope content prevents user surprise + reputational damage when satire, jokes, predictions, or opinions get processed.

**Files:**
- Modify: `app/methodology/page.tsx`

**Content (literal copy):**

```markdown
## What Yentl doesn't fact-check

Some things sound like factual claims but aren't, and we deliberately skip them:

- **Satire and jokes** — if it's obviously not meant literally, we let it pass
- **Predictions about the future** — there's no source of truth to check against
- **Opinions and value judgments** — "this is bad" isn't a claim about reality
- **Hypotheticals** — "if X then Y" doesn't claim X happened
- **Personal experience reports** — we can't verify what someone says happened to them

If you think we miss-categorized something, flag it via the verdict's dispute link.
```

**Steps:** Content drop. No tests required (static copy). Visual verify the page renders.

---

## Task 8: Paywall V3.11 scaffold

**Why:** Audit Phase B: "scaffold V3.11 paywall sheet — Reb Yisroel committed the intent; the component is missing." Even without Stripe wired, the scaffold needs to exist so Phase 1c webhook handler has a target to plug into. Sheet reads tier from `subscriptions.tier` (defaulting to "free") and shows when usage exceeds the free quota.

**Files:**
- Create: `components/paywall/CapReachedSheet.tsx`
- Modify: `lib/server/save-session.ts` — return current tier + usage in response
- Modify: `lib/client/session-store.ts` — track tier + cap-reached flag
- Test: `tests/cap-reached-sheet.test.tsx`

**Tier model (V3.29 wireframes per memory):**
- `free` — quota: 30 minutes/month audio
- `pro` — $15/mo, quota: 10 hours/month
- `studio` — $50/mo, quota: unlimited + priority

**Cap-reached UI:**
- Full-screen sheet
- Headline: "You've used your free 30 minutes this month"
- CTA: "Upgrade to Pro — $15/mo" (button is non-functional in this task; Phase 1c wires Stripe Checkout)
- Secondary: "Reset on [date]"

**Steps:**

- [ ] **Step 1: Write failing test** — assert sheet renders when `tier === "free"` and `audioSecondsUsed >= 30*60`
- [ ] **Step 2: Implement sheet** — Dialog-based component reading from session store
- [ ] **Step 3: Wire usage tracking in save-session** — on session end, increment `audioSecondsUsed` by `(endedAt - startedAt) / 1000`
- [ ] **Step 4: Visual verify** — agent-browser with seeded over-quota user

**Acceptance:**
- Free tier + over quota → sheet visible
- Free tier + under quota → no sheet
- Pro/Studio → never shown (regardless of usage)
- Upgrade button click logs intent (Phase 1c will wire Stripe)

---

## Self-Review (run before claiming the plan is complete)

- [ ] All 8 tasks committed atomically (one commit per task, 8 commits)
- [ ] `npm run test:run` — every existing test passes
- [ ] `npx tsc --noEmit` — clean (exit 0)
- [ ] Visual verification done via agent-browser for Tasks 2, 3, 4, 5, 6, 7, 8 — and described in commit body
- [ ] `/verdict/<id>` route reachable for a real session id end-to-end
- [ ] TranscriptView and ClaimCard now show Phase 1a's honest fields
- [ ] Methodology page has the new section
- [ ] Paywall scaffold visible at quota boundary
- [ ] No Stripe code anywhere (deferred to Phase 1c)
- [ ] No diarize:true flips (deferred to Phase 1c BIPA work)
- [ ] No middleware changes (deferred to Phase 1c hardening pass)

---

## Execution Handoff

Plan complete. Eight tasks, ordered by dependency. Persistence (Task 1) is the foundation; verdict route (Task 2) is the first read consumer; UI consumers of Phase 1a fields land Tasks 3-6; transparency (Task 7) and paywall scaffold (Task 8) close the phase.

**Hard external gates encountered → Phase 1c queue:**
- Stripe Checkout wire (needs account + pricing decision)
- 4-tier source reputation (needs tier definitions)
- Sequential 3-screen consent (needs design decision on layering vs. replacing ConsentGate)
- Pre-run landing demo (needs 90s clip asset)
- /dispute form + /corrections (needs disputes table schema decision)
- Single-signal collapsed live workspace (needs design + tension resolution)
- BIPA + AI Act work (Sprint 3-4, legal review required)
