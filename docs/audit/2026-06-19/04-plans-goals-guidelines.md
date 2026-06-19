# Yentl — Plans, Goals & Guidelines Synthesis

**Audit slice:** 04 — Intent / Goals / Guidelines backbone
**Date compiled:** 2026-06-19
**Compiled by:** read-only synthesis across `docs/superpowers/{plans,specs,handoff,validation}`, `.goals/*`, `docs/orchestration/*`, `.project/research/*`, and `docs/{dpia,dpa-status,engagement-gate,ops/yentl-autonomy}.md`
**Mode:** READ + REPORT only. No code or doc outside this file was modified.

> **Reading note on staleness.** Several planning artifacts lag reality. Most `.goals/*/STATE.md` files (a11y, ai-transparency, docs, trust-pages, verdict-scaffold) still say *"not-started / does not exist,"* yet the artifacts they describe **exist on disk** because the umbrella goal `yentl-compliance-foundation` built 27/28 of them in one marathon run (2026-05-18). Likewise the engagement-gate is framed in the policy doc as *"documentation only, runtime is the fact-check pipeline goal,"* but the **runtime is shipped** at `lib/server/engagement-gate.ts` and wired into the verify routes. Treat the **handoffs + release-readiness JSON + on-disk code** as ground truth; treat the per-sub-goal STATE files as historical scaffolding. This document flags each contradiction inline.

---

## 1. Canonical Vision

Yentl (`yentl.it`, package `yentl-app`, formerly Factify → Yenta → Yentl) is a **live, explainable fact-check + rhetoric/fallacy-analysis product** that listens to or ingests a conversation, video, article, document, or single claim and returns triple-encoded verdicts (TRUE / FALSE / MIXED / UNVERIFIED) with cited sources, plus detection of biases and logical fallacies drawn from the owner's 2024 book *"Cognitive Biases & Logical Fallacies Used by Antisemites."* Architecturally it is a small Next.js 16 web app where **audio never touches Yentl's server** (browser → Deepgram direct; transcripts → Anthropic Claude for verdicts + rhetoric; Vercel AI Gateway in front with a direct-SDK fallback). At launch it targets one experience across **web, installable PWA, Chrome extension (any-tab audio capture), mobile-web, and a TV/room mode**, with account-backed saved sessions (Clerk + Neon + Drizzle) as an optional cloud layer over a local-first IndexedDB default. The positioning is consumer-friendly and witty — primary tagline **"Don't argue. Yentl it."** (research deck riff: *"Don't argue. Scale it."*), brand voice smart/punchy/snarky-when-earned, with a hard rule that **trust copy never outruns implementation**. The deliberate framing: *"the hard part isn't building — it's the policy, trust, and compliance surface that has to exist around the build."*

---

## 2. Master Launch-Criteria List (consolidated, de-duplicated)

There are **two overlapping criteria systems** that converged: the **compliance/trust layer** (research §8/§10 → the `.goals/*` portfolio, locked 2026-05-17/18) and the **product-finish milestones M0–M7** (the reset-to-finish track, the operative system since June). Below is the merged master list. The **authoritative current launch gate is `docs/superpowers/validation/release-readiness-proof.json`** (`launch_ready: false`, 6 blockers).

