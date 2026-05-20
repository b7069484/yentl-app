# Handoff — V3 auth screens pickup (2026-05-19)

> Resume work without context. This document is the source of truth for picking up where the 2026-05-19 session left off.

---

## TL;DR

- **Phase 0 + Phase 2 are LIVE on yentl.it** (sprint-1 multi-source product + Clerk auth + Neon DB + Drizzle).
- **V3.18 signup is ~85% pixel-close to the wireframe** on branch `feat/v3-auth-screens` (commit `1012423`) — see preview URL below. Not yet merged to main.
- **YouTube ingest 500's in prod** due to YouTube's cloud-IP block — confirmed not yet fixed.
- **Major miss earlier in the day**: built a generic marketing landing without referencing the V3 wireframes. Branch discarded. Restart was on `feat/v3-auth-screens` with wireframe HTML as source of truth.
- **The 44 V3 wireframes at `.project/assets/ui/v3/WF-V3.*.html` are the design source of truth** for every screen. They're rendered iPhone-frame mobile mockups with locked copy, exact colors, spacing.

---

## ⚡ Immediate next steps (in priority order)

1. **Visualcheck V3.18 preview on phone** — preview URL below. Compare against `.project/assets/ui/v3/WF-V3.18_signup.html`. Note gaps; iterate or accept.
2. **Polish V3.18 remaining gaps** (see "Known V3.18 gaps" below) — ~30 min if pursued.
3. **Build V3.19 signin** — sibling of V3.18 (~30-45 min, shares scaffold).
4. **Build V3.20 magic-link verify** — different layout, "Check your inbox" envelope hero (~45 min).
5. **Build V3.1 source chooser** — the post-login landing. Italic Fraunces *"What do you want to fact-check?"* + 5 source cards with FASTEST amber pill on Live mic. ~1-2 hours.
6. **Decide what `/` route shows** for anonymous visitors — currently the minimal "yentl. speak truth." page. Options: redirect to /signup, build a marketing landing per dashboard §05 copy, or leave minimal.
7. **YouTube cloud-IP failover** — separate work. See "YouTube failure" section.

---

## Active worktree + branch

- **Worktree**: `/Users/israelbitton/Live FactCheck/.claude/worktrees/marketing-landing`
- **Branch**: `feat/v3-auth-screens` (pushed to origin)
- **HEAD**: `1012423 feat(v3): V3.18 signup pixel-close (wireframe match)`
- **Base**: `main` at `015ff83` (Phase 2 merged)
- **Worktree is linked to Vercel project**: `yentl` / `prj_uVDwPwN3ykn5A56LhnmDRReeUtn8`
- **Dev server**: `PORT=3010 npm run dev` runs on http://localhost:3010 (may already be running — `pkill -f "next dev"` if needed)

**Vercel preview URL** (auto-deployed from the push of `1012423`):
- https://yentl-n9x1wc023-b7069484-gmailcoms-projects.vercel.app/signup

---

## What's in production on yentl.it RIGHT NOW

Pulled today via `vercel --prod` from the main HEAD.

| Surface | State |
|---|---|
| `/` | Minimal "yentl. speak truth." brand-mark landing (NOT the V3 wireframe — that's because there isn't a V3 marketing-landing wireframe; only the copy spec at dashboard §05) |
| `/about` `/methodology` `/privacy` `/terms` `/subprocessors` `/accessibility` `/changelog` `/taxonomy.json` | 7 compliance trust pages |
| `/signin` | **Vanilla Clerk SignIn (default look)** — needs V3.19 build |
| `/signup` | **Vanilla Clerk SignUp (default look)** — V3.18 polished build is on the branch but NOT merged |
| `/session` | Sprint-1 multi-source product. **Middleware-gated**: unauth users get redirected to Clerk's hosted sign-in (`present-bullfrog-29.accounts.dev`) |
| `/api/youtube-ingest` | **500/PRIVATE — broken**. YouTube blocks Vercel cloud IPs at the Innertube layer. |
| Other API routes | `/api/extract-claims` `/api/verify-provisional` `/api/verify-confirmed` `/api/upload-audio` `/api/transcribe-batch` `/api/synthesize` `/api/analyze-rhetoric` `/api/media-ingest` `/api/source-preview` — all from sprint-1 merge, untested today |

