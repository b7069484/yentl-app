# Yentl Launch — Phase 1c Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close out audit Phase B editorial-integrity items + Sprint 2 #18/#20 + front-half of Sprint 4 #29 security hardening. Four focused tasks, all autonomous-safe (no external decisions, no legal sign-off, no Stripe account, no design tensions).

**Architecture:** Tasks ordered by independence — middleware (no dependencies on other Phase 1c tasks) → label rationale (consumer of Phase 1a extract-claims) → disputes scaffold (consumer of Phase 1b persistence) → paywall wire (consumer of Phase 1b CapReachedSheet + Phase 1a subscriptions table).

**Tech Stack:** Same as Phase 1a + 1b. Adds: rate-limit middleware (already exists at `lib/server/rate-limit.ts` — Phase 1c just centralizes via App Router middleware).

**Scope boundaries (out of plan — kept in Phase 1d / Sprints 3-5 queue):**
- Stripe wire (needs account + pricing confirmation)
- Source reputation 4-tier expansion (needs tier definitions from product)
- Sequential 3-screen consent (needs UX decision on layering vs. replacing existing ConsentGate)
- Pre-run landing demo (needs the 90s clip asset)
- Single-signal collapsed live workspace (committee tension #1 unresolved)
- BIPA work + AI Act legal text (Sprints 3-4, legal review required)
- Hardening pass console.log sweep + lint-debt cleanup (separate cleanup PR)

---

## Task 1: `middleware.ts` — security headers + global rate limit

**Why:** Sprint 4 #29 first-half — pre-prod hardening. Today there's no `middleware.ts` at the app root. Clerk auth is layout-level. Routes are wide-open at the edge. Sprint 4 audit calls out: middleware.ts with rate-limit + security headers; ESLint clean; console.log sweep; .env.example parity; CHANGELOG; README Security section. This task lands the security half — rate-limit + headers — leaving doc/lint cleanup for a separate PR.

**Files:**
- Create: `middleware.ts` at app root
- Create: `tests/middleware.test.ts`

**Headers added:**
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), geolocation=(), microphone=(self)` — mic allowed for self only (Yentl needs it), camera/geo denied
- `X-DNS-Prefetch-Control: on`

**Rate limit:** layer on top of existing `lib/server/rate-limit.ts` for `/api/*` routes. Falls back to noop if rate-limit infra not configured.

**Steps:**

- [ ] **Step 1:** Write failing test asserting headers present + 429 on rate-limit
- [ ] **Step 2:** Implement `middleware.ts` using `NextResponse` header injection
- [ ] **Step 3:** tsc + tests green

**Acceptance:**
- Every response carries the 6 security headers
- `/api/*` routes hit rate-limit when configured
- Non-api routes pass through (no rate-limit on pages)

---

## Task 2: `label_rationale` field on ClaimCard

**Why:** Sprint 2 #18 — PolitiFact + Anthropic ask for "why this label, not the adjacent one" sentence. Today ClaimCard shows the verdict label + the explanation (what makes it true/false) but doesn't articulate WHY this label specifically — e.g., why MIXED instead of FALSE? The rationale forces the model to defend the boundary call.

**Files:**
- Modify: `lib/prompts/extract-claims.ts` — add `label_rationale: z.string()` to schema + system prompt directive
- Modify: `lib/types.ts` — add `label_rationale?: string` to ClaimCard
- Modify: `components/session/ClaimCard.tsx` — render below explanation as a separate styled paragraph
- Modify: `lib/client/orchestrator.ts` — carry `label_rationale` through to client store
- Modify: existing extract-claims tests to assert new field

**Acceptance:**
- Extract-claims response includes `label_rationale`
- ClaimCard displays it in non-compact mode as italic sub-line
- Compact mode hides it (space-constrained)

---

## Task 3: Disputes scaffold — `/verdict/[id]/dispute` form + `disputes` table + `/corrections` route

**Why:** Sprint 2 #20 — editorial integrity demand. Without a dispute path, users have no recourse; that's a reputational risk + legal exposure (defamation defense + AI Act Art 50 user-visible AI disclosure on contested verdicts). Phase 1c lands the scaffold; the moderation flow + auto-flag on the verdict card lands in Phase 1d.

**Files:**
- Modify: `lib/db/schema.ts` — add `disputes` table
- Create: `app/api/disputes/route.ts` — `POST` create dispute (Clerk-authed)
- Create: `app/verdict/[id]/dispute/page.tsx` — server component with form
- Create: `app/corrections/page.tsx` — empty-state launch with "no corrections yet" copy
- Create: `tests/disputes-route.test.ts`
- Create: `tests/disputes-form.test.tsx`

**`disputes` schema:**
```ts
export const disputes = pgTable("disputes", {
  id: text("id").primaryKey(),                       // dispute_<ulid>
  sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  claimId: text("claim_id"),                         // optional — dispute can be session-wide
  disputerClerkUserId: text("disputer_clerk_user_id"), // nullable for anonymous disputes
  disputerEmail: text("disputer_email"),
  evidenceUrl: text("evidence_url"),
  correctionRequested: text("correction_requested").notNull(),
  status: text("status").notNull().default("pending"), // pending | reviewing | resolved | rejected
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

**Form fields:**
- Disputer email (required)
- Evidence URL (optional)
- Correction requested (required, textarea)
- Optional claim id (auto-populated when arrived from a specific ClaimCard's link)

**Acceptance:**
- Form submits → row in `disputes` table → "Thanks — we'll review" confirmation
- `/corrections` empty-state renders without errors
- Schema push needed: `npx drizzle-kit push --force`

---

## Task 4: Wire CapReachedSheet into session page + `GET /api/subscriptions/me`

**Why:** Phase 1b Task 8 shipped the sheet but never mounted it. Without the wire-up the scaffold is dead code. Phase 1c lands the integration — defaults all users to free tier with 0 usage when no subscription row exists, surfaces sheet when usage exceeds 30 min cumulative. Stripe Checkout wire to `onUpgradeIntent` is still Phase 1d (needs his Stripe account).

**Files:**
- Create: `app/api/subscriptions/me/route.ts` — `GET` returns `{ tier, audioSecondsUsed, periodResetAt }` (defaults when no row)
- Modify: `lib/server/save-session.ts` — increment `audioSecondsUsed` on session save
- Modify: `app/session/page.tsx` — useEffect calls `/api/subscriptions/me`, mounts `CapReachedSheet` open when `isOverCap()`
- Create: `tests/api-subscriptions-me.test.ts`

**Acceptance:**
- Free tier under cap → no sheet
- Free tier over cap → sheet visible at session page mount
- Pro/Studio → never sheet
- Save flow increments `audioSecondsUsed`

---

## Self-Review (run before claiming complete)

- [ ] All 4 tasks committed atomically (4 commits)
- [ ] `npm run test:run` — every test passes
- [ ] `npx tsc --noEmit` — clean (exit 0)
- [ ] Visual verification of new UI surfaces on Vercel preview
- [ ] No Stripe code (deferred to Phase 1d)
- [ ] No diarize:true flips (deferred to Phase 1d BIPA work)
- [ ] No source-rep 4-tier expansion (needs product tier defs)
- [ ] No consent flow rework (needs UX decision)