### A. Product-finish milestones (M0–M7) — operative launch frame
- **M0 Stabilize:** `npx tsc --noEmit` clean, full Vitest green (≈1751 tests / 166 files), `npm run lint` 0 errors **0 warnings**, `npm run build:automation` 42/42 static pages.
- **M1 Core Session UX:** `session:proof:local` walks 20+ routes incl. saved-session roundtrip (save → seed → search → source-filter → sort → rename → JSON export → TV restore → workspace resume → delete → empty-state).
- **M2 Ingestion Completeness:** every source path production-hard — consent gate (`428 SOURCE_CONSENT_REQUIRED`), SSRF block, article URL, direct media, audio/video upload (+ recovery for unsupported/oversized/overlong/failed), TXT/MD/DOCX/SRT/VTT fixtures, PDF text-layer vs scanned-OCR distinction, YouTube captions. Proven `ingestion:proof:{ui,local,deploy,text-docs}`.
- **M3 Analysis Intelligence:** provisional/confirmed/both corpus replay (local + deploy on yentl.it); structured `meta_read` persisted through API/state/UI/export with a 0–100 quality score (posture / source-health / scope / uncertainty vs evidence depth); speaker-attribution scored. Proven `analysis:proof:{local,deploy:*,metaread,speaker-attribution}`.
- **M4 Mobile/PWA:** `mobile:proof:local` (19 surfaces × 390/430/768px, 57 checks, no overflow / no console errors) + `pwa:proof:native` (manifest install, share target, file handlers, launched-file routing). **Native iOS/Android store shells explicitly OUT of v1** (PWA/share/import is the v1 mobile contract).
- **M5 Cloud Sync:** local no-network fallback (`503 cloud_unavailable`), signed-out deploy guards (`401`/`400`), ownership-hardened same-`clerk_user_id` upserts; authenticated harness covers save/load/list/rename/TV/delete + two-profile browser restore **when `YENTL_CLOUD_SYNC_PROOF_AUTH_HEADER` is supplied**.
- **M6 Extension + TV:** keyboard + popup capture paths automatable; live tab-audio → transcript proven; MV3 store-readiness JSON (icons 16/32/48/128, listing collateral, permission rationales); real external-page DOM proof (Wikimedia WebM, Wikinews, W3C); durable extension→workspace snapshot; TV room returns to matching context.
- **M7 Launch QA:** production launch smoke on `https://yentl.it` (public entry 200; internal corpus routes 404; share target; rate-limit `429`; blob token); trust/copy deploy proof; a11y deploy proof 0 axe violations on `/ /session /mobile /contact`.

### B. Compliance/trust acceptance clauses (the `.goals` portfolio, research §8/§10)
**Consent & recording (this-week-actions, all 6 clauses DONE per its STATE):**
1. Diarization explicitly `diarize=false` in client+server (BIPA), grep-clean + test.
2. EU endpoint switchable via `NEXT_PUBLIC_DEEPGRAM_REGION` (`us|eu`, default us, unknown→us+warn).
3. `docs/dpa-status.md` with vendor table + "what to verify" + Anthropic auto-incorp note + human-action checkboxes.
4. `ConsentGate.tsx` — blocking modal before `getUserMedia`; 3 required + 1 age + 1 optional checkbox, no pre-ticks (GDPR Art 7); verbatim Art 9(2)(a) + no-persistence text; writes `yentl.consent` ULID record `version:"1"`.
5. `RecordingBeacon.tsx` — fixed pulsing red dot + `REC HH:MM:SS` + 44×44 End button, `motion-reduce:animate-none`, `aria-live="polite"`.

**Group A consent extensions:** Pause>End hierarchy (Pause primary), SessionTimer 30-min toast ("Still rolling at 30:00. Pause anytime."), TwoPartyDisclosure banner (verbatim copy, localStorage flag), AudioRouteDisclosure popover.
**Group B AI transparency:** AIGeneratedBadge ("AI" + sparkle + aria-label, ≥4.5:1), AIDisclosureFooter ("Verdicts are AI-generated. Sources may be incomplete. Use your head.").
**Group C WCAG 2.2 AA:** SkipToContent (first focusable), focus-ring token ≥3:1 + documented contrast, 44×44 touch targets, prefers-reduced-motion everywhere, transcript + Claims `aria-live="polite"` regions, **axe-core 0 violations + Lighthouse a11y ≥95 on `/` and `/session`**.
**Group D trust pages (7):** `/about`, `/methodology`, `/changelog`, `/privacy`, `/terms`, `/subprocessors`, `/taxonomy.json` — each with the named-processor / GDPR / CCPA / Quebec / 18+ / anti-SLAPP / CC-BY-4.0 content spec'd clause-by-clause.
**Group E verdict scaffold:** VerdictCard triple-encoded 4 states (color stripe + icon + mono uppercase label: `✓ TRUE #16A34A / ✗ FALSE #DC2626 / ◐ MIXED #F59E0B / ? UNVERIFIED #6B7280`), satisfies WCAG 1.4.1; ReportVerdictButton + ReportFlow (4 categories, ULID record to `yentl.reports`).
**Group F docs:** Accessibility statement, `docs/dpia.md` (EDPB Apr-2026 template, all 8 sections, 3 EDPB high-risk triggers), `docs/engagement-gate.md` policy spec.
**Group G hygiene:** all new components tested, CHANGELOG, README compliance section, clean tree, `compliance:`-prefixed commits, rebased on origin/main.