**Clerk is on its Development instance** — sign-in form shows "Development mode" pill. Switching to a Production Clerk instance (with yentl.it as the auth domain) is a separate task.

---

## V3.18 signup — exact state on branch

### Files

- `app/signup/[[...rest]]/page.tsx` — custom wrapper (back chevron, brand block with Y-mark + yentl.it wordmark + italic Fraunces tagline, "Make an account." headline, "Free 15 min/month. No credit card." sub, microcopy, ToS row, sign-in footer) **AROUND** Clerk's `<SignUp />` with `appearance.elements` + `variables`
- `app/globals.css` — appended ~140 lines of `.cl-*` overrides (the wireframe-match CSS that Clerk's `appearance` prop can't reach)

### What's working (matches wireframe)

- Phone-frame card on cream paper bg with soft shadow
- Back chevron top-left
- Y-mark (blue #2563EB) + "yentl.it" wordmark with amber dot
- Italic Fraunces "Don't argue. Yentl it." tagline
- "Make an account." Fraunces serif headline
- "Free 15 min/month. No credit card." sub
- **Magic-link-only signup** (no password field)
- Email input with blue border + 4px blue glow in cream-2 paper card
- Red gradient "Continue →" CTA
- OR separator with mono uppercase styling
- **Vertical stack of labeled OAuth buttons**: Continue with Apple (black), Facebook (blue), Google (white), X (black)
- "We'll send a magic link. No password required for first sign-in." microcopy
- ToS row with blue checkmark badge + Terms + Privacy links
- "Already have an account? Sign in →" footer

### Known V3.18 gaps (follow-up if pursued)

1. **CTA text** — wireframe wants "Continue with email →"; Clerk's i18n hard-codes "Continue". Fix: pass `localization` prop to `<SignUp />` overriding `signUp.start.actionText`.
2. **CTA width** — wireframe specifies 220px; current is closer to ~280-300px. Fix: more specific CSS selector beating Clerk's inline width — try `.cl-form .cl-formButtonPrimary { width: 220px !important; }`.
3. **OAuth provider count** — wireframe shows 2 (Google + Apple); current shows 4 (Apple, Facebook, Google, X). Either disable Facebook + X in Clerk dashboard (Social Connections → set to "Account Linking Only"), or accept 4 and keep CSS labeled-stack mode.
4. **Spacing** — minor pixel drift between the cream-2 card padding, OR separator margins, OAuth gap.

### Clerk dashboard state (locked 2026-05-19 by Israel)

- User & Authentication → Email tab: Sign-up with email ON, Verify at sign-up = Email verification link ✓
- User & Authentication → Password tab: Sign-up with password OFF, Sign-in with password OFF, "Add password to account" still ON (could be turned off for purity but not blocking)
- User & Authentication → SSO connections: **Apple, Facebook, Google, X/Twitter** all "Used for sign-in" (green badge). Shared credentials = Clerk's dev OAuth creds.

---

## Source materials — the wireframes ARE the spec

| Wireframe | File path | What it specs |
|---|---|---|
| V3.1 | `.project/assets/ui/v3/WF-V3.1_source-chooser.html` | Post-login landing — italic Fraunces *"What do you want to fact-check?"* + 5 source cards (Live mic FASTEST amber pill, Audio file, YouTube, Text/transcript, Podcast URL) |
| V3.2 | `WF-V3.2_mic-pre-record.html` | Pre-record state |
| V3.3 | `WF-V3.3_mic-live-streaming.html` | 3-zone live mic |
| V3.4 | `WF-V3.4_claim-sheet.html` | Claim sheet with article thumbnails + Devil's panel |
| V3.5-V3.13 | (various) | Summary tab, Analysis tab, Devil's Advocate tab, Sources tab, post-session viewer, sessions list, paywall sheet, source deep-dive, YouTube landscape |
| **V3.14** | `WF-V3.14_text-paste-ingest.html` | Text/transcript paste ingest |
| **V3.15** | `WF-V3.15_audio-file-upload.html` | Audio file upload mid-processing |
| **V3.16** | `WF-V3.16_youtube-portrait-ingest.html` | YouTube URL ingest with rotate prompt |
| **V3.17** | `WF-V3.17_media-url-ingest.html` | Podcast / media URL ingest |
| **V3.18** | `WF-V3.18_signup.html` | **Active build — see above** |
| **V3.19** | `WF-V3.19_signin.html` | Signin — sibling of V3.18 |
| **V3.20** | `WF-V3.20_magic-link-verify.html` | "Check your inbox" with envelope hero |
| V3.21-V3.23 | (various) | Claim variants (Nope/Misleading/Unverifiable) |
| V3.24-V3.25 | (various) | Marker sheet + Speaker sheet |
| V3.26-V3.27 | (various) | Share modal + public read-only view |
| V3.28-V3.31 | (various) | Account section — profile, subscription, preferences, privacy & data |
| V3.32-V3.36 | (various) | Error/empty states — mic denied, upload failed, **V3.34 YouTube no captions** (relevant to YouTube cloud-IP fix), network offline, empty sessions |
| V3.37 | `WF-V3.37_youtube-portrait-analysis.html` | YouTube portrait analysis |

**Locked copy spec** at `.project/dashboard.html` §05:
- §5.1 Voice principles
- §5.4 Taglines (primary: "Don't argue. Yentl it.")
- §5.5 Hero copy
- §5.6 Section headlines
- §5.7 Feature copy (8 cards)
- §5.8 Verdict voice (6 states)
- §5.9 Microcopy (buttons, empty states, loading, errors)
- §5.10 Campaign copy (OOH, social, App Store)

Note: dashboard.html SAYS the full marketing landing was "deployed to yentl.it" — that's aspirational. The actual deployed `/` is the minimal brand-mark page and has been since v1. No marketing landing wireframe exists in the V3 set (it was listed as Tier 2 / not yet built).

---

## How to implement a new V3 screen (pattern)

This is the discipline we should have started with this morning. Use it.

1. **Open the wireframe HTML** at `.project/assets/ui/v3/WF-V3.X_*.html` in browser (file://) — see the actual design
2. **Read the wireframe source** to extract: exact copy, colors (CSS vars at top), typography, spacing, border-radii, shadows
3. **Build a React page** that wraps the same DOM structure with Tailwind + brand tokens (`bg-cream`, `text-ink`, `border-line`, `bg-teal`, etc.)
4. **For Clerk-driven screens** (V3.18, V3.19, V3.20): use Clerk's `<SignIn />` / `<SignUp />` / `<UserButton />` with `appearance` prop + global `.cl-*` CSS overrides for anything appearance can't reach (provider button colors, OAuth layout, button widths, hidden header/footer)
5. **`agent-browser` screenshot** the result, compare side-by-side with the wireframe screenshot
6. **Iterate** until pixel-close, then commit + push for Vercel preview
7. **Send Israel the preview URL** for phone testing — these are mobile-first designs

---

## Critical reference files

- **Brand v5 tokens**: `app/globals.css` lines 91-127 (the Yentl brand palette — cream, ink, teal=#2563EB, amber=#F59E0B, green=#22C55E, red=#EF4444)
- **Clerk override CSS**: `app/globals.css` lines 220-470 (the `.cl-*` selectors that fix what `appearance` can't reach)
- **Auth pages**: `app/signin/[[...rest]]/page.tsx` (default Clerk, needs V3.19 build) + `app/signup/[[...rest]]/page.tsx` (V3.18 build on this branch)
- **Middleware**: `middleware.ts` (gates `/session(.*)` and `/account(.*)` via Clerk)
- **DB**: `lib/db/schema.ts` (users, sessions, subscriptions tables — Clerk user_id as PK). Schema is live on Neon.
- **DB client**: `lib/db/client.ts` (Neon HTTP + Drizzle)

---

## YouTube failure — what we know

- `/api/youtube-ingest` returns 500 (Vercel infra) on cold start, then structured `{"error":{"code":"PRIVATE","message":"Video is unavailable"}}` for public videos like `dQw4w9WgXcQ` and `jNQXAC9IVRw` (Me at the zoo).
- Root cause: **YouTube's anti-bot system blocks Vercel datacenter IPs** at the Innertube layer. Sprint-1's `mweb/tv_embedded` extractor workarounds for yt-dlp were partial — Innertube path now hits the same wall.
- Code at `lib/server/youtube-captions.ts` lines 330-540 — Innertube primary → yt-dlp fallback.

**Real fix paths** (none quick):
1. Try `IOS` or `ANDROID_TESTSUITE` Innertube client (sometimes bypasses WEB-client detection, may break again any week)
2. Residential proxy (Bright Data / Smartproxy — $10-50/mo)
3. **Build V3.34 graceful-failure screen** — the wireframe already specs this. Show "No captions available → 1. Download audio yourself (recommended) 2. Try different video 3. Pro auto-generated BETA". Treat YouTube as best-effort, audio-upload as reliable path. This is the pragmatic move.

---

## What the day produced (timeline, for honest accounting)

1. **Morning**: Audit of repo activity 2026-05-16/17 — discovered sprint-1 multi-source product was un-merged on a feature branch. Memory file was stale on multiple points.
2. **Phase 0**: Sprint-as-trunk reconciliation — cherry-picked/merged 60+ sprint-1 commits + 20 main commits → `e49afbf` → CI green → pushed → deployed to yentl.it. Brand v5 + multi-source + YouTube infra + compliance overlay all landed on prod.
3. **Phase 2**: Set up Clerk + Neon + Drizzle. Provisioned via Vercel CLI (avoided Marketplace UI trap). Schema pushed to Neon. PR #2 merged.
4. **Vercel-GitHub plumbing fixes**: Discovered no Vercel-GitHub link existed (2 days of pushes never deployed). Fixed login connection + Vercel GitHub App install + git remote linkage. Now auto-deploys work.
5. **Worker triage**: 2 cloud workers (hardening-pass, this-week-actions) found firing on schedule but silently failing — paused via `RemoteTrigger update enabled:false`. Compliance-foundation worker (the one that already shipped 27/28 clauses) left enabled.
6. **Marketing landing experiment**: Built a generic marketing landing — Israel pointed out it ignored the V3 wireframes entirely (the actual visual spec). Branch discarded. This was the day's biggest miss.
7. **V3.18 build**: Restarted with `.project/assets/ui/v3/WF-V3.18_signup.html` open. Built phone-frame custom wrapper + Clerk `<SignUp />` themed via appearance + globals.css overrides. Currently ~85% match. On branch, NOT merged.

---

## Open decisions for next session

- [ ] Accept V3.18 as-is OR iterate the remaining 4 gaps (Continue-with-email text, 220px CTA, OAuth provider count, micro-spacing)?
- [ ] What goes on `/` for anonymous visitors? (a) redirect to /signup, (b) build marketing landing from §05 copy spec, (c) leave the minimal brand page
- [ ] YouTube: pursue Innertube client variants or jump to V3.34 graceful-failure screen?
- [ ] When to switch Clerk from Development → Production instance (removes "Development mode" pill, requires yentl.it domain config)
- [ ] Webhook handler `/api/webhooks/clerk` to sync Clerk users → `users` table (deferred from Phase 2)

---

## Quick-start command sequence for next session

```bash
cd "/Users/israelbitton/Live FactCheck/.claude/worktrees/marketing-landing"

# Verify you're on the right branch
git status   # expect: clean, on feat/v3-auth-screens

# Verify Vercel + Clerk env still pulled (.env.local should exist)
ls -la .env.local

# Boot dev server (kill any existing first)
pkill -f "next dev" 2>/dev/null
PORT=3010 npm run dev &

# Open wireframes side-by-side with code
open ".project/assets/ui/v3/WF-V3.19_signin.html"     # next build target
open "app/signin/[[...rest]]/page.tsx"

# Reference V3.18 build for the pattern
open "app/signup/[[...rest]]/page.tsx"
open "app/globals.css"   # scroll to line 220+ for the Clerk overrides
```

Last verified working: 2026-05-19 evening. Branch `feat/v3-auth-screens` is pushable + Vercel auto-deploys preview on every push.