### C. Hardening-pass gates (`yentl-hardening-pass`, 14 clauses)
`npm audit --omit=dev --audit-level=high` exit 0 · `tsc --noEmit` strict · Vitest 0 with no `.skip` · v8 coverage thresholds (lines/functions/statements 70, branches 65 on `lib/**`) · `eslint . --max-warnings=0` · no TODO/FIXME/XXX outside `docs/known-deferred.md` · no `console.log` in prod bundle · `.env.example` two-way parity · **`middleware.ts`** (rate-limit 50 req/min/IP on `/api/**` + HSTS/nosniff/Referrer-Policy/Permissions-Policy/CSP-Report-Only) · `.github/workflows/ci.yml` (tsc→eslint→vitest+coverage→audit) · CHANGELOG · README "Security & Operations" · mergeable + clean tree.

### D. External-launch proof (2026-05-26 checklist — things un-provable from local repo)
1. **Real Chrome extension permission-prompt** screenshots in the user's real Chrome (5 named PNGs).
2. **Deployed Redis/Blob smoke** (`429` rate-limit + blob client token; env confirm `UPSTASH_REDIS_REST_URL`/`KV_REST_API_URL`, `BLOB_READ_WRITE_TOKEN`).
3. **Configured Clerk captures** (sign-in states, invalid creds, reset, verify, expired, post-auth redirect preserving intended task, mobile 390px).
4. **Legal/compliance signoff** — a named legal owner signs+dates DPIA/DPA/TIA; public pages match the signed posture.
5. **Document/PDF/OCR/article import** full state matrix incl. OCR progress + scanned-PDF warnings.

### E. The 6 release-readiness BLOCKERS (current authoritative gate, 2026-06-12)
1. `human-review-sensitive-attribution` — 5 sensitive public-claims windows need editorial sign-off (0 reviewed). Manifest + `analysis:proof:sensitive-review`.
2. `authenticated-cloud-sync-not-proven` — needs real `YENTL_CLOUD_SYNC_PROOF_AUTH_HEADER` against Clerk/DB env.
3. `production-authenticated-cloud-sync-not-proven` — repeat (2) post-deploy.
4. `physical-ios-android-device-proof-missing` — `ios:run` + `android:run` real-device canaries (`mobile:proof:devices`).
5. `large-real-media-production-canaries-missing` — real phone audio/MP4/MOV/WebM through Blob+Deepgram (`ingestion:proof:large-real-media`).
6. `production-release-smoke-current-tree-missing` — commit/push, CI green, deploy, prod smoke (the working tree is dirty: **246 files**).

---

## 3. Product & Design Guidelines / Rules (binding)

**Brand / identity (locked v5, 2026-05-17):** mark `#2563EB`; Fraunces 500 wordmark; descender-harmony lockup; R4 V3 palette — verified green `#16A34A`, false red `#DC2626`, amber `#F59E0B`, cream paper, near-black ink. Source SVG `.project/assets/logos/v5/yentl-mark.svg`.

**Voice / copy:** primary tagline **"Don't argue. Yentl it."** A verbatim "compliance copy in Yentl voice" library exists (research §8) and **must be used verbatim** — e.g. AI footer *"Verdicts are AI-generated. Sources may be incomplete. Use your head."*; two-party banner *"Heads up — recording the people around you may need their consent. Yentl doesn't know where you are; you do."*; decline-opinion *"That's a take, not a checkable claim. Yentl doesn't do feelings."* (Note: the 2026-05-20 committee flagged the glib "Use your head" as an edtech-tone risk; resolution deferred to an edtech-lane decision.)

**Verdict / signal rules:** verdicts are **triple-encoded** (color + icon + text) so color is never the sole signal (WCAG 1.4.1). Vocabulary = TRUE / FALSE / MIXED / UNVERIFIED. **Confidence ≠ truth-score** — the committee mandated splitting `truth_rating` / `model_confidence` / `evidence_quality`; "UNVERIFIABLE" must read as *"Insufficient evidence,"* not a numeric 50/100. Every card carries an AI badge, sources-by-stance, a "Report this verdict" path, and (per research) a `prompt_version` stamp for later audit.

**Engagement-gate rules (Top Risk #1 mitigation):** decisions `ENGAGE | ENGAGE_CAUTIOUSLY | DECLINE_FRIVOLOUS | REFUSE_INAPPROPRIATE`. **Hard silent refusals:** private-individual harassment vectors, hate speech, extremist/threatening, doxxing, CSAM, defamation-trap setups. **Engage-cautiously protocol:** ≥2 high-reputation sources, named expert dissent, MIXED where contested, confidence label, disclaimer. *(Runtime is shipped — see §5.)*

**Accessibility rules:** WCAG 2.2 AA is the launch floor (EAA in force 2025-06-28). Skip-to-content first-focusable, focus-ring ≥3:1, 44×44 targets, `prefers-reduced-motion`, polite (never assertive) live regions, axe 0-violations + Lighthouse ≥95. Manual VoiceOver/NVDA testing is an accepted residual gap pre-commercial-launch.

**AI-transparency rules (AI Act Art 50, binding 2026-08-02):** per-card visible AI labels, persistent footer, machine-readable provenance (C2PA) in exports, public methodology page; sign-in/sign-up must not imply live sync unless account-backed sync is actually active.

**Security / consent rules:** layered consent, **never all-upfront**; no pre-ticked boxes (GDPR Art 7); consent is unprovable without a `{version, timestamp}` tuple; `getUserMedia` only after ConsentGate grants; persistent recording beacon for two-party-consent states; rate-limit + security headers via middleware; SSRF block on URL ingestion; named-processor disclosure (Deepgram + Anthropic + Vercel, never "third parties"); **no audio/transcript persistence on Yentl servers in v1** (in-memory analysis; saved sessions are local IndexedDB unless cloud-sync is on). **Diarization stays OFF** unless the consent/legal gate explicitly permits (BIPA).

**Truth-in-product (the load-bearing process rule):** *trust copy must match actual runtime behavior.* The single biggest recurring defect class in the handoffs is docs/UI overclaiming (consent gate, pipeline manifest, ephemeral-vs-IndexedDB, "Listening" before capture is live). Trust pages should render from one pipeline-manifest source of truth; planned safeguards must be labeled planned.

---

## 4. Scope Boundaries & Non-Goals

**Explicitly OUT of v1:**
- **Native iOS/Android store shells** — v1 mobile = honest mobile-web/PWA/share/import. Native is Capacitor "month one" *future*; React Native / full-native deferred indefinitely. Never claim native readiness from web evidence.
- **Unattended loop automation / cron ladders** — the night-shift loop portfolio (`docs/ops/yentl-autonomy.md`) was **killed**; the 2026-06-10 reset is product-first. "Do not restart loop automation."
- **X / @-mention bot** — researched (two-pass moderation gate, ~$0.045/mention, Community-Notes-track private beta) but a *post-v1* expansion, not a launch gate.
- **Multilingual** — v1 is **English-only** by spec (localization changes the AI Act + moderation surface).
- **v2 account/auth depth, persistence beyond local/optional-cloud, audio storage, API access, third-party integrations, paywall/Stripe** — deferred (Phase 1b+).
- **Edtech / classroom mode** — an open product-lane *decision* (adult/teacher-only vs school-safe), not a built v1 feature. Terms are currently 18+, which blocks classroom use by design.
- **Diarization / speaker biometrics** — disabled (BIPA); re-enabling is a gated Phase-3 decision.
- **Engagement-gate as a separate "fact-check pipeline goal"** — the policy docs treat the runtime as out-of-scope-for-compliance; in practice it shipped (§5).
- Vendor lock-in choices (queue provider, etc.) and legal-counsel cost are left to the founder.

---

## 5. Where It's Holding

### Milestones M0–M7 (per 2026-06-10/14 handoffs + release-readiness JSON)

| Milestone | Status | Remaining |
|---|---|---|
| **M0 Stabilize** | Mostly green locally | tsc/tests/lint(0/0)/automation-build pass; **but working tree dirty (246 files), uncommitted/unpushed/undeployed** |
| **M1 Core Session UX** | Improved (local proven) | More authenticated cloud/merged saved-session browser proof |
| **M2 Ingestion** | Improved (local + deploy w/ blockers) | Redeploy clears PDF-500/fixture/YouTube deploy_blockers (6); real-world fixtures + physical-device mic smoke; PDF-ingest fix is **dirty-tree only** |
| **M3 Analysis** | Improved (local + deploy replay) | Longer deploy windows; real replay synthesis scoring; **sensitive-attribution editorial review (BLOCKER)** |
| **M4 Mobile/PWA** | Improved (local 57 checks) | **Real-device iOS/Android install/share/mic canaries (BLOCKER)** |
| **M5 Cloud Sync** | Improved (unconfigured + signed-out) | **Authenticated proof needs real `…AUTH_HEADER` + Clerk/DB env, then repeat post-deploy (2 BLOCKERS)** |
| **M6 Extension + TV** | Improved (local incl. live transcript) | External **live** transcript line on real audio; broader installed real-audio; real-Chrome permission-prompt screenshots; future live full-workspace sync |
| **M7 Launch QA** | Improved (smoke + a11y/trust w/ blockers) | **Production redeploy** clears a11y/trust/ingestion deploy_blockers; rate-limit prod smoke; **prod release-smoke of current tree (BLOCKER)** |

**Overall:** owner's self-score ~**8.6–8.75/10**; `release-readiness-proof.json` = **local 13/13, deploy 5/5, external 0/3, launch_ready: false**, gated by the **6 blockers** in §2.E. Shipped-product confidence est. ~60–70% pre-redeploy, ~85%+ after redeploy + auth cloud proof. Production `yentl.it` is healthy (HTTP 200) but pinned at `cda517a` — **behind the repo**; the dirty tree (incl. a real `/api/document-ingest` PDF 500 fix that caused a live Vercel 5xx alert) is not yet deployed.

### The 8 `.goals` workstreams

| Goal | STATE says | Reality on disk | Verdict |
|---|---|---|---|
| **this-week-actions** | Run 1 complete, all 6 clauses; "ready-for-human-action" | `ConsentGate`, `RecordingBeacon`, `deepgram-endpoint.ts`, `docs/dpa-status.md` all present; `diarize=false` | **DONE in code**; human items = DPA signatures + Deepgram dashboard config + EU env var still pending |
| **hardening-pass** | **not-started, 0 runs** | `ci.yml`, `CHANGELOG.md`, `vitest.config.ts` exist; rate-limiting lives in **`lib/server/rate-limit.ts`** (applied per-route, not via root middleware); **no root `middleware.ts`**; **security response headers (HSTS/nosniff/CSP) absent**; **`docs/known-deferred.md` MISSING** | **PARTIAL** — STATE stale; lint 0/0 and rate-limiting met (per-route, an architecture deviation from the spec's `middleware.ts`). Genuine gaps: **security response headers** (no HSTS/nosniff/CSP anywhere in lib/app/next.config) and the known-deferred catalog. Needs a real audit pass. |
| **compliance-foundation** (umbrella, 28 clauses) | Run 1: 27/28; clause 4 blocked, clause 12 partial | Trust pages, VerdictCard, badges, footer, dpia, engagement-gate doc all present | **DONE except:** clause 4 AudioRouteDisclosure (was blocked on RecordingBeacon — now unblocked, "partially implemented" per dpia), clause 12 live axe+Lighthouse run (scaffold only; later satisfied by M7 `a11y:proof`) |
| **compliance-a11y** (Group C) | **not-started, 0 runs** | SkipToContent / ClaimsLiveRegion / focus tokens / `run-a11y-audit.sh` present; a11y proofs green | **DONE via umbrella + M7**; STATE stale |
| **compliance-ai-transparency** (Group B) | **not-started, 0 runs** | `ai-generated-badge.tsx` + `AIDisclosureFooter.tsx` present | **DONE via umbrella**; STATE stale |
| **compliance-docs** (Group F) | **not-started, 0 runs** | `docs/dpia.md`, `docs/engagement-gate.md`, accessibility statement present | **DONE via umbrella**; STATE stale |
| **compliance-trust-pages** (Group D) | **not-started, 0 runs** | all 7 routes present; `/taxonomy.json` is a route handler (not static) | **DONE via umbrella**; STATE stale. NOTE committee + handoffs flag trust-page copy as **overclaiming pipeline** — content-accuracy, not existence, is the open risk |
| **compliance-verdict-scaffold** (Group E) | **not-started, 0 runs** | `VerdictCard.tsx`, `ReportFlow.tsx`, `ReportVerdictButton.tsx` present | **DONE via umbrella**; STATE stale |

**Engagement-gate runtime (a non-goal that shipped):** `lib/server/engagement-gate.ts` exports `evaluateEngagementGate()` / `enforceEngagementGate()` with deterministic private-info + non-factual regex pre-filters plus an Opus/`claim-scope` model classifier returning `engage | engage_cautiously | decline | refuse`, and is imported into `app/api/verify-provisional/route.ts` and `verify-confirmed/route.ts`. The policy doc + DPIA still call this "documented only / fact-check-pipeline-goal scope" — **stale.**

### Contradictions / stale claims to flag for the owner
1. **Sub-goal STATE files vs disk:** 5 compliance sub-goals say "not-started/missing"; their deliverables exist (built by the umbrella). The split-friendly children were never executed independently. Recommend: mark them `done (superseded by umbrella)` or delete, to stop future agents "rebuilding" them.
2. **hardening-pass is the genuinely-thin one.** Its STATE staleness hides real gaps. Rate-limiting *does* exist (`lib/server/rate-limit.ts`, wired into youtube/transcribe/rhetoric/deepgram-token/upload/extract-claims routes) — so M7's `YENTL_SMOKE_RATE_LIMIT` smoke has something to hit — but it is **per-route**, an architecture deviation from the spec's root `middleware.ts`. The confirmed gaps: **security response headers are absent** (no `Strict-Transport-Security` / `X-Content-Type-Options` / `Content-Security-Policy` anywhere in `lib/`, `app/`, or `next.config`), and **`docs/known-deferred.md` does not exist**. **The security-headers gap is the highest-value, narrowest audit follow-up.**
3. **Engagement-gate "documented vs shipped"** (above) — update the policy doc + DPIA to say "implemented in `lib/server/engagement-gate.ts`."
4. **Rebrand done:** package is `yentl-app` (the goals' "no rebrand" anti-goal and the "still says Factify" memory note are obsolete — the Phase-1a plan renamed it).
5. **Trust-page accuracy:** pages exist and pass a structural trust proof, but the committee's P0 #5 (methodology/privacy misstate model classes, provisional verification, label schema, Deepgram region) and the *"trust copy must not outrun implementation"* rule mean a **content re-verification against current code** is still open even though the routes are "done."
6. **Production is behind the repo** (`cda517a`); a known live 5xx fix sits undeployed in the dirty tree. The single fastest readiness lever is **commit → CI → deploy → post-deploy battery**, which also clears 4 of the 6 deploy-related advisories/blockers.

### Team responsibility map (what aspects were cared about)
Two orchestration generations. **May 21 personas (13):** Moshe (worktree safety), Noam (marker iconography), Miriam (flow-atlas state cartography), Ezra (extension proof), Talia (product-truth/copy-lock), Shira (source-intake UI repair), Devorah (security launch gates), Lev (live-signal system), Hadassah (mobile+a11y), Eli (source/visual-evidence integrity), Aviva (save-library+export), Yonah ("meaning under pressure" evaluation), Rivka (claim-semantics + meta-review), Ariel (motion-loop prototyper). **June 14 reset lanes (L0–L11):** L0 Quartermaster, L1 Ingestion backend, L2 Source-intake UI, L3 Analysis intelligence, L4 Evidence/source review, L5 Cloud sync, L6 Mobile/PWA/devices, L7 Extension, L8 TV, L9 Security/privacy/trust, L10 Design-system/public UX, L11 Launch QA/release. Each lane: own worktree under `../Live-FactCheck-worktrees/`, `codex/yentl-<lane>-2026-06-14` branch, one dashboard block, a proof gate; **no agent commits/pushes/deploys without explicit human approval.** The set reveals the dimensions the team treated as launch-critical: ingestion robustness, analysis honesty (attribution/meta-read/cautious output), source-evidence integrity, security/trust/legal, mobile/a11y, extension/TV, and disciplined release integration.

---

## 6. Timeline / Evolution

- **2026-05-11** — **Factify v1**: first plan + design spec; live fact-check + bias/fallacy app; v1 taxonomy from the owner's 2024 book.
- **2026-05-13** — Factify v1 deployed publicly (`factify-rose.vercel.app`) after 3 prod-fix incidents; End/Export decoupled. Sprint-1 "multi-speaker durability" plan + design. First rename **Factify → Yenta.me**.
- **2026-05-15 → 17** — v1.2 ingestion, v1.3, v1.4 sprint, v1.5/v1.5.1 (brand v5 locked), v1.6 (blob + innertube + rename). Multi-source-ingestion + UI-rebuild plans. **2026-05-17 final rebrand Yenta → Yentl** (`yentl.it`) for verb-fit ("yentl it") + truth-seeker meaning + cleaner USPTO. **Expansion research deck** produced (X bot + iOS/Android + compliance). The **`.goals` portfolio locked** (this-week-actions, hardening-pass, compliance-foundation + 5 sub-goals) off research §8/§10.
- **2026-05-18** — Stack locked (Clerk + Neon + Drizzle). compliance-foundation Run 1 builds 27/28 clauses in one marathon session.
- **2026-05-20 → 21** — World-class UX + simulated expert-committee audit (8 P0 trust/state/navigation blockers). Complete-flow screen-state atlas + spec; first agent-orchestration packet + 13 personas.
- **2026-05-25 → 28** — Platform source-picker security handoff; speaker-attribution conversation-intelligence plan + spec; **launch-foundation Phase-1a** plan (honest attribution types + AI-reliability fallback; renames package to `yentl-app`).
- **2026-06-07** — **Autonomy operating plan**: night-shift Codex loop portfolio (control-tower, build lanes, audit/fix, watchdog, supervisor) with human approval gates.
- **2026-06-10** — **Reset-to-finish**: loop automation **killed**; product-first push. Ship checkpoint `a6af86e` (proof battery + session UX, 8.6/10); commit/push approved, prod deploy still gated. Broad proof battery generated (extension capture, mobile/PWA, ingestion, cloud-sync scaffold, a11y/trust deploy proofs).
- **2026-06-11/12** — Continuation: meta-read structured contract + quality scoring; cloud-sync ownership hardening + two-profile harness; extension store-readiness + latency sampling + real-page proof; `release-readiness-proof.json` formalizes the 6 launch blockers; `launch-canary-template-summary.json` writes the 3 canary manifests (sensitive-review, mobile-device, large-real-media).
- **2026-06-14** — Reset-to-finish **agent orchestration** (L0–L11 lanes + dashboard) — the active launch packet.

---

*End of synthesis. Source-of-truth precedence for any future conflict: on-disk code + `release-readiness-proof.json` + most-recent handoff > older handoffs > `.goals/*/STATE.md` sub-goal scaffolding.*
